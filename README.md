# 🎓 CampusNode — Campus Event Management Platform 🚀

A full-stack, enterprise-ready campus event management ecosystem designed to streamline event discovery, registration, attendance tracking, team management, lost & found board, and certificate issuance for educational institutions, student clubs, and administrators.

---

## 📌 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
  - [👨‍🎓 For Students](#-for-students)
  - [🧑‍💼 For Club Heads \& Coordinators](#-for-club-heads--coordinators)
  - [🏫 For Faculty \& Administration](#-for-faculty--administration)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started \& Installation](#-getting-started--installation)
  - [Prerequisites](#prerequisites)
  - [Local Development Setup](#local-development-setup)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [API Endpoints Summary](#-api-endpoints-summary)
- [Security Features](#-security-features)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧐 Overview

Campus event management often suffers from fragmented communication across messaging groups, lost Google Form responses, lack of attendance verification, and absent administrative oversight. 

**ClubSetu / CampusNode** provides a unified platform:
- **Centralized Event Portal**: All technical, cultural, sports, and workshop events in one place.
- **Automated Workflow**: Instant seat allocation, QR-code based ticket check-in, real-time registration tracking, and auto-generated PDF certificates.
- **Team & Participation Portal**: Team formation for hackathons/competitions, participation tracking, and member management.
- **Campus Lost & Found Board**: Centralized reporting and claiming workflow for lost and found items.
- **Multi-Role Governance**: Role-Based Access Control (RBAC) supporting Students, Club Leads, Faculty Coordinators, and System Admins.

---

## ✨ Key Features

### 👨‍🎓 For Students
- **Event Discovery & Filtering**: Search and filter upcoming/live events by category, status, or organizing club.
- **Dynamic Registrations**: Custom dynamic forms tailored per event (custom questions, file uploads, T-shirt sizes, team details).
- **Team Formation & Management**: Create or join teams for team-based competitions and hackathons.
- **Personalized Student Dashboard**: View registered events, track registration statuses, download entry tickets/QR passes.
- **Automated Certificate Generation**: Generate and download verified PDF certificates upon event completion.
- **Lost & Found Board**: Campus-wide lost & found board with item listing, image uploads, and claim workflows.

### 🧑‍💼 For Club Heads & Coordinators
- **Event Builder**: Create draft events with customizable venues, schedules, seat caps, and dynamic input fields.
- **Real-Time Analytics**: View live registration counts, check-in numbers, and participant details.
- **Attendance & Check-in**: Scan QR codes or manually verify student check-ins at event entry.
- **Data Export**: Export attendee lists and event summaries in CSV/Excel formats.
- **Certificate Template Builder**: Configure custom background images, layout parameters, and placeholder tags for auto-issuing certificates.
- **Club Member Management**: Assign roles and coordinate team responsibilities within the club.

### 🏫 For Faculty & Administration
- **Approval Workflow**: Review pending event proposals submitted by clubs before publishing to students.
- **Administrative Dashboard**: Monitor campus-wide event logs, registration volumes, and club activities.
- **Club Lifecycle Management**: Provision new clubs, assign faculty leads, and update institutional credentials.
- **Lost & Found Moderation**: Admin oversight for lost & found listings and auto-cleanup rules for reunited items.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS v4, Lucide React, Remixicon, Radix UI, Framer Motion
- **HTTP Client**: Axios with JWT request/response interceptors
- **State & Utilities**: React Router v7, React Hot Toast, HTML5 QR Code scanner, DOMPurify

### **Backend**
- **Runtime & Framework**: Node.js + Express.js 5
- **Database & ORM**: PostgreSQL 16 + Prisma ORM 7
- **Real-Time Engine**: Socket.io for live updates and notifications
- **Authentication**: JWT (JSON Web Tokens), bcryptjs password hashing, 2FA OTP support
- **Storage & Media**: Cloudinary API for logo, gallery, lost & found, and certificate template uploads
- **PDF & Communication**: PDFKit for certificate rendering, Nodemailer & Resend for transactional email triggers
- **Security & Performance**: Helmet headers, express-rate-limit, CORS policy, Gzip compression

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       React Frontend                        │
│             (Vite, Tailwind CSS, Lucide, Axios)             │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST / WebSockets
┌──────────────────────────────▼──────────────────────────────┐
│                    Express.js API Server                    │
│   (Auth Middleware, RBAC, Rate Limiter, Route Handlers)     │
└──────┬──────────────────────────────────────────────┬───────┘
       │                                              │
       ▼                                              ▼
┌──────────────┐                              ┌───────────────┐
│ PostgreSQL   │                              │  Cloudinary   │
│ (via Prisma) │                              │(Media Storage)│
└──────────────┘                              └───────────────┘
```

---

## 📁 Project Directory Structure

```text
clubsetu/
├── client/                     # Frontend React (Vite) Application
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Footer, Modals, etc.)
│   │   ├── context/            # Global Auth & App State Contexts
│   │   ├── pages/              # Route pages (Home, Events, Dashboard, Admin, Lost&Found, etc.)
│   │   ├── utils/              # Axios helpers, date formatters, validators
│   │   ├── App.jsx             # Main router configuration
│   │   └── main.jsx            # Application entry point
│   ├── public/                 # Static assets & favicons
│   ├── vite.config.js          # Vite build configuration
│   └── package.json
│
├── server/                     # Backend Node.js / Express API Server (see server/README.md)
│   ├── assets/fonts/           # Custom calligraphy TTF fonts for PDF certificates
│   ├── constants/              # NITJ academic departments, branches & batch constants
│   ├── controllers/            # Controller handlers (certificates, club memberships)
│   ├── lib/                    # Database client singleton (prisma.js)
│   ├── middleware/             # Auth JWT, RBAC, error handlers, performance & rate limiters
│   ├── prisma/                 # PostgreSQL relational schema (schema.prisma) & migrations
│   ├── routes/                 # Express API route modules (auth, events, scanner, teams, etc.)
│   ├── scripts/                # Database seeders, keypair generators & migration utilities
│   ├── services/               # Conflict detection, export streaming, QR signing services
│   ├── utils/                  # RBAC matrix, email/push dispatchers, Cloudinary, sanitizers
│   ├── index.js                # Express app & Socket.io real-time server entry point
│   ├── Dockerfile              # Docker container deployment definition
│   └── package.json
│
├── API_ENDPOINTS.md            # Detailed API documentation
├── BACKEND_SCHEMA.md           # Database model specifications
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started & Installation

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js**: `v18.x` or higher
- **npm** or **yarn**
- **PostgreSQL**: `v14.x` or higher

---

### Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/clubsetu.git
cd clubsetu
```

#### 2. Backend Setup
```bash
cd server
npm install

# Configure environment variables
cp .env.example .env

# Generate Prisma Client & Run Database Migrations
npm run prisma:generate
npm run prisma:push

# Start Backend Dev Server
npm run dev
```
*Backend server will start on `http://localhost:5000`.*

#### 3. Frontend Setup
```bash
cd ../client
npm install

# Start Frontend Dev Server
npm run dev
```
*Frontend app will start on `http://localhost:5173`.*

---

## ⚙️ Environment Variables

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development

# Database Connection
DATABASE_URL="postgresql://postgres:password@localhost:5432/campusnode"

# Authentication Secrets
JWT_SECRET="your_jwt_secret_key"
JWT_EXPIRE="7d"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Email Services
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@domain.com"
SMTP_PASS="your_app_password"
RESEND_API_KEY="re_123456789"
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL="http://localhost:5000/api"
```

<!-- > [!TIP]
> - For environment isolation architecture & staging setup, read [ENVIRONMENT_SETUP.md](docs/development/ENVIRONMENT_SETUP.md).
> - For cryptographic key rotation procedures & user blast radius impacts, see [KEY_ROTATION.md](KEY_ROTATION.md). -->

---

## 🗄️ Database Schema Overview

The database architecture consists of core models managed via Prisma:
- **User**: Students, Club Leads, Faculty Coordinators, Admin. Supports 2FA & email verification.
- **Club**: Club profiles, social links, faculty/student leads.
- **Event**: Titles, schedule, capacity, fee/free toggle, dynamic registration field rules, review status (`DRAFT`, `PENDING`, `PUBLISHED`, `REJECTED`).
- **Registration**: Student-to-Event mapping, custom field answers, attendance check-in status.
- **Team**: Team details, members, invites for hackathons and team events.
- **LostFoundItem**: Item listings, category, location, claim status, and image URLs.
- **Notification**: Targeted broadcast messages with read receipts.
- **CertificateTemplate**: Coordinates, font sizes, background image layout specs per event.

For more details, see [BACKEND_SCHEMA.md](file:///c:/Users/yadav/Desktop/club-event/club-event/clubsetu/BACKEND_SCHEMA.md).

---

## 📡 API Endpoints Summary

| Module | Route Prefix | Description | Key Methods |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth` | Login, Register, 2FA, Password Reset | `POST` |
| **Events** | `/api/events` | Browse, Create, Review, Register, Export | `GET`, `POST`, `PUT`, `DELETE` |
| **Clubs** | `/api/clubs` | Club Listings, Details, Updates | `GET`, `PUT` |
| **Teams** | `/api/teams` | Team creation, invitation, and member management | `GET`, `POST`, `PUT`, `DELETE` |
| **Lost & Found** | `/api/lost-found` | Report items, claim workflow, reunited status | `GET`, `POST`, `PUT`, `DELETE` |
| **Admin** | `/api/admin` | Dashboard Stats, Club Provisioning, Global Export | `GET`, `POST` |
| **Certificates** | `/api/certificates` | Upload Templates & Generate PDF Certificates | `GET`, `POST` |
| **Notifications** | `/api/notifications` | User & Event Scoped Alerts | `GET`, `POST`, `PUT` |

For complete payload details and request formats, refer to [API_ENDPOINTS.md](file:///c:/Users/yadav/Desktop/club-event/club-event/clubsetu/API_ENDPOINTS.md).

---

## 🛡️ Security & Quality Features
- **Stateless RBAC**: Token-based authentication using JWT with granular role verification.
- **Data Integrity**: Input validation using Zod schemas on API payloads.
- **Rate Limiting & Headers**: Protection against brute-force attacks via `express-rate-limit` and secure headers with `helmet`.
- **Media Security**: Controlled file upload limits and Cloudinary storage integration.

---

## 🧪 Testing

To execute automated tests in both backend and frontend:

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more details.
