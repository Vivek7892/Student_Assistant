# EduAI — AI-Powered Student Learning Platform

A full-stack AI learning platform with RAG pipeline, role-based dashboards, real-time chat, quizzes, flashcards, and study plans.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Django 4.2 + DRF + Django Channels (ASGI) |
| Database | MySQL 8.0 (Docker) / PostgreSQL (Render) |
| Auth | JWT (SimpleJWT) + Google OAuth |
| AI / RAG | LangChain + Gemini 2.0 Flash + ChromaDB |
| Chat History | MongoDB Atlas |
| File Storage | Cloudinary / Cloudflare R2 / Local media |
| Queue | Celery + Redis |
| Realtime | Django Channels WebSocket |

---

## Project Structure

```
Student-Assistant/
├── backend/
│   ├── apps/
│   │   ├── accounts/       # Auth, JWT, Google OAuth, profiles
│   │   ├── courses/        # Semesters, subjects, study materials
│   │   ├── ai_assistant/   # RAG pipeline, chat, quizzes, flashcards
│   │   ├── assignments/    # Assignments & submissions
│   │   ├── analytics/      # Student & admin analytics
│   │   ├── notifications/  # WebSocket notifications
│   │   ├── files/          # File upload
│   │   └── videos/         # YouTube video integration
│   ├── config/             # Settings, URLs, ASGI, Celery, routing
│   ├── core/               # MongoDB client, activity tracking
│   ├── chroma_db/          # Persisted ChromaDB vector store
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios + React Query hooks
│   │   ├── components/     # UI, layout, dashboard, AI components
│   │   ├── pages/          # app/, auth/, admin/, teacher/, landing/
│   │   ├── store/          # Zustand (auth, theme)
│   │   ├── lib/            # axios client, firebase, utils
│   │   └── types/          # TypeScript types
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

## Quick Start (Local Dev)

### Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL 8 or PostgreSQL (for local DB)
- Redis (local or Docker)
- MongoDB Atlas account
- Google AI Studio API key (Gemini)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
# Fill in all required values in .env

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Start Celery worker (separate terminal):

```bash
celery -A config worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`, API at `http://localhost:8000`.

---

## Docker Deployment

### 1. Configure environment

```bash
copy backend\.env.example backend\.env    # Windows
copy frontend\.env.example frontend\.env

# backend\.env  — set SECRET_KEY, DB_PASSWORD, GEMINI_API_KEY, MONGO_URI, etc.
# frontend\.env — leave VITE_API_URL empty (nginx proxies /api to backend)
```

### 2. Build and run

```bash
docker-compose up --build -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

### 3. Create superuser

```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## Deploy to Render

A `render.yaml` is included for one-click Render deployment.

1. Push repo to GitHub
2. Connect repo in [Render Dashboard](https://render.com) → **New Blueprint**
3. Set secret env vars (marked `sync: false` in `render.yaml`):
   - `GEMINI_API_KEY`, `MONGO_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
4. Update `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` to your actual frontend URL

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key (50+ random chars) |
| `DEBUG` | `True` for dev, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `DB_NAME/USER/PASSWORD/HOST/PORT` | MySQL/PostgreSQL credentials |
| `DATABASE_URL` | Full DB URL (overrides above, used on Render) |
| `REDIS_URL` | Redis connection URL |
| `GEMINI_API_KEY` | Google AI Studio key |
| `MONGO_URI` | MongoDB Atlas connection string |
| `MONGO_DB_NAME` | MongoDB database name |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth credentials |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `EMAIL_HOST_USER/PASSWORD` | SMTP email credentials |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Cloudinary storage (optional) |
| `CF_R2_*` | Cloudflare R2 storage (optional) |
| `CHROMA_PERSIST_DIR` | ChromaDB persistence path |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |
| `FRONTEND_URL` | Frontend base URL (for email links) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (empty = nginx proxy in Docker) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_GOOGLE_DRIVE_REDIRECT_URI` | Exact Google Drive OAuth redirect URI, e.g. `http://localhost:5173/drive-callback` |
| `VITE_YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `VITE_FIREBASE_*` | Firebase config (password reset emails) |

### Google Drive OAuth Redirect URIs

In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID,
add every redirect URI your frontend will send:

- Local dev: `http://localhost:5173/drive-callback`
- Local dev alternative: `http://127.0.0.1:5173/drive-callback`
- Production: `https://your-frontend-domain.com/drive-callback`

Set `VITE_GOOGLE_DRIVE_REDIRECT_URI` to one of those exact values. Google requires
an exact match, including protocol, host, port, and path.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register user |
| POST | `/api/auth/login/` | Login (returns JWT) |
| POST | `/api/auth/logout/` | Logout (blacklist token) |
| GET/PATCH | `/api/auth/me/` | Get / update profile |
| POST | `/api/auth/google/` | Google OAuth login |
| POST | `/api/auth/forgot-password/` | Request password reset |
| POST | `/api/auth/reset-password/` | Reset password |
| GET/POST | `/api/courses/semesters/` | Semester CRUD |
| GET/POST | `/api/courses/subjects/` | Subject CRUD |
| GET/POST | `/api/courses/materials/` | Study materials CRUD |
| POST | `/api/ai/sessions/chat/` | AI chat (RAG) |
| GET | `/api/ai/sessions/` | Chat history |
| POST | `/api/ai/quizzes/generate/` | Generate AI quiz |
| POST | `/api/ai/flashcards/generate/` | Generate AI flashcards |
| POST | `/api/ai/study-plans/generate/` | Generate AI study plan |
| POST | `/api/ai/summarize/` | Summarize document |
| GET/POST | `/api/assignments/` | Assignments CRUD |
| GET | `/api/analytics/student/` | Student analytics |
| GET | `/api/analytics/admin/` | Admin analytics |
| GET | `/api/notifications/` | Notifications list |
| POST | `/api/files/upload/` | Upload file |

WebSocket: `ws://<host>/ws/chat/?token=<jwt>`

---

## RAG Pipeline

```
PDF / DOCX / PPTX / TXT
        ↓
DocumentProcessor.extract_text()
        ↓
RecursiveCharacterTextSplitter
(512 token chunks, 64 overlap)
        ↓
Gemini text-embedding-004 → ChromaDB (persisted per material)
        ↓
MMR retrieval (top-6 chunks)
        ↓
Gemini 2.0 Flash generates contextual answer
        ↓
Response + source citations (streaming via WebSocket)
```

---

## Key Dependencies

### Backend
- `django` 4.2, `djangorestframework` 3.15, `simplejwt` 5.3
- `channels` 4.1 + `channels-redis` 4.2 (WebSocket)
- `celery` 5.4 + `redis` 5.2 (async tasks)
- `langchain` 0.3, `google-genai`, `chromadb` 0.5 (RAG)
- `pymongo` 4.8 (chat history)
- `pypdf`, `python-docx`, `python-pptx` (document parsing)
- `django-storages` + `boto3` / `cloudinary` (file storage)

### Frontend
- `react` 18, `typescript`, `vite` 5
- `@tanstack/react-query` 5 (data fetching)
- `zustand` 4 (state management)
- `axios` (HTTP client)
- `tailwindcss` 3 + `radix-ui` (UI)
- `framer-motion` (animations)
- `recharts` (analytics charts)
- `firebase` 12 (password reset)
- `react-hook-form` + `zod` (form validation)
