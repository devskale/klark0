/**
 * In-memory job store for managing worker jobs
 * This is a simple implementation for development/testing purposes
 */

export interface Job {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  progress: number;
  parameters?: any;
  result?: any;
  error?: string;
}

class JobStore {
  private jobs: Map<string, Job> = new Map();

  /**
   * Store a job in the store
   */
  async set(jobId: string, job: Job): Promise<void> {
    this.jobs.set(jobId, job);
  }

  /**
   * Retrieve a job from the store
   */
  async get(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs from the store
   */
  async getAll(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  /**
   * Delete a job from the store
   */
  async delete(jobId: string): Promise<boolean> {
    return this.jobs.delete(jobId);
  }

  /**
   * Update job status
   */
  async updateStatus(jobId: string, status: Job['status'], progress?: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (progress !== undefined) {
        job.progress = progress;
      }
      this.jobs.set(jobId, job);
    }
  }

  /**
   * Clear all jobs (for testing)
   */
  async clear(): Promise<void> {
    this.jobs.clear();
  }

  /**
   * Get jobs by status
   */
  async getByStatus(status: Job['status']): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }
}

// Export singleton instance
export const jobStore = new JobStore();