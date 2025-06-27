// backend/src/routes/status.ts
import { Router, Request, Response } from 'express';
import { getRedisClient } from '../services/redis';
import { logger } from '../utils/logger';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const status = {
    backend: true,
    vision: false,
    speech: false,
    documents: false,
    redis: false,
    openai: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check Redis connection (handle if Redis is not initialized)
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.ping();
        status.redis = true;
      } catch (redisError) {
        logger.warn('Redis ping failed:', redisError);
        status.redis = false;
      }
    } else {
      logger.info('Redis client not initialized, skipping Redis health check');
      status.redis = false;
    }
  } catch (error) {
    logger.warn('Redis health check failed (client not available):', error);
    status.redis = false;
  }

  try {
    // Check OpenAI connection (basic check)
    if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_KEY) {
      status.openai = true;
    }
  } catch (error) {
    logger.warn('OpenAI health check failed:', error);
    status.openai = false;
  }

  try {
    // Check Computer Vision
    if (process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY) {
      status.vision = true;
    }
  } catch (error) {
    logger.warn('Vision health check failed:', error);
    status.vision = false;
  }

  try {
    // Check Speech services
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      status.speech = true;
    }
  } catch (error) {
    logger.warn('Speech health check failed:', error);
    status.speech = false;
  }

  try {
    // Check Document Intelligence
    if (process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY && process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
      status.documents = true;
    }
  } catch (error) {
    logger.warn('Document Intelligence health check failed:', error);
    status.documents = false;
  }

  // Always return 200 OK with current status
  res.status(200).json(status);
});

// Main status endpoint (mounted at /api/status/)
router.get('/', async (req: Request, res: Response) => {
  const status = {
    backend: true,
    vision: false,
    speech: false,
    documents: false,
    redis: false,
    openai: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check Redis connection
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.ping();
        status.redis = true;
      } catch (redisError) {
        logger.warn('Redis ping failed:', redisError);
        status.redis = false;
      }
    } else {
      status.redis = false;
    }
  } catch (error) {
    logger.warn('Redis health check failed:', error);
    status.redis = false;
  }

  // Check OpenAI connection
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    status.openai = true;
  }

  // Check Computer Vision
  if (process.env.AZURE_COMPUTER_VISION_ENDPOINT && process.env.AZURE_COMPUTER_VISION_KEY) {
    status.vision = true;
  }

  // Check Speech Services
  if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
    status.speech = true;
  }

  // Check Document Intelligence
  if (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY) {
    status.documents = true;
  }

  res.status(200).json(status);
});

export default router;