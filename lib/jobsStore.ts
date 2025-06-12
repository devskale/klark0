// File-based job store for development (replace with Redis in production)
import { promises as fs } from 'fs';
import path from 'path';

export interface Job {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  project?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  progress: number;
  result?: any;
  error?: string;
  parameters?: Record<string, any>;
}

const JOBS_FILE = path.join(process.cwd(), 'tmp', 'jobs.json');

// Ensure tmp directory exists
async function ensureTmpDir() {
  const tmpDir = path.dirname(JOBS_FILE);
  try {
    await fs.access(tmpDir);
  } catch {
    await fs.mkdir(tmpDir, { recursive: true });
  }
}

// Load jobs from file
async function loadJobs(): Promise<Map<string, Job>> {
  try {
    await ensureTmpDir();
    const data = await fs.readFile(JOBS_FILE, 'utf8');
    const jobsArray: [string, Job][] = JSON.parse(data);
    return new Map(jobsArray);
  } catch {
    return new Map();
  }
}

// Save jobs to file
async function saveJobs(jobs: Map<string, Job>): Promise<void> {
  try {
    await ensureTmpDir();
    const jobsArray = Array.from(jobs.entries());
    await fs.writeFile(JOBS_FILE, JSON.stringify(jobsArray, null, 2));
  } catch (error) {
    console.error('Error saving jobs:', error);
  }
}

// Job store operations
export const jobStore = {
  async get(id: string): Promise<Job | undefined> {
    const jobs = await loadJobs();
    return jobs.get(id);
  },

  async set(id: string, job: Job): Promise<void> {
    const jobs = await loadJobs();
    jobs.set(id, job);
    await saveJobs(jobs);
  },

  async delete(id: string): Promise<boolean> {
    const jobs = await loadJobs();
    const deleted = jobs.delete(id);
    if (deleted) {
      await saveJobs(jobs);
    }
    return deleted;
  },

  async getAll(): Promise<Job[]> {
    const jobs = await loadJobs();
    return Array.from(jobs.values());
  },

  async clear(): Promise<void> {
    await saveJobs(new Map());
  }
};

// Legacy export for backward compatibility (deprecated)
export const jobs = new Map<string, Job>();
