import os
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional

# Global Firebase app instance
_firebase_app: Optional[firebase_admin.App] = None
_db: Optional[firestore.Client] = None


def initialize_firebase():
	"""Initialize Firebase Admin SDK"""
	global _firebase_app, _db
	
	if _firebase_app is None:
		try:
			# Check if we have a service account key file
			service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
			
			if service_account_path and os.path.exists(service_account_path):
				# Use service account file
				cred = credentials.Certificate(service_account_path)
				_firebase_app = firebase_admin.initialize_app(cred)
				print(f"Firebase initialized with service account: {service_account_path}")
			else:
				# Try to use default credentials (for local development)
				_firebase_app = firebase_admin.initialize_app()
				print("Firebase initialized with default credentials")
			
			_db = firestore.client()
			print("Firebase Firestore client created successfully")
			
		except Exception as e:
			print(f"Warning: Firebase initialization failed: {e}")
			print("The app will run in demo mode without database persistence")
			print("To enable Firebase, create a service account JSON file and set FIREBASE_SERVICE_ACCOUNT_PATH")
			# Create a mock database for demo purposes
			_db = MockFirestore()
	
	return _db


def get_db() -> firestore.Client:
	"""Get Firestore database client"""
	if _db is None:
		initialize_firebase()
	return _db


def close_firebase():
	"""Close Firebase connection"""
	global _firebase_app, _db
	if _firebase_app and not isinstance(_db, MockFirestore):
		firebase_admin.delete_app(_firebase_app)
		_firebase_app = None
		_db = None
		print("Firebase connection closed")


class MockFirestore:
	"""Mock Firestore for demo mode when Firebase credentials are not available"""
	
	def __init__(self):
		self.collections = {}
		print("Mock Firestore initialized for demo mode")
	
	def collection(self, name):
		if name not in self.collections:
			self.collections[name] = MockCollection(name)
		return self.collections[name]


class MockCollection:
	"""Mock collection for demo mode"""
	
	def __init__(self, name):
		self.name = name
		self.documents = {}
	
	def document(self, doc_id):
		if doc_id not in self.documents:
			self.documents[doc_id] = MockDocument(doc_id, self)
		return self.documents[doc_id]
	
	def where(self, field, operator, value):
		return MockQuery(self, field, operator, value)
	
	def order_by(self, field, direction=None):
		return MockQuery(self, field, "==", None, order_by=field, direction=direction)


class MockDocument:
	"""Mock document for demo mode"""
	
	def __init__(self, doc_id, collection):
		self.id = doc_id
		self.collection = collection
		self.data = {}
	
	def set(self, data):
		self.data = data
		print(f"Mock: Document {self.id} saved to {self.collection.name}")
	
	def get(self):
		return MockDocumentSnapshot(self.id, self.data, self.collection.name)


class MockDocumentSnapshot:
	"""Mock document snapshot for demo mode"""
	
	def __init__(self, doc_id, data, collection_name):
		self.id = doc_id
		self._data = data
		self.collection_name = collection_name
	
	def exists(self):
		return bool(self._data)
	
	def to_dict(self):
		return self._data


class MockQuery:
	"""Mock query for demo mode"""
	
	def __init__(self, collection, field, operator, value, order_by=None, direction=None):
		self.collection = collection
		self.field = field
		self.operator = operator
		self.value = value
		self.order_by = order_by
		self.direction = direction
	
	def stream(self):
		# Simple mock implementation
		docs = []
		for doc_id, doc in self.collection.documents.items():
			if doc.data.get(self.field) == self.value:
				docs.append(MockDocumentSnapshot(doc_id, doc.data, self.collection.name))
		return docs
