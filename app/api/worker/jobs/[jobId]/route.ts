import { NextRequest, NextResponse } from 'next/server';

// Import the jobs store from the main route (in production, this would be Redis)
// For now, we'll duplicate the interface and assume the same in-memory store
import { jobStore, Job } from "@/lib/jobsStore";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  try {
    const jobId = params.jobId;
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job-ID ist erforderlich'
      }, { status: 400 });
    }

    const job = await jobStore.get(jobId);
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job nicht gefunden'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abrufen des Jobs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  try {
    const jobId = params.jobId;
    
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Job-ID ist erforderlich'
      }, { status: 400 });
    }

    const job = await jobStore.get(jobId);
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job nicht gefunden'
      }, { status: 404 });
    }

    // Only allow cancellation of pending or running jobs
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: 'Job kann nicht abgebrochen werden (bereits abgeschlossen)'
      }, { status: 400 });
    }

    // Cancel the job
    job.status = 'cancelled';
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
      message: 'Job erfolgreich abgebrochen'
    });

  } catch (error) {
    console.error('Error cancelling job:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abbrechen des Jobs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
