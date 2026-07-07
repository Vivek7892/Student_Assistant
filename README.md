# EduAI — AI-Powered Student Learning Platform

A production-ready, full-stack AI learning platform with RAG pipeline, role-based dashboards, and modern UI.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Django 4.2 + DRF + Django Channels |
| Database | MySQL 8.0 |
| Auth | JWT + Google OAuth |
| AI/RAG | LangChain + Gemini 2.0 Flash + ChromaDB |
| Chat History | MongoDB Atlas |
| File Storage | Local media / Cloudflare R2 |
| Queue | Celery + Redis |
| Realtime | Django Channels (WebSocket) |

---

## Project Structure

```
Student-Assistant/
├── backend/
│   ├── apps/
│   │   ├── accounts/       # User auth, profiles, JWT
│   │   ├── courses/        # Semesters, subjects, materials
│   │   ├── ai_assistant/   # RAG, chat, quizzes, flashcards
│   │   ├── assignments/    # Assignments & submissions
│   │   ├── analytics/      # Analytics views
│   │   ├── notifications/  # WebSocket notifications
│   │   └── files/          # File upload + Google Drive sync
│   ├── config/             # Django settings, URLs, ASGI, Celery
│   ├── core/               # MongoDB client
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/            # React Query hooks
│   │   ├── components/     # UI components
│   │   ├── pages/          # App pages
│   │   ├── store/          # Zustand (auth, theme)
│   │   └── lib/            # axios client, utils
│   └── package.json
│
└── docker-compose.yml
```

---

## Quick Start (Local Dev)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

copy .env.example .env
# Fill in your keys in .env

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Docker Deployment

### 1. Configure environment

```bash
# Backend
copy backend\.env.example backend\.env
# Edit backend\.env — set SECRET_KEY, DB_PASSWORD, GEMINI_API_KEY, MONGO_URI, etc.

# Frontend
copy frontend\.env.example frontend\.env
# VITE_API_URL should be empty for Docker (nginx proxies /api)
```

### 2. Build and run

```bash
docker-compose up --build -d
```

Services:
- Frontend: http://localhost (port 80)
- Backend API: http://localhost:8000 (or via nginx proxy at /api)
- MySQL: port 3306
- Redis: port 6379

### 3. Create superuser

```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register user |
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout (blacklist token) |
| GET/PATCH | `/api/auth/me/` | Get/update profile |
| POST | `/api/auth/forgot-password/` | Request reset |
| POST | `/api/auth/reset-password/` | Reset password |
| GET/POST | `/api/courses/semesters/` | Semester CRUD |
| GET/POST | `/api/courses/subjects/` | Subject CRUD |
| GET/POST | `/api/courses/materials/` | Study materials |
| POST | `/api/ai/sessions/chat/` | AI chat (RAG) |
| GET | `/api/ai/sessions/` | Chat history |
| POST | `/api/ai/quizzes/generate/` | AI quiz generation |
| POST | `/api/ai/flashcards/generate/` | AI flashcard generation |
| POST | `/api/ai/study-plans/generate/` | AI study plan |
| POST | `/api/ai/summarize/` | Document summary |
| GET | `/api/analytics/student/` | Student analytics |
| GET | `/api/analytics/admin/` | Admin analytics |
| GET | `/api/notifications/` | Notifications list |
| POST | `/api/files/upload/` | File upload |

WebSocket: `ws://host/ws/chat/?token=<jwt>`

---

## RAG Pipeline

```
PDF/DOCX/PPTX/TXT
      ↓
DocumentProcessor.extract_text()
      ↓
RecursiveCharacterTextSplitter (512 token chunks, 64 overlap)
      ↓
Gemini text-embedding-004 → ChromaDB (persisted per material)
      ↓
MMR retrieval (top-6 chunks)
      ↓
Gemini 2.0 Flash Lite generates contextual answer
      ↓
Response + source citations returned (streaming via WebSocket)
```

---

## Environment Variables

See `backend/.env.example` for all required variables.

Key variables:
- `SECRET_KEY` — Django secret key (min 50 chars, random)
- `GEMINI_API_KEY` — Google AI Studio key (starts with `AIza`)
- `MONGO_URI` — MongoDB Atlas connection string
- `DB_PASSWORD` — MySQL password
- `GOOGLE_CLIENT_ID/SECRET` — Google OAuth
- `CORS_ALLOWED_ORIGINS` — Comma-separated allowed frontend origins

---

## Deployment Targets

- Backend: Railway, Render, or EC2 with `gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker`
- Frontend: Vercel, Netlify, or Docker (set `VITE_API_URL` to backend URL if not same-origin)
- Database: PlanetScale, Railway MySQL, or self-hosted MySQL 8
- Redis: Upstash Redis or Railway Redis
- MongoDB: MongoDB Atlas (free tier works)
- ChromaDB: Persisted on server volume (or migrate to Pinecone for serverless)
