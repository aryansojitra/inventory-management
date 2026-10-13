import mongoose from 'mongoose';
import { config } from '../src/config';

async function checkConnection() {
  const maskedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@');
  console.log(`\n🔍 Testing MongoDB connection...`);
  console.log(`   URI     : ${maskedUri}`);
  console.log(`   Database: ${config.mongoDbName}\n`);

  try {
    const startTime = Date.now();
    await mongoose.connect(config.mongoUri, {
      dbName: config.mongoDbName,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    const latency = Date.now() - startTime;

    const { host, port, name } = mongoose.connection;
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`   Host    : ${host}${port ? `:${port}` : ''}`);
    console.log(`   Database: ${name}`);
    console.log(`   Latency : ${latency}ms`);

    // List collections
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`   Existing Collections (${collections.length}):`, collections.map((c) => c.name).join(', ') || '(none yet - run npm run seed)');
    }

    await mongoose.disconnect();
    console.log(`\n🎉 Connection verified! You can now run "npm run seed" to populate real data.\n`);
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ MongoDB Connection Failed!`);
    console.error(`   Error Name   : ${err.name}`);
    console.error(`   Error Message: ${err.message}\n`);

    if (err.message && err.message.includes('ENOTFOUND')) {
      console.error(`📋 Root Cause: DNS host lookup failed (ENOTFOUND).`);
      console.error(`   Why this happens on MongoDB Atlas:`);
      console.error(`   1. Your Atlas cluster is PAUSED: Free (M0) clusters pause after inactivity, de-registering their DNS.`);
      console.error(`      -> Fix: Go to https://cloud.mongodb.com and click "Resume" on your cluster.`);
      console.error(`   2. The cluster was deleted or the URL is from an old project.`);
      console.error(`      -> Fix: In Atlas, click "Connect" -> "Drivers" -> copy the latest connection string.`);
    } else if (err.message && err.message.includes('whitelisted')) {
      console.error(`📋 Root Cause: IP address is not whitelisted in MongoDB Atlas.`);
      console.error(`   -> Fix: Go to Atlas -> Security -> Network Access -> Add IP Address -> Add Current IP or 0.0.0.0/0 (allow from anywhere).`);
    } else if (err.message && (err.message.includes('Authentication failed') || err.message.includes('bad auth'))) {
      console.error(`📋 Root Cause: Invalid Atlas username or password.`);
      console.error(`   -> Fix: Go to Atlas -> Security -> Database Access -> verify or reset your database user password.`);
    }

    process.exit(1);
  }
}

checkConnection();
