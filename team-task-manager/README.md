# 🚀 TaskFlow — Team Task Manager

A full-stack collaborative task management web app with role-based access control (Admin/Member), real-time dashboard, kanban board, and complete REST API.

---

## ✨ Features

### 🔐 Authentication
- JWT-based signup/login with bcrypt password hashing
- 7-day token expiry with auto-redirect on expiry
- Profile management (name, avatar color, password)
- Rate limiting on auth endpoints

### 📁 Projects
- Create, edit, archive, and delete projects
- Color-coded project labels with deadline tracking
- Progress bars (done tasks / total tasks)
- Admin/Member role system per project

### 👥 Team Management
- Invite members by email address
- Assign Admin or Member role per project
- Remove members (admin only, cannot remove owner)
- In-project member panel with avatar display

### ✅ Tasks
- Create tasks with title, description, priority, status, assignee, due date
- Kanban board view (To Do / In Progress / Review / Done)
- List view with full sorting & filtering
- Task status updates with one click
- Delete (admin or task creator only)

### 📊 Dashboard
- Personalized greeting with today's date
- Stats: total, in-progress, in-review, overdue
- My active tasks list
- Overdue alert panel
- Project progress section
- Recent activity feed

### 🔔 Notifications
- In-app notifications for task assignment and project invites
- Unread badge on sidebar
- Mark all as read

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Styling | Vanilla CSS (CSS variables, no framework) |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3, WAL mode) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Deploy | Railway |

---

## 🗂 Project Structure

```
team-task-manager/
├── backend/
│   ├── db/
│   │   └── database.js       # SQLite schema + init
│   ├── middleware/
│   │   └── auth.js           # JWT + role guards
│   ├── routes/
│   │   ├── auth.js           # Register, login, profile
│   │   ├── projects.js       # CRUD + member management
│   │   ├── tasks.js          # Task CRUD + comments + dashboard
│   │   └── users.js          # Search + notifications
│   └── server.js             # Express app entry
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/UI.jsx # Reusable components
│       │   └── layout/AppLayout.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Projects.jsx
│       │   ├── ProjectDetail.jsx
│       │   ├── Tasks.jsx
│       │   ├── TaskDetail.jsx
│       │   ├── Notifications.jsx
│       │   └── Settings.jsx
│       ├── utils/api.js
│       ├── App.jsx
│       └── main.jsx
├── railway.toml
├── nixpacks.toml
└── package.json
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/team-task-manager.git
cd team-task-manager

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure backend
```bash
cd backend
cp .env.example .env
# Edit .env — change JWT_SECRET to something secure!
```

### 3. Run dev servers
```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173, proxied to :5000)
cd frontend && npm run dev
```

Visit: **http://localhost:5173**

---

## 🌐 Deploy to Railway

### Option A: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Option B: GitHub Connect
1. Push repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Set environment variables:
   - `JWT_SECRET` = `your-secure-random-secret`
   - `NODE_ENV` = `production`
5. Deploy!

Railway auto-detects `railway.toml` and `nixpacks.toml` for build config.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Protected |
| PUT | `/api/auth/profile` | Protected |

### Projects
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/projects` | Protected |
| POST | `/api/projects` | Protected |
| GET | `/api/projects/:id` | Member |
| PUT | `/api/projects/:id` | Admin |
| DELETE | `/api/projects/:id` | Owner |
| POST | `/api/projects/:id/members` | Admin |
| PUT | `/api/projects/:id/members/:userId` | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Admin |

### Tasks
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/tasks` | Protected (own tasks) |
| GET | `/api/tasks/dashboard` | Protected |
| GET | `/api/tasks/project/:id` | Member |
| POST | `/api/tasks` | Member |
| GET | `/api/tasks/:id` | Member |
| PUT | `/api/tasks/:id` | Member |
| DELETE | `/api/tasks/:id` | Admin or Creator |
| POST | `/api/tasks/:id/comments` | Member |

### Users
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/users/search?q=` | Protected |
| GET | `/api/users/notifications` | Protected |
| PUT | `/api/users/notifications/read` | Protected |

---

## 🔒 Role-Based Access Control

| Action | Member | Admin | Owner |
|--------|--------|-------|-------|
| View project | ✅ | ✅ | ✅ |
| Create task | ✅ | ✅ | ✅ |
| Update task | ✅ | ✅ | ✅ |
| Delete task | ❌ (own) | ✅ | ✅ |
| Update project | ❌ | ✅ | ✅ |
| Add members | ❌ | ✅ | ✅ |
| Remove members | ❌ | ✅ | ✅ |
| Delete project | ❌ | ❌ | ✅ |

---

## 📱 Screenshots

- **Dashboard** — Stats, my tasks, overdue alerts, project progress
- **Kanban Board** — 4-column status board with drag-capable cards
- **Task Detail** — Full task view with comments thread
- **Projects** — Card grid with color labels and progress bars
- **Settings** — Profile update + password change

---

## 📄 License

MIT — free to use, modify, and deploy.
