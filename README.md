# EduAI — AI-Powered Student Learning Platform

A production-ready, full-stack AI learning platform with RAG pipeline, role-based dashboards, and modern UI.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Django 4.2 + DRF |
| Database | Supabase PostgreSQL |
| Auth | JWT + OAuth (Google, GitHub) |
| AI/RAG | LangChain + OpenAI + ChromaDB |
| File Storage | Supabase Storage |
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
│   │   └── files/          # Supabase file upload
│   ├── config/             # Django settings, URLs, ASGI, Celery
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/            # React Query hooks
│   │   ├── components/
│   │   │   ├── ai/         # ChatInterface
│   │   │   ├── layout/     # Sidebar, TopBar, DashboardLayout
│   │   │   ├── shared/     # ErrorBoundary, ProtectedRoute
│   │   │   └── ui/         # Button, Card, Input, Badge, etc.
│   │   ├── pages/
│   │   │   ├── landing/    # Landing page
│   │   │   ├── auth/       # Login, Register
│   │   │   ├── student/    # Dashboard, Chat, Quizzes, Flashcards, Analytics, Profile
│   │   │   ├── teacher/    # Dashboard
│   │   │   └── admin/      # Dashboard
│   │   ├── store/          # Zustand (auth, theme)
│   │   ├── types/          # TypeScript interfaces
│   │   └── lib/            # api.ts (axios), utils.ts
│   └── package.json
│
└── docker-compose.yml
```

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Copy .env
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

### With Docker

```bash
docker-compose up --build
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
| GET | `/api/analytics/teacher/` | Teacher analytics |
| GET | `/api/analytics/admin/` | Admin analytics |
| GET | `/api/notifications/` | Notifications list |
| POST | `/api/files/upload/` | File upload to Supabase |

---

## RAG Pipeline

```
PDF/DOCX/PPTX/TXT
      ↓
DocumentProcessor.extract_text()
      ↓
RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
      ↓
OpenAIEmbeddings → ChromaDB (persisted per material)
      ↓
ConversationalRetrievalChain (retrieves top-5 chunks)
      ↓
GPT-4o-mini generates contextual answer
      ↓
Response + source citations returned
```

---

## Roles & Permissions

| Feature | Student | Teacher | Admin |
|---------|---------|---------|-------|
| View materials | ✅ | ✅ | ✅ |
| Upload materials | ❌ | ✅ | ✅ |
| AI Chat | ✅ | ✅ | ✅ |
| Generate quizzes | ✅ | ✅ | ✅ |
| Create assignments | ❌ | ✅ | ✅ |
| Grade submissions | ❌ | ✅ | ✅ |
| User management | ❌ | ❌ | ✅ |
| Platform analytics | ❌ | ❌ | ✅ |

---

## Environment Variables

See `backend/.env.example` for all required variables.

Key variables:
- `OPENAI_API_KEY` — OpenAI API key for GPT-4o-mini
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — Supabase project credentials
- `GOOGLE_CLIENT_ID/SECRET` — Google OAuth
- `GITHUB_CLIENT_ID/SECRET` — GitHub OAuth
- `DATABASE_URL` — PostgreSQL connection string

---

## Deployment

- Backend: Deploy on Railway, Render, or EC2 with Gunicorn + Uvicorn workers
- Frontend: Deploy on Vercel or Netlify (set `VITE_API_URL` env)
- Database: Supabase managed PostgreSQL
- Redis: Upstash Redis or Railway Redis
- ChromaDB: Persisted on server volume or migrate to Pinecone for serverless
