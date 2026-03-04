# Real-time Chat Application

Nền tảng giao tiếp trực tuyến với tính năng chat, gọi điện video/audio và khả năng mở rộng cao.

## 🚀 Công nghệ sử dụng

### Backend
- **NodeJS & Express**: REST API server
- **Socket.io**: Real-time bidirectional communication
- **MongoDB**: NoSQL database cho tin nhắn
- **Redis**: Caching và Pub/Sub (Level 4)
- **JWT**: Authentication
- **Multer**: File upload handling

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **Socket.io Client**: WebSocket client
- **Zustand**: State management
- **React Router**: Navigation
- **Axios**: HTTP client

### Infrastructure
- **Docker & Docker Compose**: Containerization
- **Nginx**: Load balancer & reverse proxy
- **WebRTC**: Peer-to-peer video/audio calls

## 📁 Cấu trúc dự án

```
chat-app/
├── server/              # Backend API
│   ├── src/
│   │   ├── config/      # Database, Redis config
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Route handlers
│   │   ├── middlewares/ # Auth, error handling
│   │   ├── socket/      # Socket.io handlers
│   │   ├── app.js       # Express app
│   │   └── server.js    # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── client/              # Frontend React app
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── store/       # Zustand stores
│   │   ├── utils/       # Helper functions
│   │   └── main.jsx     # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── nginx/
│   └── nginx.conf       # Load balancer config
│
└── docker-compose.yml   # Orchestration
```

## 🏗️ Cài đặt và Chạy

### Yêu cầu
- Docker & Docker Compose
- Node.js 20+ (nếu chạy local)

### Chạy với Docker (Recommended)

```bash
# Clone repository
git clone <your-repo-url>
cd chat-app

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services sẽ chạy tại:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Nginx: http://localhost:80
- MongoDB: localhost:27017
- Redis: localhost:6379

### Chạy Local (Development)

#### Backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your config
npm run dev
```

#### Frontend
```bash
cd client
npm install
npm run dev
```

## 🎯 Tính năng theo Level

### ✅ Level 1: MVP
- [x] Authentication (Register/Login với JWT)
- [x] Tìm kiếm người dùng
- [x] Gửi/Chấp nhận lời mời kết bạn
- [x] Chat 1-1 real-time
- [x] Lưu lịch sử tin nhắn
- [x] Hiển thị trạng thái tin nhắn

### 🔄 Level 2: Group & Multimedia
- [ ] Tạo nhóm chat
- [ ] Thêm/Xóa thành viên nhóm
- [ ] Gửi hình ảnh/file
- [ ] Preview file trước khi gửi
- [ ] Hiển thị Online/Offline
- [ ] "User is typing..." indicator

### 🎥 Level 3: WebRTC Calls
- [ ] Signaling server
- [ ] 1-on-1 Video call
- [ ] Audio call
- [ ] Bật/Tắt Mic/Camera
- [ ] Call notifications

### ⚡ Level 4: Scalability
- [x] Redis Adapter cho Socket.io
- [x] Nginx Load Balancer
- [x] Redis Caching
- [ ] Message Queue (Optional)
- [ ] Performance testing

## 🔧 Configuration

### Environment Variables (Backend)

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://admin:password123@mongodb:27017/chatapp?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

### Scaling Backend (Level 4)

Uncomment trong `docker-compose.yml`:

```yaml
backend:
  deploy:
    replicas: 3  # Chạy 3 instance
```

## 📊 Database Schema

### User
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  avatar: String,
  friends: [ObjectId],
  friendRequests: [{from: ObjectId, createdAt: Date}],
  isOnline: Boolean,
  lastSeen: Date
}
```

### Conversation
```javascript
{
  type: 'private' | 'group',
  name: String (for groups),
  participants: [ObjectId],
  admin: ObjectId (for groups),
  lastMessage: ObjectId,
  isActive: Boolean
}
```

### Message
```javascript
{
  conversation: ObjectId,
  sender: ObjectId,
  type: 'text' | 'image' | 'file' | 'system',
  content: String,
  fileUrl: String,
  readBy: [ObjectId],
  replyTo: ObjectId
}
```

## 🧪 Testing

```bash
# Backend tests
cd server
npm test

# Load testing
npm run test:load
```

## 📝 API Documentation

### Authentication
- POST `/api/auth/register` - Đăng ký
- POST `/api/auth/login` - Đăng nhập
- GET `/api/auth/me` - Lấy thông tin user

### Friends
- POST `/api/friends/request/:userId` - Gửi lời mời kết bạn
- POST `/api/friends/accept/:requestId` - Chấp nhận
- GET `/api/friends` - Danh sách bạn bè

### Conversations
- POST `/api/conversations` - Tạo chat 1-1
- POST `/api/conversations/group` - Tạo nhóm
- GET `/api/conversations` - Lấy danh sách

### Messages
- GET `/api/messages/:conversationId` - Lấy tin nhắn
- POST `/api/messages/upload` - Upload file

## 🎨 Screenshots

(Thêm screenshots của ứng dụng)

## 👥 Contributors

- Your Name
- Team Members

## 📄 License

MIT License
