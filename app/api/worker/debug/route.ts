import { NextRequest, NextResponse } from "next/server";
import { withTeamContext, RequestWithTeam } from "@/lib/auth/team-context";
import { getDocumentParserSettings } from "@/lib/db/settings";
import { jobStore } from "@/lib/jobsStore";

async function handleGetRequest(request: RequestWithTeam) {
  try {
    if (!request.teamId) {
      return NextResponse.json(
        { error: "Team context required." },
        { status: 401 }
      );
    }

    // Get parser settings
    const parserSettings = await getDocumentParserSettings(request.teamId);

    // Get all jobs from store
    const allJobs = await jobStore.getAll();

    // Filter external jobs
    const externalJobs = allJobs.filter((job) => job.parameters?.remoteJobId);
    return NextResponse.json({
      success: true,
      data: {
        teamId: request.teamId,
        parserSettings,
        totalJobs: allJobs.length,
        externalJobs: externalJobs.length,
        jobs: allJobs.map((job) => ({
          id: job.id,
          name: job.name,
          status: job.status,
          hasRemoteJobId: !!job.parameters?.remoteJobId,
          remoteJobId: job.parameters?.remoteJobId,
          createdAt: job.createdAt,
        })),
        // Add timestamp to see when this was called
        debugTimestamp: new Date().toISOString(),
        // Add memory info
        memoryInfo: {
          // @ts-ignore - process might not be available in browser
          pid: typeof process !== "undefined" ? process.pid : "unknown",
          uptime: typeof process !== "undefined" ? process.uptime() : "unknown",
        },
      },
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Debug endpoint error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const GET = withTeamContext(handleGetRequest);
