from fastapi import APIRouter, HTTPException

from db import get_db
from models import SummarizeRequest, SummarizeResponse
from rag import extract_text, chunk_text, summarize_document


router = APIRouter()


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_file(payload: SummarizeRequest):
	"""Generate a summary and key points for a document using Ollama LLM"""
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
		
		# Generate summary using Ollama LLM
		summary_data = summarize_document(chunks, payload.max_length)
		
		return SummarizeResponse(
			file_id=payload.file_id,
			summary=summary_data["summary"],
			key_points=summary_data["key_points"],
			word_count=summary_data["word_count"]
		)
		
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
