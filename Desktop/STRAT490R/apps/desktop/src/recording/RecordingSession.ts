import { APIClient } from '../api/APIClient';
import { EventTracker } from './EventTracker';
import { AudioCapture } from './AudioCapture';
import { ScreenCapture } from './ScreenCapture';

export interface CaptureSettings {
  includeAudio: boolean;
  includeSystemAudio: boolean;
  quality: 'low' | 'medium' | 'high';
  frameRate: number;
}

export interface RecordingOptions {
  sourceId: string;
  customerId?: string;
  customerName?: string;
}

export class RecordingSession {
  private sessionId: string | null = null;
  private isRecordingFlag = false;
  private isPausedFlag = false;
  private startTime: Date | null = null;
  private eventTracker: EventTracker;
  private audioCapture: AudioCapture;
  private screenCapture: ScreenCapture;

  constructor(
    private apiClient: APIClient,
    private captureSettings: CaptureSettings
  ) {
    this.eventTracker = new EventTracker();
    this.audioCapture = new AudioCapture(captureSettings);
    this.screenCapture = new ScreenCapture(captureSettings);
  }

  async start(options: RecordingOptions): Promise<void> {
    if (this.isRecordingFlag) {
      throw new Error('Recording session already in progress');
    }

    try {
      // Create session on server
      const sessionData = await this.apiClient.createSession({
        customerId: options.customerId,
        customerName: options.customerName,
        sources: {
          screen: true,
          audio: this.captureSettings.includeAudio,
          windows: [options.sourceId],
        },
        consentFlags: {
          screenRecording: true,
          audioRecording: this.captureSettings.includeAudio,
          keystrokeCapture: false, // Default to false for privacy
        },
      });

      this.sessionId = sessionData.id;
      this.startTime = new Date();
      this.isRecordingFlag = true;

      // Start capture components
      await this.screenCapture.start(options.sourceId);

      if (this.captureSettings.includeAudio) {
        await this.audioCapture.start();
      }

      // Start event tracking
      this.eventTracker.start((event) => {
        if (this.sessionId && this.isRecordingFlag && !this.isPausedFlag) {
          this.apiClient.addEvent(this.sessionId, event).catch(console.error);
        }
      });

      console.log(`Recording session started: ${this.sessionId}`);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRecordingFlag || !this.sessionId) {
      throw new Error('No recording session in progress');
    }

    try {
      // Stop capture components
      await this.screenCapture.stop();
      await this.audioCapture.stop();
      this.eventTracker.stop();

      // Calculate duration
      const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

      // End session on server
      await this.apiClient.endSession(this.sessionId, {
        duration: Math.floor(duration / 1000), // Convert to seconds
        mediaUris: [
          ...this.screenCapture.getMediaUris(),
          ...this.audioCapture.getMediaUris(),
        ],
      });

      console.log(`Recording session ended: ${this.sessionId}`);
      this.cleanup();
    } catch (error) {
      console.error('Error stopping recording session:', error);
      this.cleanup();
      throw error;
    }
  }

  togglePause(): void {
    if (!this.isRecordingFlag) {
      return;
    }

    this.isPausedFlag = !this.isPausedFlag;

    // Add pause/resume events
    const eventType = this.isPausedFlag ? 'privacy_pause' : 'privacy_resume';
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType as any,
      payload: { manual: true },
    };

    if (this.sessionId) {
      this.apiClient.addEvent(this.sessionId, event).catch(console.error);
    }

    console.log(`Recording ${this.isPausedFlag ? 'paused' : 'resumed'}`);
  }

  markMilestone(description: string): void {
    if (!this.isRecordingFlag || !this.sessionId || this.isPausedFlag) {
      return;
    }

    const event = {
      timestamp: new Date().toISOString(),
      type: 'user_note' as any,
      payload: { note: description, type: 'milestone' },
    };

    this.apiClient.addEvent(this.sessionId, event).catch(console.error);
    console.log(`Milestone marked: ${description}`);
  }

  isRecording(): boolean {
    return this.isRecordingFlag;
  }

  isPaused(): boolean {
    return this.isPausedFlag;
  }

  getDuration(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  private cleanup(): void {
    this.sessionId = null;
    this.isRecordingFlag = false;
    this.isPausedFlag = false;
    this.startTime = null;
  }
}