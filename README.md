# TeamspaceX 🚀

> **Modern, High-Performance Team Workspace & Real-Time Collaboration Platform**  
> Built with Next.js 14 (App Router), TypeScript, Express.js, MongoDB Atlas, and Socket.io.

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-green?style=for-the-badge&logo=node.js)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

---

## 📖 Overview

**TeamspaceX** is a full-featured, private workspace platform designed for software teams, agencies, and high-velocity startups. It bridges project management, agile Kanban task workflows, nested documentation wikis, and structured data tables into a single synchronized workspace.

Engineered with a decoupled microservice architecture, strict zero-trust Role-Based Access Control (RBAC), and bi-directional WebSocket presence feeds, TeamspaceX delivers an enterprise-grade collaborative experience.

---

## ⚡ Core Capabilities

- 📋 **Agile Sprint & Task Boards:** Interactive Kanban board and list views with priority matrix (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), deadline tracking, progress calculation, and assignments.
- 📁 **Hierarchical Knowledge Base:** Nested documentation tree (Workspaces ➔ Projects ➔ Folders ➔ Documents) with rich Markdown editing, live autosave, and full historical revision tracking (`PageRevision`).
- 📊 **Custom Data Tables:** Airtable/Notion-inspired structured databases allowing teams to define flexible schemas, custom columns, and row data.
- 📡 **Live Real-Time Collaboration:** Socket.io-driven bi-directional updates for live presence (who is online, who is viewing/editing which document) and instant broadcast feeds.
- 🛡️ **Zero-Trust Security & RBAC:** Comprehensive multi-tenant isolation with strict server-side validation preventing Insecure Direct Object References (IDOR) across all 13 controller modules.
- 🔐 **Stateful JWT Revocation:** Dual-layer auth with an incrementing `tokenVersion` counter and a MongoDB TTL-indexed **Token Blacklist** ensuring instantaneous session revocation across devices upon logout or password reset.
- 🕒 **Audit & Activity Feeds:** Granular workspace activity stream recording all resource lifecycles (creations, edits, status transitions, deletions).
- 🔍 **Keyboard-First Global Search:** Fast modal search (`Ctrl+K` / `⌘K`) indexing accessible projects, folders, pages, and tasks.

---

## 🏛️ System Architecture

```
                       ┌────────────────────────┐
                       │     Next.js 14 App     │
                       │   (Hosted on Vercel)   │
                       └───────────┬────────────┘
                                   │
              HTTPS REST API Calls │  WSS Real-time Events
                                   ▼
                       ┌────────────────────────┐
                       │  Express + TypeScript  │
                       │  (Hosted on Railway)   │
                       └─────┬────────────┬─────┘
                             │            │
             Mongoose ODM /  │            │ Socket.io
           TLS-encrypted SRV │            │ Presence & Events
                             ▼            ▼
                 ┌──────────────────┐   ┌─────────────────┐
                 │  MongoDB Atlas   │   │ Active Connected│
                 │   Cloud Cluster  │   │     Clients     │
                 └──────────────────┘   └─────────────────┘
```

---

## 🛠️ Tech Stack & Engineering Decisions

### Frontend
- **Framework:** Next.js 14+ (React 18, App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS with custom dark-palette design tokens
- **Icons:** Lucide React
- **Network Client:** Axios with request/response interceptors for token attachment and automatic session expiry routing
- **Real-time Client:** Socket.io-client with automatic reconnect policies

### Backend & Infrastructure
- **Runtime:** Node.js (ESM / NodeNext resolution)
- **Framework:** Express.js with TypeScript
- **Database:** MongoDB Atlas (Mongoose ODM with compound indexes and TTL collections)
- **Real-time Engine:** Socket.io with room-scoped message broadcasting
- **Security Middleware:** 
  - `helmet`: Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), X-Content-Type-Options, Frameguard
  - `express-rate-limit`: Multi-tiered limiters for brute-force mitigation (Login: 5/min, Passwords: 3/hr, Global: 300/15min)
  - `express-mongo-sanitize`: Global NoSQL injection prevention
  - `cors`: Environment-aware origin whitelisting with credentials support
- **Centralized Observability:** Production-safe error pipeline using cryptographically random hex **Correlation IDs** to trace exceptions while preventing internal leaks.

---

## 📂 Repository Structure

```
TeamspaceX/
├── package.json               # Root scripts
├── .env.example               # Root configuration template
├── .gitattributes             # Normalized cross-platform LF line endings
├── README.md                  # Project documentation
│
├── server/                    # Backend API Microservice
│   ├── railway.toml           # Railway production deployment config
│   ├── tsconfig.json          # TypeScript NodeNext configuration
│   ├── .env.example           # Backend environment template
│   └── src/
│       ├── config/            # Database connection & runtime constants validation
│       ├── controllers/       # 13 REST controllers (Auth, Project, Task, Page, Table, etc.)
│       ├── middleware/        # RBAC, auth verification, rate limiters, error sanitizers
│       ├── models/            # 10 Mongoose schemas (User, Task, Project, Workspace, etc.)
│       ├── routes/            # Express router modules
│       ├── services/          # Activity loggers & notification dispatchers
│       ├── sockets/           # Socket.io handlers & presence tracking maps
│       ├── utils/             # Database seeder & admin/demo bootstrapping
│       └── server.ts          # Server entry point
│
└── client/                    # Frontend Web Application
    ├── railway.toml           # Client deployment config
    ├── tsconfig.json          # Next.js TypeScript config
    ├── tailwind.config.ts     # UI theme styling
    ├── .env.example           # Client public variables template
    └── src/
        ├── app/               # Next.js 14 App Router pages (/login, /dashboard, /projects, etc.)
        ├── components/        # Layout, Sidebar, Header, GlobalSearchModal
        ├── context/           # React Context (AuthContext, SocketContext, WorkspaceContext)
        ├── lib/               # Axios API client & Socket.io instance
        └── types/             # Shared TypeScript models and API interfaces
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB**: MongoDB Atlas Cluster connection URI (or local MongoDB daemon)

### 2. Clone the Repository
```bash
git clone https://github.com/charlierx07/Teamspacex.git
cd Teamspacex
```

### 3. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

### 4. Configure Environment Variables

**Backend (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/teamspacex?retryWrites=true&w=majority

# Security Keys (Generate: openssl rand -base64 32)
JWT_SECRET=your-32-character-secret-key-here
JWT_EXPIRES_IN=7d

# Initial Admin Bootstrap Credentials
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=AdminPassword123!
DEFAULT_MEMBER_PASSWORD=TeamMember123!
```

**Frontend (`client/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 5. Start Development Servers
```bash
# Starts both Backend (port 5000) and Frontend (port 3000) concurrently
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🌐 Production Cloud Deployment

### 1. Backend on Railway
1. Create a project on [Railway.app](https://railway.app) and link the GitHub repository.
2. Set **Root Directory** to `server`.
3. Configure Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGODB_URI=<Your-Atlas-URI>`
   - `JWT_SECRET=<Random-32-Char-String>`
   - `JWT_EXPIRES_IN=7d`
   - `ADMIN_EMAIL=admin@yourdomain.com`
   - `ADMIN_PASSWORD=StrongAdminPassword!`
   - `CLIENT_URL=https://your-frontend.vercel.app`
4. Under **Networking**, click **Generate Domain** to get your backend URL (e.g. `https://teamspacex-production.up.railway.app`).

### 2. Frontend on Vercel
1. Import the repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL=https://teamspacex-production.up.railway.app`
   - `NEXT_PUBLIC_SOCKET_URL=https://teamspacex-production.up.railway.app`
4. Deploy the application.
5. Copy the generated Vercel domain and set it as `CLIENT_URL` in Railway variables.

---

## 🔒 Security & Hardening Highlights

- **Zero-Trust Multi-Tenancy:** All database queries require tenant scoping (`workspaceId: req.user.workspaceId`), guaranteeing that authenticated users cannot access or alter resources from other teams.
- **Protection Against Injection:** Automatic parameter sanitization prevents NoSQL query injection by stripping operator keys (`$`, `.`) from request parameters and payloads.
- **Cryptographic Password Security:** Salting and hashing via `bcryptjs` with 12 computational rounds. Plaintext passwords are never stored or emitted in API payloads.
- **Centralized Error Guard:** Stack traces and internal database errors are completely suppressed in production, returning sanitized client messages tied to a hex **Correlation ID** for audit trails.
- **Strict Network Security:** Production Helmet headers enforce strict Content-Security-Policy (CSP), framing restrictions (`DENY`), and cross-origin resource isolation.

---

## 📄 License

This project is licensed under the MIT License — feel free to explore, customize, and extend.
