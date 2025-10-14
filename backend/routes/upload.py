import os
import shutil
from datetime import datetime, timezone
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Body
from fastapi import Query
from fastapi.responses import JSONResponse
import uuid
from firebase_admin import firestore

from db import get_db
from models import FileMeta

router = APIRouter()

ALLOWED_EXTS = {"pdf", "docx", "pptx"}
MAX_MB = 25


def get_upload_dir() -> str:
	upload_dir = os.getenv("UPLOAD_DIR", "uploads")
	if not os.path.exists(upload_dir):
		os.makedirs(upload_dir, exist_ok=True)
	return upload_dir


# Delete file endpoint
@router.delete("/delete-file")
async def delete_file(
	filename: str = Body(...),
	user_id: str = Query(...)
):
	try:
		# Find file in uploads dir
		upload_dir = get_upload_dir()
		file_path = os.path.join(upload_dir, filename)
		if not os.path.exists(file_path):
			raise HTTPException(status_code=404, detail="File not found")

		# Remove file from disk
		os.remove(file_path)

		# Remove metadata from Firestore
		db = get_db()
		# Find the file doc for this user and filename
		docs = db.collection("files").where("user_id", "==", user_id).where("filename", "==", filename).stream()
		for doc in docs:
			doc.reference.delete()

		return {"detail": "File deleted"}
	except Exception as e:
		print(f"Delete file error: {str(e)}")
		raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.post("/upload")
async def upload_file(user_id: str = Query(...), file: UploadFile = File(...)):
	try:
		if not file.filename:
			raise HTTPException(status_code=400, detail="No file provided")
		
		file_ext = (file.filename.split(".")[-1] or "").lower()
		if file_ext not in ALLOWED_EXTS:
			raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}. Supported types are: {', '.join(ALLOWED_EXTS)}")

		# Validate size (stream to temp)
		tmp_path = os.path.join(get_upload_dir(), f"tmp_{uuid.uuid4()}.{file_ext}")
		bytes_written = 0
		
		with open(tmp_path, "wb") as out:
			while True:
				chunk = await file.read(1024 * 1024)
				if not chunk:
					break
				bytes_written += len(chunk)
				if bytes_written > MAX_MB * 1024 * 1024:
					out.close()
					os.remove(tmp_path)
					raise HTTPException(status_code=400, detail=f"File exceeds {MAX_MB}MB limit")
				out.write(chunk)

		final_path = os.path.join(get_upload_dir(), file.filename)
		# If filename exists, append UUID
		if os.path.exists(final_path):
			stem, ext = os.path.splitext(file.filename)
			final_path = os.path.join(get_upload_dir(), f"{stem}_{uuid.uuid4()}{ext}")

		shutil.move(tmp_path, final_path)

		# Save metadata to Firebase
		db = get_db()
		file_id = str(uuid.uuid4())
		
		meta = FileMeta(
			user_id=user_id,
			filename=os.path.basename(final_path),
			filepath=final_path,
			filetype=file_ext,
			upload_date=datetime.now(timezone.utc),
		)
		
		# Convert to dict and add file_id
		meta_dict = meta.model_dump()
		meta_dict["file_id"] = file_id
		
		# Save to Firestore
		doc_ref = db.collection("files").document(file_id)
		doc_ref.set(meta_dict)
		
		print(f"File uploaded successfully: {file_id} -> {final_path}")
		
		return JSONResponse({
			"file_id": file_id,
			"user_id": meta.user_id,
			"filename": meta.filename,
			"filepath": meta.filepath,
			"filetype": meta.filetype,
			"upload_date": meta.upload_date.isoformat(),
		})
		
	except Exception as e:
		print(f"Upload error: {str(e)}")
		raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/files")
async def list_files(user_id: str = Query(...)):
	try:
		db = get_db()
		items = []
		
		print(f"Listing files for user: {user_id}")
		
		# Query Firestore for user's files
		docs = db.collection("files").where("user_id", "==", user_id).order_by("upload_date", direction=firestore.Query.DESCENDING).stream()
		
		for doc in docs:
			doc_data = doc.to_dict()
			doc_data["file_id"] = doc.id
			items.append(doc_data)
			print(f"Found file: {doc_data.get('filename', 'Unknown')}")
		
		print(f"Total files found: {len(items)}")
		return items
		
	except Exception as e:
		print(f"List files error: {str(e)}")
		# Return empty array instead of raising exception for better UX
		return []