# SmartDocs Backend (FastAPI)

## Requirements
- Python 3.11+
- MongoDB running locally (or change `MONGO_URI`)
- Optional: `ollama` with a local model (e.g., `llama3.1:8b`)

## Setup
1. Create and activate a virtual environment.
2. Install dependencies:
```
pip install -r requirements.txt
```
3. Create `.env` (see variables below) or export env vars.
4. Run the server:
```
uvicorn main:app --reload
```

## Environment Variables
```
MONGO_URI=mongodb://localhost:27017
DB_NAME=smartdocs
UPLOAD_DIR=uploads
EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2
VECTOR_DB=chroma
OLLAMA_MODEL=llama3.1:8b
ALLOW_ORIGINS=http://localhost:5173
```

## Endpoints
- `POST /upload?user_id=<uid>` — upload `.pdf|.docx|.pptx` up to 25MB.
- `GET /files?user_id=<uid>` — list user files.
- `POST /quiz` — body: `{ "file_id": "...", "num_questions": 5 }`.

## Notes
- Uploads are saved under `uploads/`.
- Vector store persists under `.chroma/<file_id>/`.
- Quiz generation uses a placeholder. Integrate `ollama` for real MCQs by replacing `generate_quiz_from_chunks` with an LLM call using retrieved context.




