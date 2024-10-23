// File: server.js
const express = require('express');
const cluster = require('cluster');
const Redis = require('ioredis');
const Bull = require('bull');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Configuration
const REDIS_CONFIG = {
  host: 'localhost',
  port: 6379
};

// Create task queue
const taskQueue = new Bull('userTasks', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

// Rate limiter using Redis
class RateLimiter {
  constructor() {
    this.redis = new Redis(REDIS_CONFIG);
  }

  async checkRateLimit(userId) {
    const multi = this.redis.multi();
    const now = Date.now();
    const secondKey = `ratelimit:${userId}:second`;
    const minuteKey = `ratelimit:${userId}:minute`;

    // Check second limit
    multi.zremrangebyscore(secondKey, '-inf', now - 1000);
    multi.zcard(secondKey);
    multi.zadd(secondKey, now, `${now}-${Math.random()}`);
    multi.expire(secondKey, 2);

    // Check minute limit
    multi.zremrangebyscore(minuteKey, '-inf', now - 60000);
    multi.zcard(minuteKey);
    multi.zadd(minuteKey, now, `${now}-${Math.random()}`);
    multi.expire(minuteKey, 61);

    const results = await multi.exec();
    const secondCount = results[1][1];
    const minuteCount = results[5][1];

    return {
      allowedSecond: secondCount < 1,
      allowedMinute: minuteCount < 20
    };
  }
}

// Task processor
async function processTask(userId) {
  const timestamp = Date.now();
  const logMessage = `${userId}-task completed at-${timestamp}\n`;
  
  await fs.appendFile(
    path.join(__dirname, 'logs', 'tasks.log'),
    logMessage,
    'utf8'
  );
  
  console.log(logMessage.trim());
}

if (cluster.isMaster) {
  // Create log directory if it doesn't exist
  fs.mkdir(path.join(__dirname, 'logs')).catch(() => {});

  // Fork workers based on CPU cores
  const numCPUs = os.cpus().length;
  for (let i = 0; i < 2; i++) { // Two replica sets as per requirement
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.id} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();
  const rateLimiter = new RateLimiter();
  
  app.use(express.json());

  // Task queue processor
  taskQueue.process(async (job) => {
    await processTask(job.data.userId);
  });

  // API endpoint
  app.post('/task', async (req, res) => {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const rateLimit = await rateLimiter.checkRateLimit(user_id);
      const delay = !rateLimit.allowedSecond ? 1000 : 
                    !rateLimit.allowedMinute ? 60000 : 0;

      // Add task to queue with appropriate delay
      await taskQueue.add(
        { userId: user_id },
        { delay, jobId: `${user_id}-${Date.now()}` }
      );

      res.json({
        message: delay ? 
          `Task queued with ${delay}ms delay due to rate limit` : 
          'Task queued for immediate processing',
        user_id
      });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Error handling
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Worker ${cluster.worker.id} listening on port ${PORT}`);
  });
}