import mongoose from 'mongoose';
import { config } from '../config';

export let isMemoryMode = false;

export async function connectDatabase(): Promise<boolean> {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    console.log('✅ MongoDB connected');
    isMemoryMode = false;
    return true;
  } catch (error) {
    console.warn('⚠️  Could not connect to external MongoDB cluster.');
    console.log('🚀 Activating In-Memory Store with pre-loaded demo seed data.');
    isMemoryMode = true;
    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  if (!isMemoryMode) console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  if (!isMemoryMode) console.error('MongoDB error:', err);
});
