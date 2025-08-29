
// Entry point for Express backend
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ...existing code...


// Firebase Admin SDK initialization
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Multer setup for file uploads (store in public/uploads)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Auth middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Login endpoint (client should get token from Firebase client SDK)
app.post('/login', async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    res.json({ uid: decodedToken.uid, email: decodedToken.email });
  } catch (err) {
    res.status(401).json({ error: 'Invalid ID token' });
  }
});

// File upload endpoint (protected)
const fs = require('fs');
const FILES_DB = path.join(__dirname, 'public', 'uploads', 'files.json');

// Add dependencies for summarization
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');

function saveUserFile(uid, filename) {
  let db = {};
  if (fs.existsSync(FILES_DB)) {
    db = JSON.parse(fs.readFileSync(FILES_DB, 'utf-8'));
  }
  if (!db[uid]) db[uid] = [];
  if (!db[uid].includes(filename)) db[uid].push(filename);
  fs.writeFileSync(FILES_DB, JSON.stringify(db, null, 2));
}

app.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const publicUrl = `/public/uploads/${req.file.originalname}`;
  saveUserFile(req.user.uid, req.file.originalname);
  res.json({ filename: req.file.originalname, url: publicUrl });
});

// Endpoint to get user files
app.get('/files', authenticateToken, (req, res) => {
  let db = {};
  if (fs.existsSync(FILES_DB)) {
    db = JSON.parse(fs.readFileSync(FILES_DB, 'utf-8'));
  }
  const files = db[req.user.uid] || [];
  res.json({ files });
});

// Health check
app.get('/', (req, res) => {
  res.send('Express backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Summarization endpoint
// Expects: { fileUrl: string } in body, user must be authenticated
app.post('/summarize', authenticateToken, async (req, res) => {
  const { fileUrl } = req.body;
  if (!fileUrl) return res.status(400).json({ error: 'No fileUrl provided' });

  // Only allow summarization of files in uploads directory
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  const filename = path.basename(fileUrl);
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Extract text based on file type
  let text = '';
  try {
    if (filename.toLowerCase().endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (filename.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else {
      return res.status(400).json({ error: 'Unsupported file type for summarization' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to extract text', details: err.message });
  }

  // Call Ollama's llama LLM (assume running locally on http://localhost:11434)
  try {
    const ollamaRes = await axios.post('http://localhost:11434/api/chat', {
      model: 'llama3.1:8b',
      messages: [
        { role: 'user', content: `Summarize the following document:\n${text}` }
      ],
      stream: false
    });
    // Try to extract summary from response (Ollama chat API returns { message: { content: ... } })
    let summary = '';
    if (ollamaRes.data && ollamaRes.data.message && ollamaRes.data.message.content) {
      summary = ollamaRes.data.message.content;
    } else if (ollamaRes.data.response) {
      summary = ollamaRes.data.response;
    } else {
      summary = JSON.stringify(ollamaRes.data);
    }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get summary from Ollama', details: err.message });
  }
});
