import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jobStore } from "@/lib/jobsStore";

const CallbackSchema = z.object({
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  progress: z.number().min(0).max(100).optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  completedAt: z.string().optional(),
  duration: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get the existing job
    const job = await jobStore.get(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Parse and validate the callback data
    const body = await request.json();
    const validatedData = CallbackSchema.parse(body);

    console.log(`Job ${jobId}: Received callback update:`, validatedData);

    // Update the job with the new status
    job.status = validatedData.status;

    if (validatedData.progress !== undefined) {
      job.progress = validatedData.progress;
    }

    if (validatedData.result !== undefined) {
      job.result = validatedData.result;
    }

    if (validatedData.error) {
      job.error = validatedData.error;
    }

    if (validatedData.completedAt) {
      job.completedAt = validatedData.completedAt;
    } else if (
      validatedData.status === "completed" ||
      validatedData.status === "failed"
    ) {
      job.completedAt = new Date().toISOString();
    }

    if (validatedData.duration !== undefined) {
      job.duration = validatedData.duration;
    }

    // Save the updated job
    await jobStore.set(jobId, job);

    console.log(`Job ${jobId}: Status updated to ${validatedData.status}`);

    return NextResponse.json({
      success: true,
      message: "Job status updated successfully",
    });
  } catch (error) {
    console.error("Error processing job callback:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid callback data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
