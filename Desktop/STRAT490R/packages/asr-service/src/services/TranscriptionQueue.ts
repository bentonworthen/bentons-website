import { ASRProcessor } from './ASRProcessor';
import logger from '../utils/logger';

interface TranscriptionJob {
  id: string;
  audioUrl: string;
  sessionId: string;
  language: string;
  requestedAt: Date;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: string;
  error?: string;
  completedAt?: Date;
}

export class TranscriptionQueue {
  private jobs: Map<string, TranscriptionJob> = new Map();
  private processingQueue: string[] = [];
  private isProcessing = false;

  constructor(private asrProcessor: ASRProcessor) {
    // Start processing queue
    this.startQueueProcessor();
  }

  async addJob(data: {
    audioUrl: string;
    sessionId: string;
    language: string;
    requestedAt: Date;
  }): Promise<string> {
    const jobId = this.generateJobId();

    const job: TranscriptionJob = {
      id: jobId,
      audioUrl: data.audioUrl,
      sessionId: data.sessionId,
      language: data.language,
      requestedAt: data.requestedAt,
      status: 'queued',
      progress: 0,
    };

    this.jobs.set(jobId, job);
    this.processingQueue.push(jobId);

    logger.info(`Transcription job queued: ${jobId} for session: ${data.sessionId}`);

    return jobId;
  }

  async getJobStatus(jobId: string): Promise<TranscriptionJob | null> {
    return this.jobs.get(jobId) || null;
  }

  private async startQueueProcessor(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (true) {
      if (this.processingQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        continue;
      }

      const jobId = this.processingQueue.shift()!;
      const job = this.jobs.get(jobId);

      if (!job) {
        continue;
      }

      try {
        await this.processJob(job);
      } catch (error) {
        logger.error(`Failed to process transcription job ${jobId}:`, error);
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
  }

  private async processJob(job: TranscriptionJob): Promise<void> {
    logger.info(`Starting transcription job: ${job.id}`);

    job.status = 'processing';
    job.progress = 10;

    try {
      // Simulate progress updates
      const progressUpdates = [20, 40, 60, 80];
      for (const progress of progressUpdates) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        job.progress = progress;
      }

      // Perform actual transcription
      const transcript = await this.asrProcessor.transcribeFile(job.audioUrl, job.language);

      job.status = 'completed';
      job.progress = 100;
      job.result = transcript;
      job.completedAt = new Date();

      logger.info(`Transcription job completed: ${job.id}`);

      // In a real implementation, you would send the result back to the main API
      // or save it to the database
      this.notifyJobCompletion(job);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Transcription failed';
      job.completedAt = new Date();

      logger.error(`Transcription job failed: ${job.id}`, error);
    }
  }

  private notifyJobCompletion(job: TranscriptionJob): void {
    // In a real implementation, this would:
    // 1. Send a webhook to the main API
    // 2. Update the database with the transcription result
    // 3. Trigger report generation if this was the final piece

    logger.info(`Job completion notification would be sent for: ${job.id}`);

    // Simulate sending the result back to the main API
    setTimeout(async () => {
      try {
        // This would be an actual HTTP request to the main API
        logger.info(`Simulating POST to /api/sessions/${job.sessionId}/transcription-complete`);
        logger.info(`Transcription result: ${job.result?.substring(0, 100)}...`);
      } catch (error) {
        logger.error('Failed to notify main API of transcription completion:', error);
      }
    }, 100);
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup old completed jobs
  public cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [jobId, job] of this.jobs) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        this.jobs.delete(jobId);
        logger.info(`Cleaned up old job: ${jobId}`);
      }
    }
  }

  // Get queue statistics
  public getQueueStats(): {
    totalJobs: number;
    queuedJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
  } {
    const stats = {
      totalJobs: this.jobs.size,
      queuedJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    };

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'queued':
          stats.queuedJobs++;
          break;
        case 'processing':
          stats.processingJobs++;
          break;
        case 'completed':
          stats.completedJobs++;
          break;
        case 'failed':
          stats.failedJobs++;
          break;
      }
    }

    return stats;
  }
}