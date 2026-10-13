import { connectDatabase } from './database/connection';
import { config } from './config';
import app from './app';

async function start() {
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`🚀 API running at http://localhost:${config.port}/api/v1`);
    console.log(`   Environment : ${config.env}`);
    console.log(`   MongoDB     : ${config.mongoUri}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n⛔ Shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
