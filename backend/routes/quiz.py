from fastapi import APIRouter, HTTPException
from firebase_admin import firestore

from db import get_db
from models import QuizRequest, QuizResponse, MCQ
from rag import extract_text, chunk_text, build_or_load_vectorstore, generate_quiz_from_chunks


router = APIRouter()


@router.post("/quiz", response_model=QuizResponse)
async def create_quiz(payload: QuizRequest):
	db = get_db()
	try:
		file_doc = db.collection("files").document(payload.file_id).get()
		if not file_doc.exists:
			raise HTTPException(status_code=404, detail="File not found")
		
		file_data = file_doc.to_dict()
		filepath = file_data["filepath"]
		
	except Exception as e:
		raise HTTPException(status_code=400, detail=f"Invalid file_id: {str(e)}")

	try:
		# Extract text from document
		text = extract_text(filepath)
		if not text.strip():
			raise HTTPException(status_code=400, detail="Document contains no extractable text")
		
		# Chunk the text for processing
		chunks = chunk_text(text)
		if not chunks:
			raise HTTPException(status_code=400, detail="Could not process document text")
		
		# Build vectorstore if not exists
		build_or_load_vectorstore(payload.file_id, chunks)

		# Generate quiz using Ollama LLM
		questions_raw = generate_quiz_from_chunks(chunks, payload.num_questions)
		questions = [MCQ(**q) for q in questions_raw]
		
		return QuizResponse(
			file_id=payload.file_id,
			num_questions=payload.num_questions,
			questions=questions
		)
		
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
