// backend/src/routes/speech.ts
import express from 'express';
import multer from 'multer';
import { logger } from '../utils/logger';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler';
import { trackEvent, trackDependency } from '../services/monitoring';

const router = express.Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/webm',
      'audio/ogg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Audio type ${file.mimetype} not supported`));
    }
  }
});

// Speech-to-text endpoint using Azure Speech Services
router.post('/speech-to-text', upload.single('audio'), async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      throw new ValidationError('No audio file provided');
    }

    const audioFile = req.file;
    
    // Track speech processing attempt
    trackEvent('speech_to_text_started', {
      audioSize: audioFile.size,
      mimeType: audioFile.mimetype
    });

    // Azure Speech Services configuration
    const speechEndpoint = process.env.AZURE_SPEECH_ENDPOINT!;
    const speechKey = process.env.AZURE_SPEECH_KEY!;
    const speechRegion = process.env.AZURE_SPEECH_REGION!;

    // Call Azure Speech Services REST API
    const response = await fetch(
      `${speechEndpoint}/speech/recognition/conversation/cognitiveservices/v1?language=en-US`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': `audio/${audioFile.mimetype.split('/')[1]}`,
          'Accept': 'application/json'
        },
        body: audioFile.buffer
      }
    );

    if (!response.ok) {
      throw new ExternalServiceError(
        'Azure Speech Services', 
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const speechResult: any = await response.json();
    const duration = Date.now() - startTime;
    
    // Extract transcribed text
    const transcribedText = speechResult.DisplayText || speechResult.RecognitionStatus === 'Success' 
      ? speechResult.DisplayText 
      : '';

    if (!transcribedText) {
      logger.warn('No speech recognized in audio file');
    }

    trackDependency('azure_speech_services', 'speech_to_text', duration, !!transcribedText);
    trackEvent('speech_to_text_completed', {
      audioSize: audioFile.size,
      duration,
      textLength: transcribedText.length,
      success: !!transcribedText
    });

    res.json({
      success: true,
      data: {
        transcription: transcribedText,
        confidence: speechResult.Confidence || 0,
        duration_ms: duration,
        recognition_status: speechResult.RecognitionStatus || 'Unknown'
      }
    });

    logger.info('Speech-to-text completed', { 
      textLength: transcribedText.length, 
      duration 
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    trackDependency('azure_speech_services', 'speech_to_text', duration, false);
    trackEvent('speech_to_text_failed', {
      audioSize: req.file?.size || 0,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    logger.error('Speech-to-text failed:', error);
    next(error);
  }
});

// Text-to-speech endpoint (optional - for future voice responses)
router.post('/text-to-speech', async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { text, voice = 'en-US-JennyNeural' } = req.body;

    if (!text || typeof text !== 'string') {
      throw new ValidationError('Text is required and must be a string');
    }

    trackEvent('text_to_speech_started', {
      textLength: text.length,
      voice
    });

    // Azure Speech Services TTS configuration
    const speechEndpoint = process.env.AZURE_SPEECH_ENDPOINT!;
    const speechKey = process.env.AZURE_SPEECH_KEY!;

    const ssml = `
      <speak version='1.0' xml:lang='en-US'>
        <voice xml:lang='en-US' xml:gender='Female' name='${voice}'>
          ${text}
        </voice>
      </speak>
    `.trim();

    const response = await fetch(
      `${speechEndpoint}/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        },
        body: ssml
      }
    );

    if (!response.ok) {
      throw new ExternalServiceError(
        'Azure Speech Services TTS',
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const duration = Date.now() - startTime;

    trackDependency('azure_speech_services', 'text_to_speech', duration, true);
    trackEvent('text_to_speech_completed', {
      textLength: text.length,
      audioSize: audioBuffer.byteLength,
      duration
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

    logger.info('Text-to-speech completed', { 
      textLength: text.length, 
      audioSize: audioBuffer.byteLength,
      duration 
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    trackDependency('azure_speech_services', 'text_to_speech', duration, false);
    
    logger.error('Text-to-speech failed:', error);
    next(error);
  }
});

export default router;
