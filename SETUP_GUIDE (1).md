# 📘 Hướng dẫn Cài đặt & Triển khai
**Chat App — Docker + MongoDB + Redis + Nginx**

---

## Mục lục
1. [Cài đặt Môi trường](#1-cài-đặt-môi-trường)
2. [Chạy Ứng dụng](#2-chạy-ứng-dụng)
3. [Quản lý MongoDB](#3-quản-lý-mongodb)
4. [Testing](#4-testing)
5. [Scaling (Level 4)](#5-scaling-level-4)
6. [Troubleshooting](#6-troubleshooting)
7. [Logs & Monitoring](#7-logs--monitoring)

---

## 1. Cài đặt Môi trường

### A. Cài đặt Docker & Docker Compose

#### Windows / Mac
1. Download Docker Desktop tại: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop
3. Kiểm tra:
```bash
docker --version
docker-compose --version
```

#### Linux (Ubuntu)
```bash
sudo apt update
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker-compose --version
```

---

### B. Cài đặt MongoDB Shell (mongosh)

`mongosh` là công cụ dòng lệnh để tương tác trực tiếp với MongoDB, kiểm tra và quản lý data.

#### Windows
1. Truy cập: https://www.mongodb.com/try/download/shell
2. Chọn phiên bản mới nhất → Platform: Windows → Download
3. Giải nén và thêm vào PATH, hoặc dùng MongoDB Compass (đã tích hợp sẵn mongosh)
4. Kiểm tra:
```bash
mongosh --version
```

#### Mac
```bash
brew install mongosh
```

#### Linux
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo 'deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-mongosh
```

---

### C. Cài đặt MongoDB Compass (GUI)

1. Download tại: https://www.mongodb.com/try/download/compass
2. Cài đặt theo hướng dẫn của hệ điều hành
3. Mở Compass sau khi cài xong

---

### D. Clone Project
```bash
git clone <repository-url>
cd chat-app
```

---

## 2. Chạy Ứng dụng

### Docker Compose (RECOMMENDED)
```bash
# Khởi động tất cả services
docker compose up -d --build

# Kiểm tra trạng thái
docker ps

# Xem logs
docker compose logs -f backend
docker compose logs -f frontend

# Dừng services
docker compose down

# Dừng và xóa volumes (reset hoàn toàn)
docker compose down -v
```

**URLs sau khi chạy:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Qua Nginx: http://localhost

---

### Chạy Local Development (không dùng Docker)

#### Backend
```bash
cd server
npm install
cp .env.example .env
# Chỉnh sửa file .env
npm run dev
```

#### Frontend
```bash
cd client
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env
echo "VITE_SOCKET_URL=http://localhost:5000" >> .env
npm run dev
```

---

## 3. Quản lý MongoDB

### A. Kết nối MongoDB Compass

#### Trường hợp 1: MongoDB chạy trong Docker (có auth)

Dùng connection string sau trong Compass:
```
mongodb://admin:password123@127.0.0.1:27017/chatapp?authSource=admin&directConnection=true
```

**Các bước thực hiện:**
1. Mở MongoDB Compass
2. Click nút **+** (New Connection) ở góc trên bên trái
3. Bật toggle **"Edit Connection String"**
4. Paste connection string vào ô URI
5. Click **"Save & Connect"**
6. Chọn database `chatapp` → collection `users` để xem data

> ⚠️ **Nếu bị lỗi Authentication failed:** chạy `docker compose down -v` rồi `docker compose up -d --build` để reset MongoDB và tạo lại user admin.

---

#### Trường hợp 2: MongoDB local (không có auth)

Nếu bạn cài MongoDB trực tiếp trên máy, dùng:
```
mongodb://localhost:27017
```

> ⚠️ **Lưu ý conflict:** Nếu cả MongoDB local và MongoDB Docker cùng chạy trên port 27017 sẽ bị xung đột. Nên stop MongoDB local khi dùng Docker.

**Stop MongoDB local trên Windows:**
1. Nhấn `Windows + R` → gõ `services.msc` → Enter
2. Tìm **"MongoDB"** trong danh sách
3. Click chuột phải → **Stop**

---

### B. Kết nối bằng mongosh (dòng lệnh)

```bash
# Kết nối từ máy host
mongosh "mongodb://admin:password123@localhost:27017/chatapp?authSource=admin"

# Hoặc kết nối thẳng vào container Docker
docker exec -it chat-mongodb mongosh -u admin -p password123 --authenticationDatabase admin chatapp
```

---

### C. Tạo Admin User cho MongoDB

**Bước 1:** Kết nối vào MongoDB container:
```bash
docker exec -it chat-mongodb mongosh -u admin -p password123 --authenticationDatabase admin
```

**Bước 2:** Tạo admin user mới:
```javascript
use admin
db.createUser({
  user: 'newadmin',
  pwd: 'newpassword',
  roles: [{ role: 'userAdminAnyDatabase', db: 'admin' }, 'readWriteAnyDatabase']
})
```

**Bước 3 (tuỳ chọn):** Tạo user chỉ có quyền đọc/ghi database chatapp:
```javascript
use chatapp
db.createUser({
  user: 'chatuser',
  pwd: 'chatpassword',
  roles: [{ role: 'readWrite', db: 'chatapp' }]
})
```

---

### D. Kiểm tra Database

Sau khi kết nối bằng mongosh, dùng các lệnh sau:

```javascript
// Xem tất cả databases
show dbs

// Chuyển sang database chatapp
use chatapp

// Xem tất cả collections
show collections

// Xem tất cả users
db.users.find().pretty()

// Đếm số users
db.users.countDocuments()

// Xem 10 messages gần nhất
db.messages.find().sort({ createdAt: -1 }).limit(10).pretty()

// Tìm user theo email
db.users.findOne({ email: "example@gmail.com" })

// Xem conversations
db.conversations.find().pretty()
```

---

### E. Cập nhật Data (thủ công)

```javascript
// Verify tất cả users (khi thêm email verification mới)
db.users.updateMany({}, { $set: { isVerified: true } })

// Reset trạng thái online
db.users.updateMany({}, { $set: { isOnline: false } })

// Xóa user theo email
db.users.deleteOne({ email: "test@example.com" })

// Xóa toàn bộ messages trong 1 conversation
db.messages.deleteMany({ conversationId: ObjectId("...") })
```

---

### F. Refresh Data trong Compass

Khi có data mới (ví dụ người dùng vừa đăng ký), Compass không tự cập nhật. Cần refresh thủ công:

1. Nhìn vào góc trên bên phải của bảng Documents
2. Click icon **🔄** (refresh) để tải lại data
3. Hoặc click nút **Find** để chạy lại query hiện tại

> 💡 **Tip:** Sau khi click vào collection ở sidebar, nhấn **Find** để refresh data mới nhất.

---

## 4. Testing

### Tạo Test Users qua API
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "email": "user1@test.com", "password": "password123"}'

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user2", "email": "user2@test.com", "password": "password123"}'
```

### Test Features Checklist

**Level 1 — Cơ bản:**
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập
- [ ] Tìm kiếm người dùng
- [ ] Gửi lời mời kết bạn
- [ ] Chấp nhận / từ chối lời mời
- [ ] Bắt đầu chat riêng tư
- [ ] Gửi tin nhắn text
- [ ] Nhận tin nhắn real-time
- [ ] Xem lịch sử tin nhắn

**Level 2 — Nâng cao:**
- [ ] Tạo group chat
- [ ] Thêm thành viên vào group
- [ ] Upload ảnh / file
- [ ] Xem trạng thái online/offline
- [ ] Typing indicator

**Level 3 — Video/Audio:**
- [ ] Khởi tạo video call
- [ ] Chấp nhận / từ chối call
- [ ] Bật/tắt video, audio
- [ ] Kết thúc call

---

## 5. Scaling (Level 4)

### Scale Backend Instances
```bash
# Scale lên 3 backend instances
docker compose up -d --scale backend=3

# Kiểm tra các instances
docker ps | grep backend
```

### Monitor Performance
```bash
# Xem resource usage của tất cả containers
docker stats

# Kiểm tra Redis
docker exec -it chat-redis redis-cli
PING
INFO stats
```

---

## 6. Troubleshooting

### Port đã bị chiếm
```bash
# Windows — tìm process chiếm port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Backend restart liên tục
```bash
docker logs chat-backend --tail 50
```

**Nguyên nhân thường gặp:**
- Volume mount `./server:/app` trong docker-compose đè lên code trong container → xóa volume đó đi
- Biến môi trường chưa đúng (`MONGODB_URI`, `REDIS_URL`)
- Port bị conflict

### MongoDB Authentication Failed
```bash
# Reset hoàn toàn MongoDB (xóa hết data!)
docker compose down -v
docker compose up -d --build
```
> ⚠️ Lệnh `down -v` sẽ xóa toàn bộ data. Chỉ dùng khi cần reset hoàn toàn.

### Container không start
```bash
# Xem log tất cả services
docker compose logs --tail 20

# Xem log service cụ thể
docker compose logs backend --tail 30

# Rebuild từ đầu
docker compose down --remove-orphans
docker compose up -d --build
```

### Redis không kết nối được
```bash
docker exec -it chat-redis redis-cli ping
# Kết quả đúng: PONG
```

### Xem Database nhanh từ dòng lệnh
```bash
docker exec chat-mongodb mongosh -u admin -p password123 \
  --authenticationDatabase admin chatapp \
  --eval "db.users.find().pretty()"
```

---

## 7. Logs & Monitoring

### Xem Logs
```bash
# Tất cả services
docker compose logs -f

# Từng service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f mongodb
docker compose logs -f redis

# 100 dòng cuối
docker compose logs --tail=100 backend
```

### Truy cập Shell Container
```bash
# Backend container
docker exec -it chat-backend sh

# Frontend container
docker exec -it chat-frontend sh

# MongoDB shell
docker exec -it chat-mongodb mongosh -u admin -p password123
```

---

*Chat App Setup Guide — Cập nhật: 03/2026*
