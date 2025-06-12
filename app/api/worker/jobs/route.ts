import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jobStore, Job } from "@/lib/jobsStore";

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

// Simulate job processing for fakejob
async function simulateJobExecution(jobId: string) {
  const job = await jobStore.get(jobId);
  if (!job) return;

  // Update job to running
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.progress = 0;
  await jobStore.set(jobId, job);

  const maxDuration = job.parameters?.maxDuration || 10;
  const actualDuration = Math.floor(Math.random() * (maxDuration - 3 + 1)) + 3; // 3 to maxDuration seconds
  
  // Simulate progress updates
  const progressInterval = setInterval(async () => {
    const currentJob = await jobStore.get(jobId);
    if (!currentJob || currentJob.status !== 'running') {
      clearInterval(progressInterval);
      return;
    }

    currentJob.progress = Math.min(currentJob.progress + Math.random() * 20, 95);
    await jobStore.set(jobId, currentJob);
  }, actualDuration * 100); // Update progress periodically

  // Complete the job after the duration
  setTimeout(async () => {
    const currentJob = await jobStore.get(jobId);
    if (!currentJob || currentJob.status === 'cancelled') {
      clearInterval(progressInterval);
      return;
    }

    clearInterval(progressInterval);
    
    // Random success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    if (success) {
      currentJob.status = 'completed';
      currentJob.progress = 100;
      currentJob.result = {
        message: 'FakeJob erfolgreich abgeschlossen',
        duration: actualDuration,
        randomValue: Math.floor(Math.random() * 1000),
        processedAt: new Date().toISOString(),
      };
    } else {
      currentJob.status = 'failed';
      currentJob.error = 'Simulierter Fehler für Testzwecke';
    }
    
    currentJob.completedAt = new Date().toISOString();
    currentJob.duration = actualDuration;
    await jobStore.set(jobId, currentJob);
  }, actualDuration * 1000);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const project = searchParams.get('project');

    let filteredJobs = await jobStore.getAll();

    if (type) {
      filteredJobs = filteredJobs.filter(job => job.type === type);
    }
    if (status) {
      filteredJobs = filteredJobs.filter(job => job.status === status);
    }
    if (project) {
      filteredJobs = filteredJobs.filter(job => job.project === project);
    }

    // Sort by creation date (newest first)
    filteredJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: filteredJobs
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abrufen der Jobs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateJobSchema.parse(body);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job = {
      id: jobId,
      type: validatedData.type,
      name: validatedData.name,
      status: 'pending',
      project: validatedData.project || undefined,
      createdAt: new Date().toISOString(),
      progress: 0,
      parameters: validatedData.parameters || {},
    };

    await jobStore.set(jobId, job);

    // For fakejob, immediately start simulation
    if (validatedData.type === 'fakejob') {
      setTimeout(() => simulateJobExecution(jobId), 100);
    }

    return NextResponse.json({
      success: true,
      data: job
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Ungültige Job-Daten',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Fehler beim Erstellen des Jobs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
