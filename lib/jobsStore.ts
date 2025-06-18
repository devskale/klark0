// File-based job store for development (replace with Redis in production)
// This module uses 'fs' and 'path', which are not available in the Edge runtime.
// It has been temporarily modified to prevent build errors in Edge environments.
// A proper Edge-compatible solution or conditional import logic is needed if this store is to be used.

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

// Placeholder job store operations for Edge compatibility
export const jobStore = {
  async get(id: string): Promise<Job | undefined> {
    console.warn('File-based jobStore.get is not available in this environment.');
    return undefined;
  },

  async set(id: string, job: Job): Promise<void> {
    console.warn('File-based jobStore.set is not available in this environment.');
  },

  async delete(id: string): Promise<boolean> {
    console.warn('File-based jobStore.delete is not available in this environment.');
    return false;
  },

  async getAll(): Promise<Job[]> {
    console.warn('File-based jobStore.getAll is not available in this environment.');
    return [];
  },

  async clear(): Promise<void> {
    console.warn('File-based jobStore.clear is not available in this environment.');
  }
};

// Legacy export for backward compatibility (deprecated)
export const jobs = new Map<string, Job>();
