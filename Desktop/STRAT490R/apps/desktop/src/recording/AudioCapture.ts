import { CaptureSettings } from './RecordingSession';

export class AudioCapture {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaUris: string[] = [];

  constructor(private settings: CaptureSettings) {}

  async start(): Promise<void> {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processAudioData();
      };

      // Start recording in chunks for real-time processing
      this.mediaRecorder.start(1000); // 1 second chunks

      console.log('Audio capture started');
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    console.log('Audio capture stopped');
  }

  private processAudioData(): void {
    if (this.audioChunks.length === 0) {
      return;
    }

    // Create blob from audio chunks
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

    // In a real implementation, this would upload to cloud storage
    // For demo purposes, we'll create a local blob URL
    const audioUrl = URL.createObjectURL(audioBlob);
    this.mediaUris.push(audioUrl);

    // Simulate ASR processing
    this.simulateASR(audioBlob);

    console.log(`Processed audio chunk: ${audioUrl}`);
  }

  private simulateASR(audioBlob: Blob): void {
    // In a real implementation, this would send audio to an ASR service
    // For demo purposes, we'll simulate speech recognition

    const sampleTranscripts = [
      "Hi, I'm having trouble connecting to the wifi network.",
      "I've tried restarting my computer but it's still not working.",
      "The error message says 'Cannot connect to Campus-Secure'.",
      "Let me check the network adapter settings.",
      "I can see the device manager is open now.",
      "Let's try updating the network driver.",
      "The driver update is installing now.",
      "Great! Now I can see the network is connected.",
      "Let me test the internet connection.",
      "Perfect, everything is working now. Thank you for your help.",
    ];

    const randomTranscript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];

    // Simulate processing delay
    setTimeout(() => {
      // In a real implementation, this would be sent via WebSocket or API
      console.log('ASR Result:', randomTranscript);
    }, 1000 + Math.random() * 2000); // 1-3 second delay
  }

  getMediaUris(): string[] {
    return [...this.mediaUris];
  }
}