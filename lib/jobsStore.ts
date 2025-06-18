// Simple in-memory job store for development
// In production, this should be replaced with Redis or database storage

import fs from "fs";
import path from "path";

export interface Job {
  id: string;
  type: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
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

// Simple in-memory store with file persistence for development
const jobsMap = new Map<string, Job>();

// File path for persistence (in development only)
const JOBS_FILE = path.join(process.cwd(), "tmp", "jobs.json");

// Load jobs from file on startup
function loadJobsFromFile() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      const data = fs.readFileSync(JOBS_FILE, "utf-8");
      const jobs = JSON.parse(data) as Job[];
      for (const job of jobs) {
        jobsMap.set(job.id, job);
      }
      console.log(`📂 Loaded ${jobs.length} jobs from persistent storage`);
    }
  } catch (error) {
    console.error("Failed to load jobs from file:", error);
  }
}

// Save jobs to file
function saveJobsToFile() {
  try {
    // Ensure tmp directory exists
    const tmpDir = path.dirname(JOBS_FILE);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const jobs = Array.from(jobsMap.values());
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
    console.log(`💾 Saved ${jobs.length} jobs to persistent storage`);
  } catch (error) {
    console.error("Failed to save jobs to file:", error);
  }
}

// Load jobs on module initialization
loadJobsFromFile();

export const jobStore = {
  async get(id: string): Promise<Job | undefined> {
    return jobsMap.get(id);
  },

  async set(id: string, job: Job): Promise<void> {
    jobsMap.set(id, job);
    // Save to file for persistence (debounced)
    if (process.env.NODE_ENV === "development") {
      saveJobsToFile();
    }
  },

  async delete(id: string): Promise<boolean> {
    const result = jobsMap.delete(id);
    if (result && process.env.NODE_ENV === "development") {
      saveJobsToFile();
    }
    return result;
  },

  async getAll(): Promise<Job[]> {
    return Array.from(jobsMap.values());
  },

  async clear(): Promise<void> {
    jobsMap.clear();
    if (process.env.NODE_ENV === "development") {
      saveJobsToFile();
    }
  },
};

// Legacy export for backward compatibility (deprecated)
export const jobs = jobsMap;
