import { NextRequest, NextResponse } from "next/server";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getDocumentParserSettings } from "@/lib/db/settings";

// Import the jobs store from the main route (in production, this would be Redis)
import { jobStore, Job } from "@/lib/jobsStore";

async function handleGetRequest(
  request: RequestWithTeam,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  try {
    const jobId = params.jobId;

    console.log(
      `🔍 GET /api/worker/jobs/${jobId} - Starting job status request`
    );

    if (!jobId) {
      console.error(`❌ GET /api/worker/jobs - Missing jobId parameter`);
      return NextResponse.json(
        {
          success: false,
          error: "Job-ID ist erforderlich",
        },
        { status: 400 }
      );
    }

    // Check team context
    if (!request.teamId) {
      console.error(`❌ GET /api/worker/jobs/${jobId} - Missing team context`);
      return NextResponse.json(
        { error: "Team context required." },
        { status: 401 }
      );
    }
    console.log(`🔍 GET /api/worker/jobs/${jobId} - Looking up job in store`);
    const job = await jobStore.get(jobId);

    if (!job) {
      console.error(
        `❌ GET /api/worker/jobs/${jobId} - Job not found in store`
      );

      // Debug: List all jobs in store
      const allJobs = await jobStore.getAll();
      console.log(
        `🔍 Debug: All jobs in store (${allJobs.length}):`,
        allJobs.map((j) => ({ id: j.id, name: j.name, status: j.status }))
      );

      return NextResponse.json(
        {
          success: false,
          error: "Job nicht gefunden",
        },
        { status: 404 }
      );
    }

    console.log(`✅ GET /api/worker/jobs/${jobId} - Job found:`, {
      status: job.status,
      hasRemoteJobId: !!job.parameters?.remoteJobId,
      remoteJobId: job.parameters?.remoteJobId,
    }); // Check if this is an external job that needs to be queried from remote parser
    if (job.parameters?.remoteJobId) {
      console.log(
        `🔍 Job ${jobId}: External job detected, querying remote parser for status`
      );
      console.log(`📋 Job ${jobId}: Remote job details:`, {
        remoteJobId: job.parameters.remoteJobId,
        currentStatus: job.status,
        teamId: request.teamId,
      });

      try {
        // Get document parser settings
        console.log(
          `⚙️ Job ${jobId}: Getting parser settings for team ${request.teamId}`
        );
        const parserSettings = await getDocumentParserSettings(request.teamId);

        if (!parserSettings?.parserUrl) {
          console.error(
            `❌ Job ${jobId}: Parser URL not configured for status check`
          );
          console.log(
            `⚙️ Job ${jobId}: Available parser settings:`,
            parserSettings
          );
          // Return local job data as fallback
          return NextResponse.json({
            success: true,
            data: job,
            warning: "Parser URL nicht konfiguriert - lokale Daten angezeigt",
          });
        }

        // Query the external parser for job status
        const remoteJobStatusUrl = `${parserSettings.parserUrl.replace(
          /\/$/,
          ""
        )}/api/worker/jobs/${job.parameters.remoteJobId}`;
        console.log(
          `🌐 Job ${jobId}: Querying external parser: ${remoteJobStatusUrl}`
        );

        const response = await fetch(remoteJobStatusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "klark0-webapp/1.0",
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        console.log(
          `📡 Job ${jobId}: External API response status: ${response.status}`
        );

        if (!response.ok) {
          console.error(
            `❌ Job ${jobId}: External status check failed: ${response.status} ${response.statusText}`
          );
          const responseText = await response.text();
          console.error(`❌ Job ${jobId}: Response body: ${responseText}`);
          // Return local job data as fallback
          return NextResponse.json({
            success: true,
            data: job,
            warning: `Externe API-Fehler: ${response.status} - lokale Daten angezeigt`,
          });
        }

        const remoteJobStatus = await response.json();
        const remoteJob = remoteJobStatus.data || remoteJobStatus;

        console.log(`✅ Job ${jobId}: Got remote status:`, {
          remoteStatus: remoteJob.status,
          remoteProgress: remoteJob.progress,
          localStatus: job.status,
        });

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

        console.log(`📤 Job ${jobId}: Returning updated job data:`, {
          status: job.status,
          progress: job.progress,
          hasResult: !!job.result,
          hasError: !!job.error,
        });

        return NextResponse.json({
          success: true,
          data: job,
          remoteStatus: true,
          message: `Status von externer API abgerufen: ${job.status}`,
        });
      } catch (error) {
        console.error(`❌ Job ${jobId}: Error querying remote parser:`, error);
        console.error(`❌ Job ${jobId}: Error details:`, {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          remoteJobId: job.parameters?.remoteJobId,
          teamId: request.teamId,
        });
        // Return local job data as fallback
        return NextResponse.json({
          success: true,
          data: job,
          warning: `Fehler beim Abfragen der externen API: ${
            error instanceof Error ? error.message : String(error)
          }`,
          debugInfo: {
            hasRemoteJobId: !!job.parameters?.remoteJobId,
            remoteJobId: job.parameters?.remoteJobId,
            teamId: request.teamId,
          },
        });
      }
    } else {
      // Local job - return as is
      console.log(`📍 Job ${jobId}: Local job, returning stored data`);
      return NextResponse.json({
        success: true,
        data: job,
      });
    }
  } catch (error) {
    console.error("Error fetching job:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Abrufen des Jobs",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: RequestWithTeam,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  try {
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: "Job-ID ist erforderlich",
        },
        { status: 400 }
      );
    }

    const job = await jobStore.get(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "Job nicht gefunden",
        },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending or running jobs
    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Job kann nicht abgebrochen werden (bereits abgeschlossen)",
        },
        { status: 400 }
      );
    }

    // Cancel the job
    job.status = "cancelled";
    job.completedAt = new Date().toISOString();

    if (job.startedAt) {
      const startTime = new Date(job.startedAt).getTime();
      const endTime = new Date().getTime();
      job.duration = Math.floor((endTime - startTime) / 1000);
    }

    await jobStore.set(jobId, job);

    return NextResponse.json({
      success: true,
      data: job,
      message: "Job erfolgreich abgebrochen",
    });
  } catch (error) {
    console.error("Error cancelling job:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Fehler beim Abbrechen des Jobs",
        details: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export const GET = withTeamContext(handleGetRequest);
