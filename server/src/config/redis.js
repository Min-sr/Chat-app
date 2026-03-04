import { createClient } from 'redis';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Client Connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Redis Connection Error:', error);
    return null;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

// Cache helper functions
export const cacheSet = async (key, value, expirationInSeconds = 3600) => {
  try {
    const client = getRedisClient();
    await client.setEx(key, expirationInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

export const cacheGet = async (key) => {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

export const cacheDel = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};
