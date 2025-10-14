from fastapi import APIRouter, HTTPException
from models import QuizRequest
from db import get_file_by_id, get_user_from_token
import os
from rag import extract_text, chunk_text, generate_questions_from_chunks

router = APIRouter()

@router.get("/questionbank")
def get_questionbank():
    return {"message": "Question Bank route works!"}

@router.post("/questionbank")
async def generate_questionbank(request: QuizRequest):
    """
    Generate a question bank (only questions, no options or answers)
    from a given document.
    """
    try:
        print(f"Question bank request: file_id={request.file_id}, num_questions={request.num_questions}")

        # Get mock user for development
        user = get_user_from_token()
        print(f"Using user: {user.uid}")

        # Get file info
        file_info = get_file_by_id(request.file_id, user.uid)
        print(f"File info: {file_info}")

        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = file_info['filepath']
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        # Extract and process text
        raw_text = extract_text(file_path)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="No text content found in file")

        chunks = chunk_text(raw_text)
        if not chunks:
            raise HTTPException(status_code=400, detail="Unable to process document content")

        # Generate questions only (no options)
        questions = generate_questions_from_chunks(chunks, request.num_questions)

        if not questions:
            raise HTTPException(status_code=500, detail="Failed to generate questions")

        return {
            "file_id": request.file_id,
            "num_questions": len(questions),
            "questions": questions
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Question bank generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Question bank generation failed: {str(e)}")
