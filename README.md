 # SmartDocs

SmartDocs is an AI‑powered document management and analysis platform. Users can securely upload PDF/DOCX/PPTX files, generate AI summaries, create quizzes/question banks, and manage saved items. The app ships with a modern React frontend and two backend options (Express or FastAPI), integrates Firebase for auth, and uses Ollama for on‑device AI.

## Features

- **Authentication:** Firebase (client auth + Admin verification)
- **Upload & Manage:** PDF, DOCX, PPTX (up to 25MB) stored locally
- **AI Summaries:** Generate structured summaries via Ollama
- **Quizzes:** MCQs grounded in document text via Ollama
- **Question Bank:** Open‑ended questions generation
- **Saved Items:** Download summaries/quizzes as `.doc`
- **Modern UI:** React + Vite + Tailwind, responsive and fast

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend (choose one):**
  - `server/` Express + Firebase Admin, file JSON stores
  - `backend/` FastAPI (Python) with local storage and optional vector/RAG
- **AI:** Ollama (default model `llama3.1:8b`)
- **Auth:** Firebase (client SDK + Admin verification)
- **Parsing:** `pdf-parse`, `mammoth` (DOCX), basic PPTX support (upload; quiz/summarize may vary by backend)

## Project Structure

```
Smartdocs/
├── backend/                    # FastAPI backend (Python)
│   ├── main.py                 # FastAPI entry
│   ├── routes/                 # API routes
│   ├── uploads/                # File storage
│   ├── requirements.txt        # Python deps
│   └── README.md
├── server/                     # Express backend (Node.js)
│   ├── index.js                # Express entry (port 5000+, fallback)
│   ├── public/uploads/         # Files + JSON stores (e.g., files.json)
│   └── package.json
├── frontend/                   # React app (Vite @ 5173/5174)
│   ├── src/
│   ├── package.json
│   └── README.md
├── PROJECT_STATUS.md           # Status and testing checklist
├── SETUP_INSTRUCTIONS.md       # Detailed setup steps
├── QUIZ_FEATURE_GUIDE.md       # Quiz feature design notes
└── README.md                   # You are here
```

## Prerequisites

- Node.js 18+
- Python 3.11+ (for FastAPI backend)
- Ollama installed and running
- Firebase project (client config for frontend, service account JSON for backend)

## Setup

### 1) Clone
```bash
git clone https://github.com/Anilj21/Smartdocs.git
cd Smartdocs
```

### 2) Choose a Backend

- Express (Node.js) — directory `server/`
  ```bash
  cd server
  npm install
  # Place Firebase Admin key: server/firebase-service-account.json
  npm run dev                 # default PORT 5000, auto-fallback if in use
  ```

- FastAPI (Python) — directory `backend/`
  ```bash
  cd backend
  python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate (non‑Windows)
  pip install -r requirements.txt
  # Create backend/.env (see variables below)
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```

### 3) Frontend
```bash
cd frontend
npm install
npm run dev     # http://localhost:5173 (or 5174)
```

### 4) Ollama
```bash
ollama serve
ollama pull llama3.1:8b
```

## Environment

- Frontend `frontend/.env` (example):
```env
VITE_API_URL=http://localhost:8000        # FastAPI
# or VITE_API_URL=http://localhost:5000   # Express
VITE_FB_API_KEY=YOUR_API_KEY
VITE_FB_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FB_PROJECT_ID=YOUR_PROJECT_ID
VITE_FB_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FB_MSG_SENDER=YOUR_SENDER_ID
VITE_FB_APP_ID=YOUR_APP_ID
```

- Backend (FastAPI) `backend/.env` (see `SETUP_INSTRUCTIONS.md`):
```env
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=25
OLLAMA_MODEL=llama3.1:8b
OLLAMA_URL=http://127.0.0.1:11434
EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174
```

- Backend (Express)
  - Place `server/firebase-service-account.json`
  - Port: `5000` by default with automatic increment fallback

## How It Works

- Uploads are saved under the backend’s `uploads/` folder.
- Text is extracted (PDF via `pdf-parse`, DOCX via `mammoth`).
- Ollama generates summaries, MCQs, and open questions grounded in the document text.
- Saved items (summaries/quizzes/question banks) can be listed and downloaded.

## API Overview

- Express (`server/index.js`, default `http://localhost:5000`):
  - `POST /upload` (auth)
  - `GET /files` (auth)
  - `POST /summarize` (auth)
  - `POST /quiz` (auth)
  - `POST /question-bank` (auth)
  - `GET /summaries` (auth), `GET /summary` (auth)
  - `GET /summaries-public`, `GET /summary-public`

- FastAPI (`backend/`, default `http://localhost:8000`): see `SETUP_INSTRUCTIONS.md` and `PROJECT_STATUS.md` for endpoints like `/upload`, `/files`, `/quiz`, `/summarize`, `/health`, `/docs`.

## Notes

- Frontend default `VITE_API_URL` targets FastAPI (`8000`). Switch to Express (`5000+`) if using Node backend.
- PPTX upload is supported; quiz/summarize support may vary by backend and may return an error for PPTX.
- Ensure Ollama is running locally before invoking AI endpoints.

## Additional Docs

- `SETUP_INSTRUCTIONS.md` — step‑by‑step environment and run guide
- `PROJECT_STATUS.md` — current capabilities and testing checklist
- `QUIZ_FEATURE_GUIDE.md` — quiz feature details (frontend/backend)
- `frontend/README.md`, `backend/README.md` — per‑package notes

---

For development scripts, see `frontend/package.json` and `server/package.json`. Keep this README in sync with changes.
