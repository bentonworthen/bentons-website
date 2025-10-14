import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { ASRProcessor } from './services/ASRProcessor';
import { TranscriptionQueue } from './services/TranscriptionQueue';
import logger from './utils/logger';

const fastify = Fastify({
  logger: {
    level: 'info'
  },
});

// Initialize services
const asrProcessor = new ASRProcessor();
const transcriptionQueue = new TranscriptionQueue(asrProcessor);

async function start() {
  try {
    await fastify.register(cors, {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://app.reportify.com', 'https://api.reportify.com']
        : true,
      credentials: true,
    });

    await fastify.register(websocket);

    // Health check
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'asr-service'
      };
    });

    // Real-time transcription WebSocket
    fastify.register(async function (fastify) {
      fastify.get('/transcribe', { websocket: true }, (connection, req) => {
        logger.info('New ASR WebSocket connection established');

        let sessionContext = {
          sessionId: '',
          language: 'en-US',
          speakerDiarization: true,
        };

        connection.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString());

            switch (data.type) {
              case 'config':
                sessionContext = { ...sessionContext, ...data.config };
                connection.send(JSON.stringify({
                  type: 'config_ack',
                  timestamp: new Date().toISOString(),
                }));
                break;

              case 'audio_chunk':
                // Process audio chunk for real-time transcription
                const result = await asrProcessor.processAudioChunk({
                  audioData: data.audioData,
                  sessionId: sessionContext.sessionId,
                  timestamp: data.timestamp,
                  context: sessionContext,
                });

                if (result.transcript) {
                  connection.send(JSON.stringify({
                    type: 'transcript',
                    sessionId: sessionContext.sessionId,
                    timestamp: result.timestamp,
                    transcript: result.transcript,
                    confidence: result.confidence,
                    speakerTag: result.speakerTag,
                    isFinal: result.isFinal,
                  }));
                }

                // Detect profanity/PII
                if (result.detections && result.detections.length > 0) {
                  connection.send(JSON.stringify({
                    type: 'content_warning',
                    sessionId: sessionContext.sessionId,
                    timestamp: result.timestamp,
                    detections: result.detections,
                  }));
                }
                break;

              case 'end_session':
                logger.info(`ASR session ended: ${sessionContext.sessionId}`);
                connection.send(JSON.stringify({
                  type: 'session_ended',
                  sessionId: sessionContext.sessionId,
                  timestamp: new Date().toISOString(),
                }));
                break;
            }
          } catch (error) {
            logger.error('WebSocket message error:', error);
            connection.send(JSON.stringify({
              type: 'error',
              message: 'Failed to process audio data',
              timestamp: new Date().toISOString(),
            }));
          }
        });

        connection.on('close', () => {
          logger.info(`ASR WebSocket connection closed for session: ${sessionContext.sessionId}`);
        });

        connection.on('error', (error) => {
          logger.error('ASR WebSocket error:', error);
        });
      });
    });

    // Batch transcription endpoint
    fastify.post('/transcribe/batch', async (request, reply) => {
      try {
        const { audioUrl, sessionId, language = 'en-US' } = request.body as any;

        const jobId = await transcriptionQueue.addJob({
          audioUrl,
          sessionId,
          language,
          requestedAt: new Date(),
        });

        reply.send({
          jobId,
          status: 'queued',
          estimatedDuration: '2-5 minutes',
        });
      } catch (error) {
        logger.error('Batch transcription error:', error);
        reply.code(500).send({ error: 'Failed to queue transcription job' });
      }
    });

    // Get transcription job status
    fastify.get('/transcribe/job/:jobId', async (request, reply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const status = await transcriptionQueue.getJobStatus(jobId);

        reply.send(status);
      } catch (error) {
        logger.error('Job status error:', error);
        reply.code(500).send({ error: 'Failed to get job status' });
      }
    });

    // Language detection endpoint
    fastify.post('/detect-language', async (request, reply) => {
      try {
        const { audioUrl } = request.body as any;
        const language = await asrProcessor.detectLanguage(audioUrl);

        reply.send({ detectedLanguage: language });
      } catch (error) {
        logger.error('Language detection error:', error);
        reply.code(500).send({ error: 'Failed to detect language' });
      }
    });

    const port = parseInt(process.env.ASR_PORT || '3002');
    const host = process.env.ASR_HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    logger.info(`ASR Service listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();