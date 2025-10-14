# SmartDocs Setup Instructions

## 🚀 Quick Start

Your SmartDocs project is now set up with:
- **Backend**: FastAPI with Firebase Firestore
- **Frontend**: React + Vite + Tailwind CSS
- **AI**: Ollama LLM integration for quiz generation and summarization
- **Storage**: Local file storage + Firebase metadata

## 📋 Prerequisites

### 1. Ollama Setup
```bash
# Install Ollama from https://ollama.com
# Start Ollama service
ollama serve

# Pull the model (in a new terminal)
ollama pull llama3.1:8b
```

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your project: `smartdocs-6c9ea`
3. Enable Firestore Database
4. Go to Project Settings → Service Accounts
5. Generate new private key (JSON file)
6. Save as `backend/firebase-service-account.json`

## 🔧 Backend Setup

### Environment Variables
Create `backend/.env`:
```env
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=25

# Ollama LLM Configuration
OLLAMA_MODEL=llama3.1:8b
OLLAMA_URL=http://127.0.0.1:11434

# Embeddings Model
EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2

# CORS Configuration
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Start Backend
```bash
cd backend
.\.venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🎨 Frontend Setup

### Environment Variables
Your `frontend/.env` is already configured with Firebase Auth keys.

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing the System

### 1. Test Ollama Connection
```bash
# Test if Ollama is running
curl http://127.0.0.1:11434/api/tags
```

### 2. Test Backend Endpoints
- **Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs
- **Upload**: POST http://localhost:8000/upload
- **Quiz**: POST http://localhost:8000/quiz
- **Summarize**: POST http://localhost:8000/summarize

### 3. Test File Upload
1. Go to http://localhost:5174 (or 5173)
2. Login with Firebase
3. Upload a PDF/DOCX/PPTX file
4. Check `backend/uploads/` folder for saved files
5. Check Firebase Console → Firestore for metadata

## 🔍 Troubleshooting

### Backend Issues
- **Firebase Error**: Check service account JSON path
- **Ollama Error**: Ensure `ollama serve` is running
- **Import Error**: Check virtual environment activation

### Frontend Issues
- **Firebase Auth Error**: Verify `.env` variables
- **Upload Failed**: Check backend logs and file permissions

### Ollama Issues
- **Model Not Found**: Run `ollama pull llama3.1:8b`
- **Connection Refused**: Start `ollama serve`

## 📁 Project Structure
```
Smartdocs/
├── backend/
│   ├── routes/          # API endpoints
│   ├── uploads/         # Local file storage
│   ├── rag.py          # AI processing
│   └── main.py         # FastAPI app
├── frontend/            # React app
└── firebase-service-account.json  # Firebase credentials
```

## 🎯 Next Steps
1. Test file upload with a sample document
2. Generate quiz questions using the `/quiz` endpoint
3. Create document summaries using the `/summarize` endpoint
4. Customize the frontend UI as needed

## 🆘 Support
If you encounter issues:
1. Check backend logs for error messages
2. Verify Ollama is running: `ollama list`
3. Check Firebase Console for database errors
4. Ensure all environment variables are set correctly





