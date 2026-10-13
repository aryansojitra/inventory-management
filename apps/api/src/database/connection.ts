import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDatabase(): Promise<boolean> {
  try {
    const maskedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@');
    const isAtlas = config.mongoUri.includes('mongodb.net') || config.mongoUri.startsWith('mongodb+srv://');
    console.log(`Connecting to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'} at: ${maskedUri}...`);

    await mongoose.connect(config.mongoUri, {
      dbName: config.mongoDbName || 'dept_inventory',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    const { host, port, name } = mongoose.connection;
    console.log(`✅ MongoDB Connected successfully to database "${name}" on ${host}${port ? `:${port}` : ''}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:');
    console.error(`   Error name: ${error.name || 'Error'}`);
    console.error(`   Message   : ${error.message}`);
    
    if (config.mongoUri.includes('mongodb.net') || config.mongoUri.startsWith('mongodb+srv://')) {
      console.info('\n💡 MongoDB Atlas Troubleshooting:');
      console.info('   1. Check IP Whitelist: Go to MongoDB Atlas -> "Network Access" -> ensure your current IP or 0.0.0.0/0 is added.');
      console.info('   2. Check Cluster Status: In MongoDB Atlas Dashboard, make sure your cluster is ACTIVE (free M0 clusters pause after inactivity; click "Resume").');
      console.info('   3. Check Credentials: Ensure the username and password in MONGODB_URI are correct in Atlas -> "Database Access".');
      console.info('   4. Check Connection String: Atlas -> "Clusters" -> Click "Connect" -> "Drivers" -> Node.js -> Copy connection string (format: mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority).\n');
    } else {
      console.info('\n💡 Local MongoDB Guidance:');
      console.info('   1. Ensure mongod daemon is running on 127.0.0.1:27017.');
      console.info('   2. Or set MONGODB_URI in .env to your MongoDB Atlas connection string.\n');
    }
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB runtime error:', err);
});
