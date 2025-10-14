import { OpenAI } from 'openai';
import logger from '../utils/logger';

interface AudioChunkData {
  audioData: string; // Base64 encoded audio
  sessionId: string;
  timestamp: string;
  context: {
    sessionId: string;
    language: string;
    speakerDiarization: boolean;
  };
}

interface ASRResult {
  transcript: string;
  confidence: number;
  speakerTag?: string;
  timestamp: string;
  isFinal: boolean;
  detections?: ContentDetection[];
}

interface ContentDetection {
  type: 'profanity' | 'pii_email' | 'pii_phone' | 'pii_ssn' | 'pii_credit_card';
  text: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
}

export class ASRProcessor {
  private openai: OpenAI | null = null;
  private profanityList: Set<string>;
  private piiPatterns: Map<string, RegExp>;

  constructor() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize content detection patterns
    this.profanityList = new Set([
      // Basic profanity list - in production, use a comprehensive library
      'damn', 'hell', 'crap', 'stupid', 'idiot',
    ]);

    this.piiPatterns = new Map([
      ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
      ['phone', /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g],
      ['ssn', /\b\d{3}-\d{2}-\d{4}\b/g],
      ['credit_card', /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g],
    ]);
  }

  async processAudioChunk(data: AudioChunkData): Promise<ASRResult> {
    try {
      // In a real implementation, this would use a streaming ASR service
      // For demo purposes, we'll simulate transcription with realistic delays

      const transcript = await this.simulateASR(data);
      const confidence = this.calculateConfidence(transcript);
      const speakerTag = data.context.speakerDiarization ? this.determineSpeaker(data) : undefined;
      const detections = this.detectContent(transcript);

      return {
        transcript,
        confidence,
        speakerTag,
        timestamp: data.timestamp,
        isFinal: true,
        detections: detections.length > 0 ? detections : undefined,
      };
    } catch (error) {
      logger.error('ASR processing error:', error);
      throw new Error('Failed to process audio chunk');
    }
  }

  async transcribeFile(audioUrl: string, language: string = 'en-US'): Promise<string> {
    try {
      if (this.openai) {
        // Use OpenAI Whisper for file transcription
        logger.info(`Starting Whisper transcription for ${audioUrl}`);

        // In a real implementation, you would download the file and pass it to Whisper
        // For demo purposes, we'll simulate the response
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing time

        return this.generateSampleTranscript();
      } else {
        // Fallback to simulated transcription
        logger.warn('OpenAI API key not configured, using simulated transcription');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.generateSampleTranscript();
      }
    } catch (error) {
      logger.error('File transcription error:', error);
      throw new Error('Failed to transcribe audio file');
    }
  }

  async detectLanguage(audioUrl: string): Promise<string> {
    try {
      // In a real implementation, this would analyze the audio to detect language
      // For demo purposes, we'll return English as default
      await new Promise(resolve => setTimeout(resolve, 1000));

      const supportedLanguages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR'];
      return supportedLanguages[Math.floor(Math.random() * supportedLanguages.length)];
    } catch (error) {
      logger.error('Language detection error:', error);
      return 'en-US'; // Default fallback
    }
  }

  private async simulateASR(data: AudioChunkData): Promise<string> {
    // Simulate realistic ASR latency
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const samplePhrases = [
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
      "You're welcome. Is there anything else I can help you with?",
      "No, that's all for now. Have a great day!",
    ];

    return samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
  }

  private calculateConfidence(transcript: string): number {
    // Simulate confidence scoring based on transcript characteristics
    const baseConfidence = 85;
    const lengthFactor = Math.min(transcript.length / 50, 1) * 10; // Longer = more confident
    const wordsCount = transcript.split(' ').length;
    const wordsFactor = Math.min(wordsCount / 5, 1) * 5; // More words = more confident

    return Math.min(baseConfidence + lengthFactor + wordsFactor + (Math.random() * 10 - 5), 100);
  }

  private determineSpeaker(data: AudioChunkData): string {
    // Simulate speaker diarization
    // In a real implementation, this would use voice recognition/diarization algorithms
    const speakers = ['Agent', 'Customer'];
    const speakerIndex = Math.floor(Math.random() * speakers.length);
    return speakers[speakerIndex];
  }

  private detectContent(transcript: string): ContentDetection[] {
    const detections: ContentDetection[] = [];

    // Check for profanity
    const words = transcript.toLowerCase().split(/\s+/);
    words.forEach((word, index) => {
      if (this.profanityList.has(word)) {
        const startOffset = transcript.toLowerCase().indexOf(word);
        detections.push({
          type: 'profanity',
          text: word,
          confidence: 95,
          startOffset,
          endOffset: startOffset + word.length,
        });
      }
    });

    // Check for PII patterns
    for (const [type, pattern] of this.piiPatterns) {
      const matches = transcript.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          detections.push({
            type: `pii_${type}` as any,
            text: match[0],
            confidence: 90,
            startOffset: match.index,
            endOffset: match.index + match[0].length,
          });
        }
      }
    }

    return detections;
  }

  private generateSampleTranscript(): string {
    const sampleTranscripts = [
      `Customer called in reporting they cannot connect to the company WiFi network. They mentioned seeing an error message "Unable to connect to Campus-Secure network". I guided them through checking their network adapter settings in Device Manager. We found that the Intel Wi-Fi 6 AX201 adapter needed a driver update. After downloading and installing the latest driver from the manufacturer's website, the customer was able to successfully connect to the network. I had them test internet connectivity by browsing to a few websites, and everything worked correctly. The customer confirmed the issue was resolved and thanked me for the help.`,

      `User contacted support about their Outlook email not syncing properly. They reported that emails were not downloading and they were getting authentication errors. I walked them through updating their password in the Mail app settings. We also cleared the cached credentials in Credential Manager and re-added their Exchange account. After restarting Outlook, the sync process began working normally. The customer verified they could send and receive emails successfully.`,

      `Customer reported their laptop was running very slowly and taking a long time to boot up. I guided them through checking Task Manager to identify high CPU usage processes. We found several unnecessary startup programs that were impacting performance. I showed them how to disable these programs in the Startup tab of Task Manager. We also ran a disk cleanup to free up storage space and checked for Windows updates. After applying the updates and restarting, the customer confirmed the laptop was running much faster.`
    ];

    return sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
  }
}