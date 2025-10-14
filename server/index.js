
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
const SUMMARIES_DB = path.join(__dirname, 'public', 'uploads', 'summaries.json');

// Add dependencies for summarization
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');

// Paths and helpers
function ensureUploadStore() {
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to ensure uploads directory:', err);
  }
  try {
    if (!fs.existsSync(FILES_DB)) {
      fs.writeFileSync(FILES_DB, JSON.stringify({}, null, 2));
    }
  } catch (err) {
    console.error('Failed to ensure files DB:', err);
  }
  try {
    if (!fs.existsSync(SUMMARIES_DB)) {
      fs.writeFileSync(SUMMARIES_DB, JSON.stringify({}, null, 2));
    }
  } catch (err) {
    console.error('Failed to ensure summaries DB:', err);
  }
}
// Run once on startup
ensureUploadStore();

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function writeJsonSafe(filePath, dataObj) {
  try { fs.writeFileSync(filePath, JSON.stringify(dataObj, null, 2)); } catch {}
}

function saveUserFile(uid, filename) {
  ensureUploadStore();
  let db = readJsonSafe(FILES_DB);
  if (!db[uid]) db[uid] = [];
  if (!db[uid].includes(filename)) db[uid].push(filename);
  writeJsonSafe(FILES_DB, db);
}

function saveUserSummary(uid, filename, summary) {
  ensureUploadStore();
  const key = uid || 'public';
  const db = readJsonSafe(SUMMARIES_DB);
  if (!db[key]) db[key] = {};
  db[key][filename] = {
    summary,
    savedAt: new Date().toISOString()
  };
  writeJsonSafe(SUMMARIES_DB, db);
}

function getUserSummaries(uid) {
  const key = uid || 'public';
  const db = readJsonSafe(SUMMARIES_DB);
  return db[key] || {};
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

// Start server with port fallback to avoid EADDRINUSE
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
function startWithFallback(port, attemptsLeft = 10) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use, trying ${nextPort}...`);
      startWithFallback(nextPort, attemptsLeft - 1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}
startWithFallback(DEFAULT_PORT);


// Summarization endpoint
// Expects: { fileUrl: string, userMessage?: string } in body, user must be authenticated
app.post('/summarize', authenticateToken, async (req, res) => {
  const { fileUrl, userMessage } = req.body;
  if (!fileUrl) return res.status(400).json({ error: 'No fileUrl provided' });

  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  const filename = path.basename(fileUrl);
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

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

  try {
    const systemPrompt = userMessage
      ? `You are a helpful assistant that answers strictly based on the provided document content. If the user asks for a quiz, generate clear MCQs with options and answers. If the question cannot be answered using the document, say you don't have enough information.`
      : `Provide a concise, structured summary of the document. Use bullet points for key points.`;

    const userPrompt = userMessage
      ? `User request: ${userMessage}\n\nDocument content follows:\n${text}`
      : `Summarize the following document:\n${text}`;

    const ollamaRes = await axios.post('http://localhost:11434/api/chat', {
      model: 'llama3.1:8b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false
    });

    let content = '';
    if (ollamaRes.data && ollamaRes.data.message && ollamaRes.data.message.content) {
      content = ollamaRes.data.message.content;
    } else if (ollamaRes.data.response) {
      content = ollamaRes.data.response;
    } else {
      content = JSON.stringify(ollamaRes.data);
    }

    if (!userMessage) {
      // Save only initial summaries
      saveUserSummary(req.user?.uid, filename, content);
    }
    res.json({ summary: content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get response from Ollama', details: err.message });
  }
});

// List summaries (auth)
app.get('/summaries', authenticateToken, (req, res) => {
  const summaries = getUserSummaries(req.user?.uid);
  res.json({ summaries });
});

// Get single summary (auth)
app.get('/summary', authenticateToken, (req, res) => {
  const { fileName } = req.query;
  if (!fileName) return res.status(400).json({ error: 'fileName is required' });
  const summaries = getUserSummaries(req.user?.uid);
  const s = summaries[fileName];
  if (!s) return res.status(404).json({ error: 'Summary not found' });
  res.json(s);
});

// Public fallback: list summaries saved under 'public'
app.get('/summaries-public', (req, res) => {
  const summaries = getUserSummaries('public');
  res.json({ summaries });
});

// Public fallback: get one summary saved under 'public'
app.get('/summary-public', (req, res) => {
  const { fileName } = req.query;
  if (!fileName) return res.status(400).json({ error: 'fileName is required' });
  const summaries = getUserSummaries('public');
  const s = summaries[fileName];
  if (!s) return res.status(404).json({ error: 'Summary not found' });
  res.json(s);
});

// Quiz generation endpoint
app.post('/quiz', authenticateToken, async (req, res) => {
  try {
    const { file_id, num_questions = 5 } = req.body;
    if (!file_id) {
      return res.status(400).json({ error: 'file_id is required' });
    }

    // file_id is the filename saved in uploads
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    const filename = path.basename(file_id);
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Extract text similar to summarize endpoint
    let text = '';
    try {
      if (filename.toLowerCase().endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else if (filename.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (filename.toLowerCase().endsWith('.pptx')) {
        // Basic PPTX support: try to read as text if available later; fallback
        return res.status(400).json({ error: 'PPTX quiz not supported yet' });
      } else {
        return res.status(400).json({ error: 'Unsupported file type for quiz' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to extract text', details: err.message });
    }

    // Prompt Ollama to generate quiz in strict JSON
    const systemPrompt = `You are an expert educator. Create high-quality multiple choice questions strictly from the provided document content. Always return valid JSON only.`;
    const userPrompt = `Create ${num_questions} MCQs from this content. Requirements:\n- Each question must have exactly 4 options (A, B, C, D)\n- Provide the correct answer as a single letter among A, B, C, D\n- Include a brief explanation\n\nReturn JSON of the form:\n{\n  "questions": [\n    {\n      "question": "...",\n      "options": ["Option A", "Option B", "Option C", "Option D"],\n      "answer": "A",\n      "explanation": "..."\n    }\n  ]\n}\n\nDocument content:\n${text.substring(0, 12000)}`; // limit to avoid overlong payload

    let content = '';
    try {
      const ollamaRes = await axios.post('http://localhost:11434/api/chat', {
        model: 'llama3.1:8b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false
      });
      if (ollamaRes.data && ollamaRes.data.message && ollamaRes.data.message.content) {
        content = ollamaRes.data.message.content;
      } else if (ollamaRes.data.response) {
        content = ollamaRes.data.response;
      } else {
        content = JSON.stringify(ollamaRes.data);
      }
    } catch (err) {
      console.error('Ollama error:', err.message);
      return res.status(500).json({ error: 'Failed to get response from Ollama', details: err.message });
    }

    // Try to parse JSON; clean code fences if present
    function tryParseJSON(text) {
      let t = (text || '').trim();
      if (t.startsWith('```json')) t = t.slice(7);
      if (t.endsWith('```')) t = t.slice(0, -3);
      try { return JSON.parse(t); } catch { return null; }
    }

    const parsed = tryParseJSON(content);
    let questions = [];
    if (parsed && Array.isArray(parsed.questions)) {
      for (const q of parsed.questions.slice(0, num_questions)) {
        if (!q || !q.question || !Array.isArray(q.options) || !q.answer) continue;
        // Normalize options to 4
        const opts = q.options.slice(0, 4);
        while (opts.length < 4) opts.push('');
        // Normalize answer to A-D
        const ans = String(q.answer).trim().toUpperCase();
        const validAns = ['A','B','C','D'].includes(ans) ? ans : 'A';
        questions.push({
          question: String(q.question),
          options: opts,
          answer: validAns,
          explanation: q.explanation ? String(q.explanation) : ''
        });
      }
    }

    // Fallback if parsing failed or empty
    if (!questions.length) {
      questions = [
        {
          question: 'Based on the provided material, what is a key concept discussed?',
          options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
          answer: 'A',
          explanation: 'Fallback question – ensure Ollama is running for AI-generated questions.'
        }
      ];
    }

    res.json({ file_id, num_questions: questions.length, questions });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Question bank generation endpoint
app.post('/question-bank', authenticateToken, async (req, res) => {
  try {
    const { file_id, num_questions = 10 } = req.body;
    if (!file_id) {
      return res.status(400).json({ error: 'file_id is required' });
    }

    // file_id is the filename saved in uploads
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    const filename = path.basename(file_id);
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Extract text similar to quiz endpoint
    let text = '';
    try {
      if (filename.toLowerCase().endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else if (filename.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (filename.toLowerCase().endsWith('.pptx')) {
        return res.status(400).json({ error: 'PPTX question bank not supported yet' });
      } else {
        return res.status(400).json({ error: 'Unsupported file type for question bank' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to extract text', details: err.message });
    }

    // Prompt Ollama to generate question bank in strict JSON
    const systemPrompt = `You are an expert educator. Create comprehensive multiple choice questions from the provided document content. Focus on creating a diverse question bank covering different aspects of the content. Always return valid JSON only.`;
    const userPrompt = `Create ${num_questions} MCQs from this content for a comprehensive question bank. Requirements:
- Each question must have exactly 4 options (A, B, C, D)
- Provide the correct answer as a single letter among A, B, C, D
- Include a brief explanation
- Cover different topics and difficulty levels from the document
- Ensure questions test understanding, not just memorization

Return JSON of the form:
{
  "questions": [
    {
      "question": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "A",
      "explanation": "..."
    }
  ]
}

Document content:
${text.substring(0, 15000)}`; // limit to avoid overlong payload

    let content = '';
    try {
      const ollamaRes = await axios.post('http://localhost:11434/api/chat', {
        model: 'llama3.1:8b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false
      });
      if (ollamaRes.data && ollamaRes.data.message && ollamaRes.data.message.content) {
        content = ollamaRes.data.message.content;
      } else if (ollamaRes.data.response) {
        content = ollamaRes.data.response;
      } else {
        content = JSON.stringify(ollamaRes.data);
      }
    } catch (err) {
      console.error('Ollama error:', err.message);
      return res.status(500).json({ error: 'Failed to get response from Ollama', details: err.message });
    }

    // Try to parse JSON; clean code fences if present
    function tryParseJSON(text) {
      let t = (text || '').trim();
      if (t.startsWith('```json')) t = t.slice(7);
      if (t.endsWith('```')) t = t.slice(0, -3);
      try { return JSON.parse(t); } catch { return null; }
    }

    const parsed = tryParseJSON(content);
    let questions = [];
    if (parsed && Array.isArray(parsed.questions)) {
      for (const q of parsed.questions.slice(0, num_questions)) {
        if (!q || !q.question || !Array.isArray(q.options) || !q.answer) continue;
        // Normalize options to 4
        const opts = q.options.slice(0, 4);
        while (opts.length < 4) opts.push('');
        // Normalize answer to A-D
        const ans = String(q.answer).trim().toUpperCase();
        const validAns = ['A','B','C','D'].includes(ans) ? ans : 'A';
        questions.push({
          question: String(q.question),
          options: opts,
          answer: validAns,
          explanation: q.explanation ? String(q.explanation) : ''
        });
      }
    }

    // Fallback if parsing failed or empty
    if (!questions.length) {
      questions = [
        {
          question: 'Based on the provided material, what is a key concept discussed?',
          options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
          answer: 'A',
          explanation: 'Fallback question – ensure Ollama is running for AI-generated questions.'
        },
        {
          question: 'Which of the following is mentioned in the document?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'B',
          explanation: 'Fallback question – ensure Ollama is running for AI-generated questions.'
        }
      ];
    }

    res.json({ file_id, num_questions: questions.length, questions });
  } catch (error) {
    console.error('Question bank generation error:', error);
    res.status(500).json({ error: 'Failed to generate question bank' });
  }
});