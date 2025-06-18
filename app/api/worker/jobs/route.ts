import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobStore, Job } from "@/lib/jobsStore";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getDocumentParserSettings } from "@/lib/db/settings";

// In-memory job storage (in production, this would be Redis)
// interface Job {
//   id: string;
//   type: string;
//   name: string;
//   status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
//   project?: string;
//   createdAt: string;
//   startedAt?: string;
//   completedAt?: string;
//   duration?: number;
//   progress: number;
//   result?: any;
//   error?: string;
//   parameters?: Record<string, any>;
// }

// Simple in-memory store (in production, use Redis)
// export const jobs = new Map<string, Job>();

const CreateJobSchema = z.object({
  type: z.string(),
  name: z.string(),
  project: z.string().nullable().optional(),
  parameters: z.record(z.any()).optional(),
});

// Function to trigger a job on the remote parser service
async function triggerRemoteWorker(jobId: string, teamId: number) {
  const job = await jobStore.get(jobId);
  if (!job) return;

  try {
    // Get document parser settings
    const parserSettings = await getDocumentParserSettings(teamId);

    if (!parserSettings?.parserUrl) {
      console.error(`Job ${jobId}: Parser URL not configured`);
      job.status = "failed";
      job.error =
        'Parser URL nicht konfiguriert. Bitte konfigurieren Sie die Einstellungen unter "Dokument Parser".';
      job.completedAt = new Date().toISOString();
      await jobStore.set(jobId, job);
      return;
    }

    // Update job to running
    job.status = "running";
    job.startedAt = new Date().toISOString();
    job.progress = 5; // Initial progress
    await jobStore.set(jobId, job);

    // Construct the external API URL for job creation
    const externalApiUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/jobs`;
    console.log(`Job ${jobId}: Triggering remote worker at ${externalApiUrl}`);

    // Prepare job payload for the remote service
    const remoteJobPayload = {
      type: job.type,
      name: job.name,
      project: job.project,
      parameters: {
        ...job.parameters,
        // Add parser-specific settings
        ocr: parserSettings.ocr,
        marker: parserSettings.marker,
        llamaparse: parserSettings.llamaparse,
        docling: parserSettings.docling,
        pdfplumber: parserSettings.pdfplumber,
        molmo: parserSettings.molmo,
        ocrforced: parserSettings.ocrforced,
      },
      // Add callback URL for status updates (optional)
      callbackUrl: `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/worker/jobs/${jobId}/callback`,
    };

    // Trigger the remote job
    const response = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "klark0-webapp/1.0",
      },
      body: JSON.stringify(remoteJobPayload),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(
        `Remote API returned ${response.status}: ${response.statusText}`
      );
    }

    const remoteJobData = await response.json();
    console.log(`Job ${jobId}: Remote job created:`, remoteJobData);

    // Update job with remote job information
    job.progress = 10;
    job.parameters = {
      ...job.parameters,
      remoteJobId: remoteJobData.id || remoteJobData.data?.id,
      remoteJobUrl: externalApiUrl,
    };
    await jobStore.set(jobId, job);

    // Start polling for job status updates
    pollRemoteJobStatus(jobId, teamId);
  } catch (error) {
    console.error(`Job ${jobId}: Error triggering remote worker:`, error);

    job.status = "failed";
    job.error = `Fehler beim Starten des Remote-Workers: ${
      error instanceof Error ? error.message : String(error)
    }`;
    job.completedAt = new Date().toISOString();
    await jobStore.set(jobId, job);
  }
}

// Function to poll the remote job status
async function pollRemoteJobStatus(jobId: string, teamId: number) {
  const job = await jobStore.get(jobId);
  if (!job || job.status === "cancelled") return;

  try {
    const parserSettings = await getDocumentParserSettings(teamId);
    if (!parserSettings?.parserUrl || !job.parameters?.remoteJobId) {
      throw new Error("Missing parser URL or remote job ID");
    }

    const remoteJobStatusUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/jobs/${job.parameters.remoteJobId}`;

    const response = await fetch(remoteJobStatusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "klark0-webapp/1.0",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(
        `Status check failed: ${response.status} ${response.statusText}`
      );
    }

    const remoteJobStatus = await response.json();
    const remoteJob = remoteJobStatus.data || remoteJobStatus;

    // Update local job with remote status
    if (remoteJob.status) {
      job.status = remoteJob.status;
      job.progress = remoteJob.progress || job.progress;

      if (remoteJob.status === "completed") {
        job.completedAt = new Date().toISOString();
        job.progress = 100;
        job.result = remoteJob.result;
      } else if (remoteJob.status === "failed") {
        job.completedAt = new Date().toISOString();
        job.error = remoteJob.error || "Remote job failed";
      }

      await jobStore.set(jobId, job);
    }

    // Continue polling if job is still running
    if (remoteJob.status === "running" || remoteJob.status === "pending") {
      setTimeout(() => pollRemoteJobStatus(jobId, teamId), 5000); // Poll every 5 seconds
    }
  } catch (error) {
    console.error(`Job ${jobId}: Error polling remote job status:`, error);

    // Don't fail the job immediately, retry a few times
    const retryCount = (job.parameters?.statusRetryCount || 0) + 1;

    if (retryCount < 5) {
      // Max 5 retries
      job.parameters = { ...job.parameters, statusRetryCount: retryCount };
      await jobStore.set(jobId, job);

      // Retry with exponential backoff
      setTimeout(
        () => pollRemoteJobStatus(jobId, teamId),
        Math.min(retryCount * 2000, 10000)
      );
    } else {
      // Give up after too many retries
      job.status = "failed";
      job.error = `Fehler beim Abrufen des Job-Status: ${
        error instanceof Error ? error.message : String(error)
      }`;
      job.completedAt = new Date().toISOString();
      await jobStore.set(jobId, job);
    }
  }
}

// Simulate job processing for fakejob
async function simulateJobExecution(jobId: string) {
  const job = await jobStore.get(jobId);
  if (!job) return;

  // Update job to running
  job.status = "running";
  job.startedAt = new Date().toISOString();
  job.progress = 0;
  await jobStore.set(jobId, job);

  const maxDuration = job.parameters?.maxDuration || 10;
  const actualDuration = Math.floor(Math.random() * (maxDuration - 3 + 1)) + 3; // 3 to maxDuration seconds

  // Simulate progress updates
  const progressInterval = setInterval(async () => {
    const currentJob = await jobStore.get(jobId);
    if (!currentJob || currentJob.status !== "running") {
      clearInterval(progressInterval);
      return;
    }

    currentJob.progress = Math.min(
      currentJob.progress + Math.random() * 20,
      95
    );
    await jobStore.set(jobId, currentJob);
  }, actualDuration * 100); // Update progress periodically

  // Complete the job after the duration
  setTimeout(async () => {
    const currentJob = await jobStore.get(jobId);
    if (!currentJob || currentJob.status === "cancelled") {
      clearInterval(progressInterval);
      return;
    }

    clearInterval(progressInterval);

    // Random success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      currentJob.status = "completed";
      currentJob.progress = 100;
      currentJob.result = {
        message: "FakeJob erfolgreich abgeschlossen",
        duration: actualDuration,
        randomValue: Math.floor(Math.random() * 1000),
        processedAt: new Date().toISOString(),
      };
    } else {
      currentJob.status = "failed";
      currentJob.error = "Simulierter Fehler für Testzwecke";
    }

    currentJob.completedAt = new Date().toISOString();
    currentJob.duration = actualDuration;
    await jobStore.set(jobId, currentJob);
  }, actualDuration * 1000);
}

async function handleGetRequest(request: RequestWithTeam) {
  try {
    // Check team context
    if (!request.teamId) {
      return NextResponse.json(
        { error: "Team context required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const project = searchParams.get("project");

    let filteredJobs = await jobStore.getAll();

    if (type) {
      filteredJobs = filteredJobs.filter((job) => job.type === type);
    }
    if (status) {
      filteredJobs = filteredJobs.filter((job) => job.status === status);
    }
    if (project) {
      filteredJobs = filteredJobs.filter((job) => job.project === project);
    }

    // Sort by creation date (newest first)
    filteredJobs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: filteredJobs,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Abrufen der Jobs",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

async function handlePostRequest(request: RequestWithTeam) {
  try {
    // Check team context
    if (!request.teamId) {
      return NextResponse.json(
        { error: "Team context required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateJobSchema.parse(body);

    const jobId = `job_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const job: Job = {
      id: jobId,
      type: validatedData.type,
      name: validatedData.name,
      status: "pending",
      project: validatedData.project || undefined,
      createdAt: new Date().toISOString(),
      progress: 0,
      parameters: validatedData.parameters || {},
    };

    await jobStore.set(jobId, job);

    // Handle different job types
    if (validatedData.type === "fakejob") {
      // For fakejob, use local simulation
      setTimeout(() => simulateJobExecution(jobId), 100);
    } else {
      // For other job types, trigger remote worker
      setTimeout(() => triggerRemoteWorker(jobId, request.teamId!), 100);
    }

    return NextResponse.json(
      {
        success: true,
        data: job,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating job:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Ungültige Job-Daten",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Erstellen des Jobs",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export const GET = withTeamContext(handleGetRequest);
export const POST = withTeamContext(handlePostRequest);
