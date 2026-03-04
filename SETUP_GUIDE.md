# 📘 Hướng dẫn Cài đặt và Triển khai Chi tiết

## 🎯 Mục lục
1. [Cài đặt môi trường](#cài-đặt-môi-trường)
2. [Chạy ứng dụng](#chạy-ứng-dụng)
3. [Testing](#testing)
4. [Scaling (Level 4)](#scaling-level-4)
5. [Troubleshooting](#troubleshooting)

---

## 1️⃣ Cài đặt Môi trường

### A. Cài đặt Docker & Docker Compose

#### Windows/Mac
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop
3. Kiểm tra:
```bash
docker --version
docker-compose --version
```

#### Linux (Ubuntu)
```bash
# Update packages
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker-compose --version
```

### B. Clone Project
```bash
git clone <repository-url>
cd chat-app
```

---

## 2️⃣ Chạy Ứng dụng

### Option 1: Docker Compose (RECOMMENDED)

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Stop and remove volumes (clean restart)
docker-compose down -v
```

**Services URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

### Option 2: Local Development

#### Backend
```bash
cd server

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env file with your configurations

# Start MongoDB (if not using Docker)
# Download: https://www.mongodb.com/try/download/community

# Start Redis (if not using Docker)
# Download: https://redis.io/download

# Run in development mode
npm run dev
```

#### Frontend
```bash
cd client

# Install dependencies
npm install

# Setup environment
# Create .env file:
echo "VITE_API_URL=http://localhost:5000/api" > .env
echo "VITE_SOCKET_URL=http://localhost:5000" >> .env

# Run development server
npm run dev
```

---

## 3️⃣ Testing

### Tạo Test Users

```bash
# Use API or register through UI
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "email": "user1@test.com",
    "password": "password123"
  }'

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user2",
    "email": "user2@test.com",
    "password": "password123"
  }'
```

### Test Socket.io Connection

```javascript
// Open browser console on http://localhost:3000
// Login first, then check:
console.log('Socket connected:', window.socket?.connected);
```

### Test Features Checklist

**Level 1:**
- [ ] Register new user
- [ ] Login existing user
- [ ] Search for users
- [ ] Send friend request
- [ ] Accept friend request
- [ ] Start private chat
- [ ] Send text message
- [ ] Receive message in real-time
- [ ] View message history

**Level 2:**
- [ ] Create group chat
- [ ] Add members to group
- [ ] Upload image
- [ ] Upload file
- [ ] See online/offline status
- [ ] See typing indicator

**Level 3:**
- [ ] Initiate video call
- [ ] Accept/Reject call
- [ ] Toggle video on/off
- [ ] Toggle audio on/off
- [ ] End call

---

## 4️⃣ Scaling (Level 4)

### A. Enable Redis Adapter

Redis adapter đã được tích hợp sẵn trong `src/socket/index.js`. 
Khi chạy với Docker Compose, Redis sẽ tự động được sử dụng.

### B. Scale Backend Instances

#### Method 1: Docker Compose Scale
```bash
# Edit docker-compose.yml
# Uncomment the deploy section:
# backend:
#   deploy:
#     replicas: 3

# Rebuild and start
docker-compose up -d --scale backend=3
```

#### Method 2: Manual Scaling
```bash
# Start multiple backend containers
docker-compose up -d
docker-compose up -d --scale backend=3
```

### C. Nginx Load Balancing

Nginx đã được cấu hình sẵn để:
- Phân phối HTTP requests đều giữa các backend instances
- Sử dụng `ip_hash` cho WebSocket connections (sticky sessions)
- Health checks

Verify load balancing:
```bash
# Check nginx logs
docker-compose logs nginx

# You should see requests distributed across backends
```

### D. Monitor Performance

```bash
# Monitor container resources
docker stats

# Check Redis
docker exec -it chat-redis redis-cli
> PING
> INFO stats
> MONITOR  # Watch real-time commands
```

### E. Performance Testing

```bash
# Install Apache Bench (if needed)
sudo apt install apache2-utils

# Load test API
ab -n 1000 -c 100 http://localhost/api/auth/me

# Install socket.io-client for WebSocket testing
npm install -g socket.io-client artillery

# Create artillery test config (artillery.yml):
config:
  target: 'http://localhost'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "WebSocket Connection"
    engine: socketio
    flow:
      - emit:
          channel: "user_online"

# Run test
artillery run artillery.yml
```

---

## 5️⃣ Troubleshooting

### Common Issues

#### 1. Port already in use
```bash
# Find and kill process using port
lsof -ti:5000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:80 | xargs kill -9    # Nginx
```

#### 2. Docker permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker
```

#### 3. MongoDB connection failed
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

#### 4. Socket.io not connecting
- Check browser console for errors
- Verify CORS settings in backend
- Check if backend is running: http://localhost:5000/health
- Verify environment variables in frontend `.env`

#### 5. Redis connection failed
```bash
# Check Redis
docker-compose ps redis

# Test connection
docker exec -it chat-redis redis-cli ping
```

#### 6. File upload not working
```bash
# Check uploads directory exists
ls -la server/uploads

# Check permissions
chmod 777 server/uploads
```

### Debug Mode

```bash
# Backend debug logs
# In server/.env, set:
NODE_ENV=development

# Frontend debug
# Open browser DevTools > Console
# Check Network tab for WebSocket connection
```

### View Database

```bash
# Connect to MongoDB
docker exec -it chat-mongodb mongosh -u admin -p password123

# Use database
use chatapp

# View collections
show collections

# Query users
db.users.find().pretty()

# Query messages
db.messages.find().limit(10).pretty()
```

---

## 📊 Monitoring & Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
docker-compose logs -f mongodb
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Container Shell Access
```bash
# Backend container
docker exec -it chat-backend sh

# Frontend container
docker exec -it chat-frontend sh

# MongoDB shell
docker exec -it chat-mongodb mongosh -u admin -p password123
```

---

## 🎓 Next Steps

1. **Implement Level 2 features**: Groups, file uploads, presence
2. **Add WebRTC for Level 3**: Video/Audio calls
3. **Optimize for Level 4**: Load testing, caching strategies
4. **Security**: Rate limiting, input validation, XSS protection
5. **UI/UX**: Improve design, add animations, mobile responsive
6. **Testing**: Unit tests, integration tests, E2E tests

---

## 📚 Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Documentation](https://docs.docker.com/)
- [React Documentation](https://react.dev/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

## 💬 Support

Nếu gặp vấn đề:
1. Check logs: `docker-compose logs -f`
2. Check documentation
3. Search existing issues
4. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
