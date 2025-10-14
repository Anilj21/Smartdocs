from fastapi import APIRouter, HTTPException, Depends
from models import QuizRequest, QuizResponse, MCQ
from db import get_file_by_id, get_user_from_token
import os
from rag import extract_text, chunk_text, generate_quiz_from_chunks

router = APIRouter()

@router.get("/quiz")
def get_quiz():
    return {"message": "Quiz route works!"}

@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """Generate quiz questions from a document"""
    try:
        print(f"Quiz generation request: file_id={request.file_id}, num_questions={request.num_questions}")
        
        # Get mock user for development
        user = get_user_from_token()
        print(f"Using user: {user.uid}")
        
        # Get file information
        file_info = get_file_by_id(request.file_id, user.uid)
        print(f"File info: {file_info}")
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Extract text from the file
        file_path = file_info['filepath']
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        # Extract and process text
        raw_text = extract_text(file_path)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="No text content found in file")
        
        # Chunk the text
        chunks = chunk_text(raw_text)
        if not chunks:
            raise HTTPException(status_code=400, detail="Unable to process document content")
        
        # Generate quiz questions
        quiz_questions = generate_quiz_from_chunks(chunks, request.num_questions)
        
        if not quiz_questions:
            raise HTTPException(status_code=500, detail="Failed to generate quiz questions")
        
        # Convert to MCQ format
        mcq_questions = []
        for q in quiz_questions:
            mcq = MCQ(
                question=q['question'],
                options=q['options'],
                answer=q['answer'],
                explanation=q.get('explanation'),
                source_chunks=q.get('source_chunks', [])
            )
            mcq_questions.append(mcq)
        
        return QuizResponse(
            file_id=request.file_id,
            num_questions=len(mcq_questions),
            questions=mcq_questions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

