import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${config.mongoUri}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
