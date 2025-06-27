// backend/src/services/redis.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export const initializeRedis = async (): Promise<Redis | null> => {
  try {
    if (!process.env.REDIS_URL) {
      logger.warn('Redis URL not configured, skipping Redis initialization');
      return null;
    }

    redisClient = new Redis(process.env.REDIS_URL, {
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000
    });

    // Test connection
    await redisClient.ping();
    logger.info('Redis connection established successfully');
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redisClient = null;
    return null;
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

// Cache utilities
export const setCache = async (key: string, value: any, ttl?: number): Promise<boolean> => {
  try {
    if (!redisClient) return false;
    
    const serializedValue = JSON.stringify(value);
    const defaultTtl = parseInt(process.env.CACHE_TTL || '7200');
    
    if (ttl || defaultTtl) {
      await redisClient.setex(key, ttl || defaultTtl, serializedValue);
    } else {
      await redisClient.set(key, serializedValue);
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to set cache:', error);
    return false;
  }
};

export const getCache = async (key: string): Promise<any | null> => {
  try {
    if (!redisClient) return null;
    
    const value = await redisClient.get(key);
    if (!value) return null;
    
    return JSON.parse(value);
  } catch (error) {
    logger.error('Failed to get cache:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<boolean> => {
  try {
    if (!redisClient) return false;
    
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Failed to delete cache:', error);
    return false;
  }
};

export const flushCache = async (): Promise<boolean> => {
  try {
    if (!redisClient) return false;
    
    await redisClient.flushdb();
    logger.info('Cache flushed successfully');
    return true;
  } catch (error) {
    logger.error('Failed to flush cache:', error);
    return false;
  }
};
