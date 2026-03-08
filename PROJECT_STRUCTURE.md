# 📂 Cấu trúc Dự án Chi tiết

## 🎯 Tổng quan

Dự án được chia thành 3 phần chính:
1. **Backend** (NodeJS + Express + Socket.io)
2. **Frontend** (React + Vite)
3. **Infrastructure** (Docker + Nginx + MongoDB + Redis)

---

## 📁 Chi tiết Cấu trúc

```
chat-app/
│
├── 📄 docker-compose.yml          # Orchestration file - định nghĩa tất cả services
├── 📄 README.md                   # Documentation chính
├── 📄 SETUP_GUIDE.md             # Hướng dẫn setup chi tiết
├── 📄 .gitignore                 # Git ignore rules
│
├── 📂 server/                    # BACKEND
│   ├── 📂 src/
│   │   ├── 📂 config/           # Cấu hình
│   │   │   ├── database.js      # MongoDB connection
│   │   │   └── redis.js         # Redis client & cache helpers
│   │   │   └── email.js         # Redis client & cache helpers
│   │   │
│   │   ├── 📂 models/           # Database schemas (Mongoose)
│   │   │   ├── user.model.js    # User schema + methods
│   │   │   ├── conversation.model.js  # Chat conversations
│   │   │   └── message.model.js # Messages
│   │   │
│   │   ├── 📂 routes/           # API endpoints
│   │   │   ├── auth.route.js    # /api/auth/*
│   │   │   ├── user.route.js    # /api/users/*
│   │   │   ├── friend.route.js  # /api/friends/*
│   │   │   ├── conversation.route.js  # /api/conversations/*
│   │   │   └── message.route.js # /api/messages/*
│   │   │
│   │   ├── 📂 controllers/      # Business logic
│   │   │   ├── auth.controller.js      # Register, Login, Profile
│   │   │   ├── user.controller.js      # Search users, Get user
│   │   │   ├── friend.controller.js    # Friend requests, Accept/Reject
│   │   │   ├── conversation.controller.js  # Create chat, Groups
│   │   │   └── message.controller.js   # Get messages, Upload files
│   │   │
│   │   ├── 📂 middlewares/      # Express middlewares
│   │   │   └── auth.middleware.js  # JWT verification
│   │   │
│   │   ├── 📂 socket/           # Socket.io handlers
│   │   │   ├── index.js         # Socket.io setup + Redis Adapter
│   │   │   ├── messageHandler.js    # Real-time messaging
│   │   │   ├── presenceHandler.js   # Online/Offline status
│   │   │   └── callHandler.js   # WebRTC signaling (Level 3)
│   │   │
│   │   ├── 📄 app.js            # Express app setup
│   │   └── 📄 server.js         # Entry point
│   │
│   ├── 📂 uploads/              # Uploaded files storage
│   ├── 📄 Dockerfile            # Backend container definition
│   ├── 📄 package.json          # Dependencies
│   ├── 📄 .env                  # Environment variables
│   └── 📄 .env.example          # Environment template
│
├── 📂 client/                   # FRONTEND
│   ├── 📂 src/
│   │   ├── 📂 pages/           # Page components
│   │   │   ├── Login.jsx       # Login page
│   │   │   ├── Register.jsx    # Registration page
│   │   │   ├── Dashboard.jsx     
│   │   │   ├── Friends.jsx   
│   │   │   ├── Profile.jsx     
│   │   │   ├── SearchUsers.jsx  
│   │   │   └── Chat.jsx        # Main chat interface
│   │   │
│   │   ├── 📂 components/      # Reusable components (TBD)
│   │   │   └── CallManager.jsx
│   │   │   └── Sidebar.jsx
│   │   │
│   │   ├── 📂 hooks/           # Custom React hooks
│   │   │   └── useSocket.js    # Socket.io connection hook
│   │   │
│   │   ├── 📂 store/           # State management (Zustand)
│   │   │   └── authStore.js    # Authentication state
│   │   │
│   │   ├── 📂 utils/           # Helper functions (TBD)
│   │   │
│   │   ├── 📄 App.jsx          # Main app component + routing
│   │   ├── 📄 main.jsx         # React entry point
│   │   └── 📄 index.css        # Global styles (Tailwind)
│   │
│   ├── 📄 index.html           # HTML template
│   ├── 📄 vite.config.js       # Vite build config
│   ├── 📄 tailwind.config.js   # Tailwind CSS config
│   ├── 📄 postcss.config.js    # PostCSS config
│   ├── 📄 Dockerfile           # Frontend container (build + nginx)
│   ├── 📄 nginx.conf           # Nginx config for SPA
│   ├── 📄 package.json         # Dependencies
│   └── 📄 .env                 # Environment variables
│
└── 📂 nginx/                    # LOAD BALANCER
    └── 📄 nginx.conf           # Reverse proxy & load balancer config
```

---

## 🔑 File Chức năng Quan trọng

### Backend Core Files

#### 1. `server/src/server.js`
- Entry point của backend
- Khởi tạo HTTP server
- Connect MongoDB
- Initialize Socket.io

#### 2. `server/src/app.js`
- Setup Express app
- Middlewares (CORS, JSON, Morgan)
- Route registration
- Error handling

#### 3. `server/src/socket/index.js`
- Khởi tạo Socket.io server
- Redis Adapter cho scaling (Level 4)
- JWT authentication cho socket
- Event handler registration

#### 4. `server/src/config/redis.js`
- Redis client connection
- Cache helpers: `cacheSet()`, `cacheGet()`, `cacheDel()`
- Sử dụng trong auth middleware và controllers

### Frontend Core Files

#### 1. `client/src/main.jsx`
- React entry point
- Render App component

#### 2. `client/src/App.jsx`
- Router setup (React Router)
- Protected routes
- Authentication checks

#### 3. `client/src/hooks/useSocket.js`
- Custom hook quản lý Socket.io connection
- Auto-connect khi user login
- Emit user_online event

#### 4. `client/src/store/authStore.js`
- Zustand store cho authentication
- Login/Register/Logout functions
- Persist state to localStorage

### Infrastructure Files

#### 1. `docker-compose.yml`
Services được định nghĩa:
- **mongodb**: Database
- **redis**: Cache & Pub/Sub
- **backend**: API server (có thể scale)
- **frontend**: React app (nginx serve)
- **nginx**: Load balancer

#### 2. `nginx/nginx.conf`
- Reverse proxy cho backend API
- WebSocket proxy với sticky sessions (ip_hash)
- Load balancing giữa nhiều backend instances
- Serve static files

---

## 🔄 Luồng Dữ liệu

### 1. Authentication Flow
```
User (Browser)
    ↓
    → POST /api/auth/login
    ↓
Auth Controller
    ↓
    → Verify credentials (bcrypt)
    → Generate JWT token
    ↓
Response with token
    ↓
Frontend stores token
    ↓
All subsequent requests include:
    Authorization: Bearer {token}
```

### 2. Real-time Messaging Flow
```
User A sends message
    ↓
Socket.io Client emits 'send_message'
    ↓
Backend messageHandler receives event
    ↓
Save to MongoDB
    ↓
Emit to conversation room
    ↓
    ├─→ User A receives (confirmation)
    └─→ User B receives (new message)
```

### 3. Scaling with Redis (Level 4)
```
User A → Server 1 (Socket.io)
                ↓
             Redis Pub/Sub
                ↓
User B → Server 2 (Socket.io)

Message từ Server 1 được publish lên Redis,
Redis broadcast tới tất cả servers,
Server 2 nhận và emit tới User B
```

---

## 🎯 Tính năng đã Implement

### ✅ Level 1 - HOÀN THÀNH
- [x] User registration & login (JWT)
- [x] Search users
- [x] Friend request system (send/accept/reject)
- [x] Private chat (1-1)
- [x] Real-time messaging
- [x] Message history (MongoDB)
- [x] Message read status

### 🔄 Level 2 - CẦN BỔ SUNG
- [x] Group chat (backend ready)
- [ ] File/Image upload (route ready, need frontend)
- [ ] Online/Offline status (backend ready)
- [ ] Typing indicator (backend ready)

### ⏳ Level 3 - CHỜ IMPLEMENT
- [x] WebRTC signaling (backend ready)
- [ ] Video call UI
- [ ] Audio call UI

### ✅ Level 4 - ĐÃ SETUP
- [x] Redis Adapter
- [x] Nginx Load Balancer
- [x] Redis Caching
- [ ] Performance testing

---

## 📦 Dependencies Chính

### Backend
- `express`: Web framework
- `socket.io`: Real-time communication
- `mongoose`: MongoDB ODM
- `redis`: Caching & Pub/Sub
- `jsonwebtoken`: JWT authentication
- `bcryptjs`: Password hashing
- `multer`: File uploads
- `@socket.io/redis-adapter`: Socket.io scaling

### Frontend
- `react`: UI library
- `react-router-dom`: Routing
- `socket.io-client`: WebSocket client
- `zustand`: State management
- `axios`: HTTP client
- `tailwindcss`: Styling
- `react-hot-toast`: Notifications
- `lucide-react`: Icons

---

## 🚀 Cách Mở rộng Dự án

### Thêm Feature mới

1. **Backend**:
   ```
   1. Tạo model (nếu cần) trong src/models/
   2. Tạo route trong src/routes/
   3. Tạo controller trong src/controllers/
   4. Register route trong src/app.js
   5. (Optional) Thêm socket handler trong src/socket/
   ```

2. **Frontend**:
   ```
   1. Tạo component trong src/components/
   2. Tạo page (nếu cần) trong src/pages/
   3. Thêm route trong src/App.jsx
   4. Tạo store (nếu cần) trong src/store/
   ```

### Example: Thêm Notification Feature

**Backend**:
```javascript
// src/models/notification.model.js
// src/routes/notification.route.js
// src/controllers/notification.controller.js
// src/socket/notificationHandler.js
```

**Frontend**:
```javascript
// src/components/NotificationBell.jsx
// src/store/notificationStore.js
```

---

## 🔧 Environment Variables

### Backend (.env)
```env
NODE_ENV=development|production
PORT=5000
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=your-secret
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📊 Database Collections

### users
- Lưu thông tin user
- Friends list
- Friend requests
- Online status

### conversations
- Private chats (2 participants)
- Group chats (3+ participants)
- Last message reference

### messages
- Text messages
- File/Image messages
- System messages
- Read receipts

---

## 🎓 Best Practices được Apply

1. **Modular Architecture**: Tách rời routes, controllers, models
2. **Environment Variables**: Không hard-code sensitive data
3. **Error Handling**: Try-catch blocks, error middleware
4. **Security**: JWT auth, password hashing, CORS
5. **Scalability**: Redis adapter, load balancing ready
6. **Code Organization**: Clear folder structure
7. **Docker**: Containerized services
8. **Documentation**: README, comments, setup guide

---

## 🔜 Next Steps để Hoàn thiện

### Immediate (Level 2)
1. Implement file upload UI
2. Add typing indicator UI
3. Show online/offline status in UI
4. Create group chat UI

### Advanced (Level 3)
1. Implement WebRTC connection logic
2. Create video call UI
3. Handle call notifications
4. Add call history

### Production Ready
1. Add unit tests
2. Add E2E tests
3. Implement rate limiting
4. Add input validation/sanitization
5. Setup CI/CD pipeline
6. Add monitoring (PM2, logs)
7. SSL certificates
8. Database backups
