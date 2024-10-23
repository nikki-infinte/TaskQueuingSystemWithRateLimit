# TaskQueuingSystemWithRateLimit

A highly scalable Node.js microservice that implements a sophisticated task queuing system with user-based rate limiting. Built with Express, Redis, and Bull Queue for robust task processing across multiple cluster instances.

## 🚀 Key Features

### Advanced Rate Limiting
- Per-user rate limiting: 1 request/second and 20 requests/minute
- Redis-based distributed rate limiting
- Zero request drops with intelligent queuing

### Scalable Architecture
- Multi-cluster setup with 2 replica sets
- Redis-powered cross-cluster communication
- Bull Queue for reliable task management

### Robust Error Handling
- Automatic job retries with exponential backoff
- Graceful failure recovery
- Comprehensive error logging

## 🛠️ Technical Stack
- Node.js
- Express.js
- Redis
- Bull Queue
- Cluster API

## 📋 Prerequisites
- Node.js (v14+ recommended)
- Redis Server
- NPM or Yarn

## ⚙️ Installation

### Clone the repository:
```bash
    git clone https://github.com/yourusername/nodejs-task-queue.git
    cd nodejs-task-queue

```
Configure Redis:
```bash
# Start Redis server
redis-server
```
# Verify Redis connection
```
redis-cli ping
```
Setup environment:
# Create logs directory
```
mkdir logs
```
# Create environment file
```
touch .env
   Add the following to your .env file:
envCopyPORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```
🚀 Usage
Start the server:
bashCopynpm start
```
Process a task:
curl -X POST 'http://localhost:3000/task' \
-H 'Content-Type: application/json' \
-d '{
    "user_id": "123"
}'
Sample Responses:
Success:
{
  "message": "Task queued for immediate processing",
  "user_id": "123"
}
Rate Limited:
{
  "message": "Task queued with 1000ms delay due to rate limit",
  "user_id": "123"
}
```

## 📊 Project Structure

 ├── server.js # Main application file ├── logs/ # Task execution logs │ └── tasks.log # Task logs ├── package.json # Dependencies ├── .env # Environment variables └── README.md #
