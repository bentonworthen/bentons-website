import { desktopCapturer } from 'electron';
import { CaptureSettings } from './RecordingSession';

export class ScreenCapture {
  private mediaRecorder: MediaRecorder | null = null;
  private videoChunks: Blob[] = [];
  private mediaUris: string[] = [];

  constructor(private settings: CaptureSettings) {}

  async start(sourceId: string): Promise<void> {
    try {
      // Get the screen source
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 1, height: 1 },
      });

      const selectedSource = sources.find(source => source.id === sourceId);
      if (!selectedSource) {
        throw new Error(`Source ${sourceId} not found`);
      }

      // Create media stream from the selected source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, // Screen audio handled separately
        video: {
          // @ts-ignore - Electron-specific constraints
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            maxWidth: this.getMaxWidth(),
            maxHeight: this.getMaxHeight(),
            maxFrameRate: this.settings.frameRate,
          },
        },
      } as any);

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      this.videoChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.videoChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processVideoData();
      };

      // Start recording
      this.mediaRecorder.start(5000); // 5 second chunks

      console.log('Screen capture started');
    } catch (error) {
      console.error('Failed to start screen capture:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    console.log('Screen capture stopped');
  }

  private getMaxWidth(): number {
    switch (this.settings.quality) {
      case 'low':
        return 1280;
      case 'medium':
        return 1920;
      case 'high':
        return 3840;
      default:
        return 1920;
    }
  }

  private getMaxHeight(): number {
    switch (this.settings.quality) {
      case 'low':
        return 720;
      case 'medium':
        return 1080;
      case 'high':
        return 2160;
      default:
        return 1080;
    }
  }

  private processVideoData(): void {
    if (this.videoChunks.length === 0) {
      return;
    }

    // Create blob from video chunks
    const videoBlob = new Blob(this.videoChunks, { type: 'video/webm' });

    // In a real implementation, this would upload to cloud storage
    // For demo purposes, we'll create a local blob URL
    const videoUrl = URL.createObjectURL(videoBlob);
    this.mediaUris.push(videoUrl);

    // Simulate OCR/computer vision processing
    this.simulateOCR();

    console.log(`Processed video chunk: ${videoUrl}`);
  }

  private simulateOCR(): void {
    // In a real implementation, this would send frames to OCR/computer vision service
    // For demo purposes, we'll simulate text detection

    const sampleOCRResults = [
      'Device Manager',
      'Network adapters',
      'Intel(R) Wi-Fi 6 AX201 160MHz',
      'Properties',
      'Driver',
      'Update Driver',
      'Search automatically for drivers',
      'Windows has successfully updated your drivers',
      'Close',
      'Network and Sharing Center',
      'Connected to Campus-Secure',
    ];

    // Simulate multiple OCR detections over time
    const detectionCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < detectionCount; i++) {
      setTimeout(() => {
        const randomText = sampleOCRResults[Math.floor(Math.random() * sampleOCRResults.length)];

        // In a real implementation, this would be sent via WebSocket or API
        console.log('OCR Result:', randomText);
      }, (i + 1) * 1000);
    }
  }

  takeScreenshot(): Promise<string> {
    return new Promise((resolve, reject) => {
      // In a real implementation, this would capture a single frame
      // For demo purposes, we'll return a placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }

      // Draw a simple placeholder
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Screenshot Placeholder', canvas.width / 2, canvas.height / 2);
      ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 60);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          reject(new Error('Failed to create screenshot blob'));
        }
      });
    });
  }

  getMediaUris(): string[] {
    return [...this.mediaUris];
  }
}