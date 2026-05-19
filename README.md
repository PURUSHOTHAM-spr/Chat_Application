# 💬 WhatsApp Clone — Full-Stack Real-Time Messaging

A production-ready WhatsApp clone built with React, Node.js, Socket.IO, and MongoDB.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Node](https://img.shields.io/badge/Node.js-20-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black) ![MongoDB](https://img.shields.io/badge/MongoDB-8-darkgreen)

## ✨ Features

- **Real-time Messaging** — Instant message delivery via Socket.IO
- **Group Chats** — Create groups, add/remove members
- **Typing Indicators** — See when someone is typing
- **Read Receipts** — Double-tick (✓✓) with blue for read
- **Online/Offline Status** — Real-time presence tracking
- **Last Seen** — Know when a contact was last active
- **Image & File Sharing** — Upload via Cloudinary
- **Emoji Picker** — Full emoji support
- **Message Deletion** — Delete your own messages
- **Dark/Light Mode** — Theme toggle with persistence
- **Profile Management** — Edit name, about, and avatar
- **Notifications** — In-app notification panel
- **Infinite Scroll** — Load older messages on scroll
- **Responsive Design** — Mobile-first, works on all devices
- **PWA Support** — Installable as a desktop/mobile app

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v3 + Zustand |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Real-time | Socket.IO |
| Auth | JWT + bcrypt |
| File Uploads | Cloudinary |

## 📁 Project Structure

```
Chat_Application/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components (auth, chat, group, profile, notifications, common)
│   │   ├── hooks/          # Custom hooks (useSocket, useTyping, useInfiniteScroll)
│   │   ├── store/          # Zustand stores (auth, chat, theme, notifications)
│   │   ├── lib/            # Utilities (axios, socket, utils, encryption)
│   │   └── constants/      # App constants
│   └── ...
├── backend/                # Node.js + Express backend
│   ├── src/
│   │   ├── config/         # DB, Cloudinary, Socket.IO config
│   │   ├── models/         # Mongoose models (User, Conversation, Message)
│   │   ├── controllers/    # Route controllers
│   │   ├── routes/         # Express routes
│   │   ├── middleware/     # Auth, error handler, validation, rate limiter
│   │   ├── socket/         # Socket.IO event handlers
│   │   └── utils/          # Helpers
│   └── ...
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Chat_Application
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Cloudinary credentials
npm install
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Open in browser

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## 🔗 API Routes

### Auth — `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login with JWT |
| POST | `/logout` | Clear auth cookie |
| GET | `/check` | Verify token |

### Users — `/api/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=` | Search users |
| GET | `/profile` | Get own profile |
| PUT | `/profile` | Update profile |
| PUT | `/avatar` | Upload avatar |
| GET | `/:id` | Get user by ID |

### Conversations — `/api/conversations`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all conversations |
| POST | `/` | Create direct chat |
| POST | `/group` | Create group |
| PUT | `/:id/group` | Update group info |
| POST | `/:id/members` | Add members |
| DELETE | `/:id/members/:userId` | Remove member |

### Messages — `/api/messages`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:conversationId` | Get messages (paginated) |
| POST | `/` | Send message |
| PUT | `/:conversationId/read` | Mark as read |
| DELETE | `/:id` | Delete message |
| POST | `/upload` | Upload file |

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:send` | Client → Server | Send a message |
| `message:new` | Server → Client | New incoming message |
| `message:sent` | Server → Client | Confirm sent |
| `message:read` | Bidirectional | Read receipts |
| `typing:start` | Bidirectional | Typing started |
| `typing:stop` | Bidirectional | Typing stopped |
| `user:online` | Server → Client | User came online |
| `user:offline` | Server → Client | User went offline |

## 🗄️ MongoDB Relationships

```
User ──< participates >── Conversation
User ──< sends >── Message
Conversation ──< contains >── Message
```

- **User** → stores profile info, online status, lastSeen
- **Conversation** → links participants, stores lastMessage (subset pattern)
- **Message** → references conversationId and sender, tracks read receipts

## 🚢 Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
# Set environment variables: VITE_API_URL, VITE_SOCKET_URL
```

### Backend → Render

```bash
# Push to GitHub
# Connect repo to Render
# Set environment variables in Render dashboard
# render.yaml is included for auto-deploy
```

### Environment Variables (Production)

**Backend:**
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Secret key for JWT signing
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLIENT_URL` — Frontend URL (for CORS)
- `NODE_ENV=production`

**Frontend:**
- `VITE_API_URL` — Backend API URL
- `VITE_SOCKET_URL` — Backend Socket URL

## 🔒 Security

- JWT authentication with HTTP-only cookies
- Password hashing with bcrypt (12 rounds)
- Rate limiting on auth and upload routes
- Helmet.js security headers
- CORS whitelisting
- Input validation with express-validator
- Basic AES message encryption at rest

## 📄 License

MIT
