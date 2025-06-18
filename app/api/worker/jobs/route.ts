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

// Response schemas to match FastAPI backend
const JobBaseSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  project: z.string().optional(),
  createdAt: z.string().datetime(),
  progress: z.number().min(0).max(100),
  parameters: z.record(z.any()),
});

const JobDetailsSchema = JobBaseSchema.extend({
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().optional(), // in seconds
  result: z.any().optional(),
  error: z.string().optional(),
});

// Function to trigger a job on the remote parser service
async function triggerRemoteWorker(jobId: string, teamId: number) {
  const job = await jobStore.get(jobId);
  if (!job) return;

  console.log(
    `🚀 triggerRemoteWorker called for job ${jobId} (${job.name}) - type: ${job.type}`
  );

  try {
    // Get document parser settings
    const parserSettings = await getDocumentParserSettings(teamId);

    if (!parserSettings?.parserUrl) {
      console.error(`❌ Job ${jobId}: Parser URL not configured`);
      job.status = "failed";
      job.error =
        'Parser URL nicht konfiguriert. Bitte konfigurieren Sie die Einstellungen unter "Dokument Parser".';
      job.completedAt = new Date().toISOString();
      await jobStore.set(jobId, job);
      return;
    }

    console.log(
      `📡 Job ${jobId}: Using parser URL: ${parserSettings.parserUrl}`
    );

    // Update job to running
    job.status = "running";
    job.startedAt = new Date().toISOString();
    job.progress = 5; // Initial progress
    await jobStore.set(jobId, job); // Construct the external API URL for job creation
    const externalApiUrl = `${parserSettings.parserUrl.replace(
      /\/$/,
      ""
    )}/api/worker/jobs`;
    console.log(
      `🌐 Job ${jobId}: Making request to external API: ${externalApiUrl}`
    ); // Prepare job payload for the remote service (matching FastAPI backend format)    // Map internal job types to external function names
    const externalJobType = job.type === "fakejob" ? "fake_task" : job.type;
    console.log(
      `🔄 Job ${jobId}: Mapping job type "${job.type}" → "${externalJobType}" for external API`
    );

    // Generate random duration for fake_task
    const randomDuration =
      externalJobType === "fake_task"
        ? Math.floor(Math.random() * 11) + 5
        : null;
    if (randomDuration) {
      console.log(
        `⏱️ Job ${jobId}: Generated random duration: ${randomDuration} seconds for fake_task`
      );
    }

    const remoteJobPayload = {
      type: externalJobType, // Use mapped external function name
      name: job.name,
      project: job.project || null,
      parameters: {
        ...job.parameters,
        // Add specific parameters based on job type
        ...(externalJobType === "fake_task" && {
          duration: randomDuration,
          task_name: job.name || "External Fake Task",
        }),
        // Add parser-specific settings as they would be expected by the backend
        ocr: parserSettings.ocr,
        marker: parserSettings.marker,
        llamaparse: parserSettings.llamaparse,
        docling: parserSettings.docling,
        pdfplumber: parserSettings.pdfplumber,
        molmo: parserSettings.molmo,
        ocrforced: parserSettings.ocrforced,
        // Add metadata for tracking
        originalJobId: jobId,
        teamId: teamId,
        callbackUrl: `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/api/worker/jobs/${jobId}/callback`,
      },
    };

    console.log(
      `📤 Job ${jobId}: Sending payload to external API:`,
      JSON.stringify(remoteJobPayload, null, 2)
    );

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

    // Handle both FastAPI backend response formats
    const remoteJobInfo = remoteJobData.data || remoteJobData;
    const remoteJobId = remoteJobInfo.id;

    if (!remoteJobId) {
      throw new Error("Remote job ID not found in response");
    }

    // Update job with remote job information
    job.progress = 10;
    job.parameters = {
      ...job.parameters,
      remoteJobId: remoteJobId,
      remoteJobUrl: externalApiUrl,
      remoteJobStatus: remoteJobInfo.status || "pending",
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

    console.log(`Job ${jobId}: Remote job status:`, remoteJob);

    // Update local job with remote status
    if (remoteJob.status) {
      const oldStatus = job.status;
      job.status = remoteJob.status;

      // Update progress, handling both number and percentage formats
      if (typeof remoteJob.progress === "number") {
        job.progress = Math.min(Math.max(remoteJob.progress, 0), 100);
      }

      // Update timestamps based on status changes
      if (
        remoteJob.status === "running" &&
        oldStatus !== "running" &&
        !job.startedAt
      ) {
        job.startedAt = new Date().toISOString();
      }

      if (remoteJob.status === "completed") {
        job.completedAt = remoteJob.completedAt || new Date().toISOString();
        job.progress = 100;
        job.result = remoteJob.result;
        // Calculate duration if we have start time
        if (job.startedAt && remoteJob.duration) {
          job.duration = remoteJob.duration;
        } else if (job.startedAt && job.completedAt) {
          const startTime = new Date(job.startedAt).getTime();
          const endTime = new Date(job.completedAt).getTime();
          job.duration = Math.round((endTime - startTime) / 1000);
        }
      } else if (remoteJob.status === "failed") {
        job.completedAt = remoteJob.completedAt || new Date().toISOString();
        job.error =
          remoteJob.error || "Remote job failed without error message";
        // Calculate duration for failed jobs too
        if (job.startedAt && job.completedAt) {
          const startTime = new Date(job.startedAt).getTime();
          const endTime = new Date(job.completedAt).getTime();
          job.duration = Math.round((endTime - startTime) / 1000);
        }
      }

      // Store additional remote job metadata
      job.parameters = {
        ...job.parameters,
        remoteJobStatus: remoteJob.status,
        lastStatusUpdate: new Date().toISOString(),
      };

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

// Simulate job processing for fakejob - simplified version
async function simulateJobExecution(jobId: string) {
  const job = await jobStore.get(jobId);
  if (!job) return;

  // Update job to running
  job.status = "running";
  job.startedAt = new Date().toISOString();
  job.progress = 10;
  await jobStore.set(jobId, job);

  // Simple 1-2 second completion (no complex polling needed)
  const actualDuration = Math.floor(Math.random() * 2) + 1; // 1-2 seconds

  console.log(`FakeJob ${jobId}: Will complete in ${actualDuration} seconds`);

  // Complete the job after the duration
  setTimeout(async () => {
    const currentJob = await jobStore.get(jobId);
    if (!currentJob || currentJob.status === "cancelled") {
      return;
    }

    // Random success/failure (95% success rate for testing)
    const success = Math.random() > 0.05;

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
      currentJob.error =
        "Simulierter Fehler für Testzwecke (5% Wahrscheinlichkeit)";
    }

    currentJob.completedAt = new Date().toISOString();
    currentJob.duration = actualDuration;
    await jobStore.set(jobId, currentJob);

    console.log(`FakeJob ${jobId}: Completed with status ${currentJob.status}`);
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

    console.log(`💾 Job ${jobId}: Stored in job store`);

    // Verify job was stored correctly
    const storedJob = await jobStore.get(jobId);
    if (storedJob) {
      console.log(
        `✅ Job ${jobId}: Verification successful - job found in store`
      );
    } else {
      console.error(
        `❌ Job ${jobId}: Verification failed - job not found after storage!`
      );
    } // Handle different job types
    if (
      validatedData.type === "fakejob" &&
      (validatedData.name === "FakeTool" || !validatedData.parameters?.external)
    ) {
      // For internal FakeTool, use local simulation
      console.log(`Internal FakeJob detected: ${validatedData.name}`);
      setTimeout(() => simulateJobExecution(jobId), 100);
    } else {
      // For all other job types (including FakeTool Ext), trigger remote worker
      console.log(
        `External job detected: ${validatedData.name} (type: ${validatedData.type})`
      );
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
