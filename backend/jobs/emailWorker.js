// /jobs/emailWorker.js

require('dotenv').config();
const { Worker } = require('bullmq');
const sendEmail = require('../utils/email');

const worker = new Worker(
  'email',
  async job => {
    await sendEmail(job.data);
  },
  {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379
    }
  }
);

worker.on('completed', job => {
  console.log(`✅ Email job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed`, err);
});
