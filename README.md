# TeamspaceX 🚀
### Modern General-Purpose Private Team Workspace & Collaboration Platform

TeamspaceX is a high-performance, private, full-stack collaborative workspace platform built for software teams, startups, research groups, agencies, hackathons, and small businesses (~5–8+ members). Manage projects, tasks, documents, folders, data tables, and activity with granular permissions and real-time collaboration.

---

## ⚡ Key Capabilities

- 🛡️ **Zero-Trust Permission System**: Strict server-side access control. Members can only access projects, folders, and documents explicitly assigned to them by the Administrator with granular `VIEW`, `EDIT`, or `MANAGE` rights.
- 📡 **Real-Time Live Collaboration**:
  - Socket.IO powered instant document updates without page refreshes.
  - Live typing & editing indicators (*"Rahul is editing..."*).
  - Online presence indicators across active workspaces and pages.
- 📁 **Modular Workspace Hierarchy**:
  - Dynamic Workspaces (`workspaceId` scoped for multi-workspace readiness).
  - Projects (e.g. Project Alpha, Project Beta, Project Gamma).
  - Folders (Technical Specs, Documentation, Sprints, Strategy, Confidential).
  - Pages / Documents with markdown formatting, code blocks, checklists, and auto-save.
  - Data Tables (Configurable columns, customizable row data).
- 📋 **Sprint & Task Management**: Dual Kanban board and list views with priority levels, deadlines, and real-time status updates.
- 🕒 **Audit Trail & Version History**: Complete revision history for every document with instant version restore capabilities.
- 🔔 **Real-Time Notification Feed**: In-app notifications for task assignments, project invites, and document modifications.
- 🔍 **Permission-Aware Global Search**: Keyboard-friendly (`⌘K` / `Ctrl+K`) instant search across authorized projects, folders, documents, and tasks.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide React, Socket.IO Client, Axios.
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO, Mongoose, Helmet, Rate Limiter.
- **Database**: MongoDB Atlas / Mongoose (with built-in development fallback).
- **Authentication & Security**: JWT with secure HTTP-only cookies, bcrypt hashing, zero public registration (Admin invite-only).

---

## 📁 Repository Structure

```
TeamspaceX/
├── package.json               # Root orchestrator scripts
├── .env.example               # Root configuration template
├── README.md                  # System documentation & setup guide
│
├── server/                    # Node.js + Express + TypeScript + Socket.IO
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example           # Backend environment template
│   └── src/
│       ├── config/            # DB connection (MongoDB Atlas / local) & constants
│       ├── models/            # Mongoose schemas (User, Project, Folder, Page, Task, Table, Activity, Notification)
│       ├── middleware/        # auth, checkPermission, checkRole, rateLimiter, errorHandler
│       ├── controllers/       # REST API business logic
│       ├── routes/            # Express route endpoints
│       ├── services/          # Real-time activity and notification dispatchers
│       ├── sockets/           # Socket.IO connection rooms, presence, and page broadcasting
│       ├── utils/             # Admin bootstrap & comprehensive agency seed script
│       └── server.ts          # Express + HTTP Server + Socket.IO entrypoint
│
└── client/                    # Next.js 14+ App Router + Tailwind CSS
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    └── src/
        ├── app/               # Routes: /login, /dashboard, /projects, /folders, /pages, /tasks, /team, /activity, /admin, /profile
        ├── components/        # Layout, Header, Sidebar, GlobalSearchModal
        ├── context/           # AuthContext, SocketContext, ToastContext
        ├── lib/               # api Axios client, socket instance
        └── types/             # Shared TypeScript definitions
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** >= v18.0.0
- **npm** >= 9.0.0
- **MongoDB**: Either a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI or local MongoDB. (Note: In development, if `MONGODB_URI` is left as `memory`, an embedded MongoDB instance will automatically boot).

---

### 2. Database & Environment Configuration

TeamspaceX uses **MongoDB Atlas** for persistent storage and supports `mongodb-memory-server` strictly for temporary development and automated testing.

#### 🌐 Setting Up MongoDB Atlas (Step-by-Step)

1. **Create an Atlas Account & Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and sign up / sign in.
   - Create a new Project (e.g. `TeamspaceX`) and deploy a free **M0 Shared Cluster** (AWS, Azure, or GCP).

2. **Configure Database User (Authentication)**:
   - Navigate to **Security > Database Access** in the Atlas sidebar.
   - Click **Add New Database User**.
   - Select **Password Authentication**.
   - Enter a username (e.g. `teamspace_admin`) and a secure password.
   - Under **Database User Privileges**, assign **Read and write to any database** (or `readWrite` on `teamspacex`).
   - Click **Add User**.

3. **Configure Network Access (IP Whitelist)**:
   - Navigate to **Security > Network Access** in the Atlas sidebar.
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) or add your current public IP.
   - Click **Confirm** and wait for the status to become *Active*.

4. **Obtain Connection String**:
   - Go to **Deployment > Database** and click **Connect** on your cluster.
   - Select **Drivers** (Node.js).
   - Copy the SRV connection string:
     ```text
     mongodb+srv://<username>:<password>@<cluster-url>/teamspacex?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials. Replace the path with your desired database name (e.g., `teamspacex`).

---

#### ⚙️ Environment Variables (`server/.env`)

Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Configure `server/.env` (refer to `.env.example`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB Connection String (Atlas persistent database)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/teamspacex?retryWrites=true&w=majority

# Security Keys (Generate with: openssl rand -base64 32)
JWT_SECRET=your-random-32-character-secret-key-here
JWT_EXPIRES_IN=7d

# Initial Founder / Admin Bootstrap Credentials
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourStrongAdminPasswordHere!

# Default password for sample seeded accounts (npm run seed)
DEFAULT_MEMBER_PASSWORD=YourSampleMemberPasswordHere!
```

---

> ⚠️ **CRITICAL SECURITY WARNING: ROTATE PREVIOUSLY COMMITTED SECRETS IMMEDIATELY**
>
> If any secret, API key, MongoDB Atlas URI, or password was previously hardcoded or committed to this repository, **that credential is permanently stored in your Git commit history**.
>
> **You must perform the following rotation steps immediately**:
> 1. **Rotate MongoDB Atlas Credentials**: Log into [MongoDB Atlas](https://cloud.mongodb.com) → *Database Access* → Edit Database User → Reset the user password and update your local `server/.env`.
> 2. **Rotate JWT Signing Secret**: Generate a fresh, unguessable 256-bit key (`openssl rand -base64 32`) and assign it to `JWT_SECRET` in `server/.env`.
> 3. **Change All User Passwords**: Update `ADMIN_PASSWORD` and `DEFAULT_MEMBER_PASSWORD` in `server/.env`. Reset passwords for all existing users via the in-app Admin settings or database.
> 4. **Purge Git History**: If the repository was pushed to any public or shared remote repository, purge the commits containing secrets using [git-filter-repo](https://github.com/newren/git-filter-repo) or [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/).

---

#### ⚖️ Database Behavior: Development vs. Production

| Environment (`NODE_ENV`) | `MONGODB_URI` Value | Connection Behavior | Persistence | Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **`production`** | Valid Atlas URI | Connects to MongoDB Atlas | **ENABLED** | **FAIL-FAST**: Crashes on failure. Never uses in-memory storage. |
| **`production`** | Missing or `"memory"` | Startup blocked with fatal error | N/A | **FAIL-FAST**: Process exits immediately (`exit(1)`). |
| **`development`** | Real Atlas/Local URI | Connects to configured MongoDB | **ENABLED** | **NO FALLBACK**: If URI fails, exits with error. Does NOT hide connection errors. |
| **`development`** | `"memory"` | Boots `mongodb-memory-server` | **DISABLED** | Ephemeral RAM storage. Data discarded on restart. |
| **`development`** | Empty / Not set | Boots `mongodb-memory-server` | **DISABLED** | Displays warning banner that data will NOT persist. |

> 🔒 **Security Notice**: Credentials inside `MONGODB_URI` are automatically masked in all console logs (e.g. `mongodb+srv://****:****@cluster.mongodb.net/teamspacex`). Raw passwords are never emitted to stdout.

---

### 3. Install Dependencies & Seed Sample Data

Install all dependencies across root, server, and client:

```bash
# In the root folder:
npm run install:all
```

Seed initial projects (Project Alpha, Project Beta, Project Gamma), folders, documents, Kanban tasks, and team members:

```bash
npm run seed
```

---

### 4. Run Locally

To run both backend API & real-time WebSockets on `http://localhost:5000` and frontend on `http://localhost:3000` concurrently:

```bash
npm run dev
```

Or individually:
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Demo Accounts (Seeded via `npm run seed`)

The database seed provides predefined team members with tailored permissions to test real-time collaboration and access control. Passwords match the `ADMIN_PASSWORD` and `DEFAULT_MEMBER_PASSWORD` variables configured in `server/.env`:

| Name | Email | Password Source | Role | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Configured in `ADMIN_EMAIL` | Configured in `ADMIN_PASSWORD` | `ADMIN` | Full access to all projects, folders, data tables, and workspace settings |
| **Rahul Sharma** | `rahul@agency.com` | Configured in `DEFAULT_MEMBER_PASSWORD` | `MEMBER` | **Project Alpha** (EDIT) + **Technical Architecture** (EDIT) |
| **Aman Verma** | `aman@agency.com` | Configured in `DEFAULT_MEMBER_PASSWORD` | `MEMBER` | **Project Beta** (EDIT) + **System Design** (VIEW) |
| **Sneha Patel** | `sneha@agency.com` | Configured in `DEFAULT_MEMBER_PASSWORD` | `MEMBER` | **Project Alpha** (VIEW) + **Project Gamma** (EDIT) |

---

## 🔒 Security & Permission Model

1. **Zero-Trust Server Enforcement**: Frontend UI hides unauthorized resources, but every backend API route independently validates access using `checkUserProjectPermission` and `checkUserFolderPermission`.
2. **Access Hierarchy**:
   - `ADMIN`: Global bypass within workspace.
   - `MEMBER`: Access evaluated by direct project/folder grant or project membership. Projects automatically inherit access down to their child folders and documents unless overridden.
3. **No Public Registration**: Self-signup endpoints do not exist. Users are invited and provisioned only by Admins. Deactivated users (`status: DISABLED`) are rejected immediately on any API or WebSocket request.
4. **Strict Environment Secrets**: No secrets, database passwords, or JWT keys exist as string literals in source code. All configuration is loaded from environment variables, and error handlers sanitize logs to prevent credential leakage.

---

## 🌐 Production Deployment

- **Frontend (Vercel)**:
  - Root directory: `client`
  - Framework preset: `Next.js`
  - Environment variables:
    `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
    `NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com`
- **Backend (Render / Railway / DigitalOcean)**:
  - Root directory: `server`
  - Build command: `npm run build`
  - Start command: `npm start`
  - Environment variables: Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
