import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/jobsStore";

export async function GET() {
  try {
    // Create a test job
    const testJobId = `test_${Date.now()}`;
    const testJob = {
      id: testJobId,
      type: "test",
      name: "Test Job",
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      progress: 0,
      parameters: { test: true },
    };

    // Store the job
    await jobStore.set(testJobId, testJob);
    console.log(`Test job created: ${testJobId}`);

    // Try to retrieve it
    const retrievedJob = await jobStore.get(testJobId);
    console.log(`Test job retrieved:`, retrievedJob ? "success" : "failed");

    // Get all jobs
    const allJobs = await jobStore.getAll();
    console.log(`Total jobs in store: ${allJobs.length}`);

    return NextResponse.json({
      success: true,
      testJobId,
      jobCreated: true,
      jobRetrieved: !!retrievedJob,
      totalJobs: allJobs.length,
      allJobIds: allJobs.map((j) => j.id),
      retrievedJob,
    });
  } catch (error) {
    console.error("Job store test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
