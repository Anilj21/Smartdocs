from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import List, Optional


class FileMeta(BaseModel):
	user_id: str
	filename: str
	filepath: str
	filetype: str
	upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class QuizRequest(BaseModel):
	file_id: str
	num_questions: int = 5


class MCQ(BaseModel):
	question: str
	options: List[str]
	answer: str
	explanation: str | None = None
	source_chunks: List[str] | None = None


class QuizResponse(BaseModel):
	file_id: str
	num_questions: int
	questions: List[MCQ]


class SummarizeRequest(BaseModel):
	file_id: str
	max_length: int = 500


class SummarizeResponse(BaseModel):
	file_id: str
	summary: str
	key_points: List[str]
	word_count: int
