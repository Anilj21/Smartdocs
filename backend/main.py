from fastapi import FastAPI
from routes.quiz import quiz_router
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from routes.upload import router as upload_router
from routes.quiz import router as quiz_router
from routes.summarize import router as summarize_router
from db import initialize_firebase, close_firebase


def ensure_directory(path: str) -> None:
	if not os.path.exists(path):
		os.makedirs(path, exist_ok=True)


def create_app() -> FastAPI:
	# Load environment variables from .env if present
	load_dotenv()
	app = FastAPI(title="SmartDocs API", version="0.1.0")

	# Updated CORS configuration to include both frontend ports
	allow_origins = [
		"http://localhost:5173",
		"http://localhost:5174", 
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174"
	]
	
	app.add_middleware(
		CORSMiddleware,
		allow_origins=allow_origins,
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)

	upload_dir = os.getenv("UPLOAD_DIR", "uploads")
	ensure_directory(upload_dir)

	app.include_router(upload_router, prefix="", tags=["upload"])
	app.include_router(quiz_router, prefix="", tags=["quiz"])
	app.include_router(summarize_router, prefix="", tags=["summarize"])

	@app.on_event("startup")
	async def startup_event():
		"""Initialize Firebase on startup"""
		initialize_firebase()

	@app.on_event("shutdown")
	async def shutdown_event():
		"""Cleanup Firebase on shutdown"""
		close_firebase()

	@app.get("/health")
	async def health() -> dict:
		return {"status": "ok"}

	return app


app = create_app()
