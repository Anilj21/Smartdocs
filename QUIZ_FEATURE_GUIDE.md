# Quiz Generation Feature Guide

## Overview
The quiz generation feature allows users to create multiple-choice questions from their uploaded documents using AI. This feature is integrated into the SmartDocs application and provides an interactive way to test knowledge based on document content.

## Features

### 1. Document Selection
- Users can select from their uploaded documents (PDF, DOCX, PPTX)
- File selection dropdown shows all available documents
- Only documents that belong to the authenticated user are shown

### 2. Quiz Configuration
- Users can specify the number of questions (1-20)
- Default is set to 5 questions
- Real-time validation ensures valid input

### 3. AI-Powered Question Generation
- Uses Ollama LLM to generate intelligent questions
- Questions are directly based on document content
- Each question includes:
  - Clear, unambiguous question text
  - 4 multiple-choice options (A, B, C, D)
  - Correct answer with explanation
  - Source chunks from the document

### 4. Enhanced UI/UX
- Modern, responsive design with Tailwind CSS
- Clear visual hierarchy and spacing
- Loading states and error handling
- Success feedback when quiz is generated
- Professional quiz display with proper formatting

## Technical Implementation

### Backend (Python/FastAPI)
- **Endpoint**: `POST /quiz`
- **Request Model**: `QuizRequest` with `file_id` and `num_questions`
- **Response Model**: `QuizResponse` with generated questions
- **AI Integration**: Uses Ollama LLM for question generation
- **Document Processing**: Extracts text, chunks content, and generates embeddings

### Frontend (React)
- **Component**: `Quiz.jsx` with enhanced UI
- **API Integration**: Updated `generateQuiz` function
- **State Management**: Loading, error, and success states
- **File Handling**: Works with file IDs instead of filenames

### Key Files Modified
1. `backend/routes/quiz.py` - Quiz generation endpoint
2. `backend/db.py` - Added `get_file_by_id` function
3. `backend/models.py` - Quiz request/response models
4. `frontend/src/pages/Quiz.jsx` - Enhanced quiz interface
5. `frontend/src/api.js` - Updated API functions

## Usage Instructions

1. **Upload Documents**: First, upload PDF, DOCX, or PPTX files through the upload page
2. **Navigate to Quiz**: Go to the Quiz page in the application
3. **Select Document**: Choose a document from the dropdown
4. **Configure Quiz**: Set the number of questions (1-20)
5. **Generate Quiz**: Click "Generate Quiz" button
6. **Review Questions**: View generated questions with answers and explanations

## Requirements

- Ollama LLM running locally (default: llama3.1:8b)
- Uploaded documents in supported formats
- User authentication (Firebase)
- Backend server running on port 5001
- Frontend development server running

## Error Handling

- File not found errors
- Document processing failures
- AI generation failures with fallback questions
- Network connectivity issues
- User authentication errors

## Future Enhancements

- Quiz difficulty levels
- Question categories/topics
- Quiz sharing and export
- Interactive quiz taking mode
- Performance analytics
- Custom question templates
