const fs = require('fs');
const { config, validateConfig } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');

async function start() {
  validateConfig();

  fs.mkdirSync(config.invoicesDir, { recursive: true });

  await connectDB();

  const app = createApp();
  const server = app.listen(config.port, () => {
    /* eslint-disable no-console */
    console.log(`\n  ${config.business.name} backend running`);
    console.log(`   Environment : ${config.env}`);
    console.log(`   API         : http://localhost:${config.port}/api`);
    console.log(`   Health      : http://localhost:${config.port}/api/health`);
    console.log(`   CORS allows : ${config.frontendUrls.join(', ')}\n`);
    /* eslint-enable no-console */
  });

  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled promise rejection:', reason);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\n  Failed to start server:', err.message, '\n');
  process.exit(1);
});
