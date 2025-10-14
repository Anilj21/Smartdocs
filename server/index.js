
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
const SAVED_DB = path.join(__dirname, 'public', 'uploads', 'saved_items.json');

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
  try {
    if (!fs.existsSync(SAVED_DB)) {
      fs.writeFileSync(SAVED_DB, JSON.stringify({}, null, 2));
    }
  } catch (err) {
    console.error('Failed to ensure saved items DB:', err);
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

// Unified saved items store (summaries, quizzes, question banks)
function saveUserItem(uid, kind, filename, data) {
  ensureUploadStore();
  const key = uid || 'public';
  const db = readJsonSafe(SAVED_DB);
  if (!db[key]) db[key] = { items: {} };
  const id = `${kind}:${filename}`;
  db[key].items[id] = {
    id,
    kind,
    filename,
    title: `${filename} (${kind})`,
    savedAt: new Date().toISOString(),
    data
  };
  writeJsonSafe(SAVED_DB, db);
}

function getUserSaved(uid) {
  const key = uid || 'public';
  const db = readJsonSafe(SAVED_DB);
  return (db[key] && db[key].items) || {};
}

function getUserSavedItem(uid, kind, filename) {
  const items = getUserSaved(uid);
  const id = `${kind}:${filename}`;
  return items[id] || null;
}

// ---- Grounded question generation helpers ----
function sliceIntoChunks(str, chunkSize = 6000) {
  const chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) chunks.push(str.slice(i, i + chunkSize));
  return chunks;
}

function appearsInText(q, text) {
  try {
    const stop = new Set(['the','is','and','of','to','in','a','for','on','as','by','with','that','this','an','at','from','it','be','are','or','was','were','can','may']);
    const words = String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !stop.has(w));
    const t = String(text || '').toLowerCase();
    let hits = 0;
    for (const w of words) { if (t.includes(w)) { hits++; if (hits >= 3) return true; } }
    return words.length <= 3 ? hits >= 1 : false;
  } catch { return true; }
}

async function chatJSON({ systemPrompt, userPrompt }) {
  const resp = await axios.post('http://localhost:11434/api/chat', {
    model: 'llama3.1:8b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    stream: false,
    options: { temperature: 0.2, top_p: 0.9, repeat_penalty: 1.1 }
  });
  const data = resp.data;
  let content = '';
  if (data && data.message && data.message.content) content = data.message.content;
  else if (data && data.response) content = data.response;
  else content = JSON.stringify(data);
  // clean code fences if any
  let t = String(content || '').trim();
  if (t.startsWith('```json')) t = t.slice(7);
  if (t.endsWith('```')) t = t.slice(0, -3);
  try { return JSON.parse(t); } catch { return null; }
}

async function generateGroundedMCQs({ text, num }) {
  const chunks = sliceIntoChunks(text, 8000);
  const results = [];
  const seen = new Set();
  let remaining = Math.max(1, Math.min(50, num));
  const maxPasses = Math.max(chunks.length * 2, 3);
  let pass = 0;
  while (results.length < num && pass < maxPasses) {
    const chunk = chunks[pass % chunks.length];
    const batch = Math.min(6, remaining);
    const systemPrompt = `You are an expert educator and careful fact-checker. Create high-quality multiple choice questions strictly and only from the provided document text. Do not use outside knowledge. If a potential question cannot be fully supported by the document, do not include it. Always return valid JSON only.`;
    const prevList = results.map((q, i) => `${i+1}. ${q.question}`).join('\n');
    const userPrompt = `Create ${batch} MCQs grounded in the provided document CHUNK. Requirements:\n- Each question must be fully answerable using only this chunk\n- Exactly 4 options (A, B, C, D)\n- Provide the correct answer letter among A, B, C, D\n- Include a brief explanation grounded in the chunk\n- Avoid repeating any of these existing questions:\n${prevList || '(none)'}\n\nReturn JSON of the form:\n{\n  \"questions\": [\n    {\n      \"question\": \"...\",\n      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n      \"answer\": \"A\",\n      \"explanation\": \"...\"\n    }\n  ]\n}\n\nDocument CHUNK:\n${chunk}`;

    const parsed = await chatJSON({ systemPrompt, userPrompt });
    if (parsed && Array.isArray(parsed.questions)) {
      for (const item of parsed.questions) {
        if (!item) continue;
        if (typeof item === 'object' && item.question && Array.isArray(item.options) && item.options.length === 4 && typeof item.answer === 'string') {
          const q = String(item.question).trim();
          if (!q || seen.has(q)) continue;
          if (!appearsInText(q, text)) continue;
          const opts = item.options.map(o => String(o).trim()).slice(0, 4);
          const ans = String(item.answer).trim().toUpperCase();
          const expl = item.explanation ? String(item.explanation) : '';
          if (q && opts.every(Boolean) && ['A','B','C','D'].includes(ans)) {
            results.push({ question: q, options: opts, answer: ans, explanation: expl });
            seen.add(q);
            if (results.length >= num) break;
          }
        }
      }
    }
    remaining = num - results.length;
    pass++;
  }
  return results;
}

async function generateGroundedOpenQuestions({ text, num }) {
  const chunks = sliceIntoChunks(text, 9000);
  const results = [];
  const seen = new Set();
  let remaining = Math.max(1, Math.min(50, num));
  const maxPasses = Math.max(chunks.length * 2, 3);
  let pass = 0;
  while (results.length < num && pass < maxPasses) {
    const chunk = chunks[pass % chunks.length];
    const batch = Math.min(8, remaining);
    const systemPrompt = `You are an expert educator and careful fact-checker. Generate clear, open-ended questions strictly and only from the provided document text. Do not use outside knowledge. If a question cannot be fully supported by the document, do not include it. Do NOT include answers, options, or explanations. Always return valid JSON only.`;
    const prevList = results.map((q, i) => `${i+1}. ${q.question}`).join('\n');
    const userPrompt = `Create ${batch} open-ended questions grounded in the provided document CHUNK. Requirements:\n- Each question must be fully answerable using only this chunk\n- Questions must be stand-alone and unambiguous\n- Avoid repeating any of these existing questions:\n${prevList || '(none)'}\n\nReturn JSON exactly in this form:\n{\n  \"questions\": [\n    \"Question 1?\",\n    \"Question 2?\"\n  ]\n}\n\nDocument CHUNK:\n${chunk}`;

    const parsed = await chatJSON({ systemPrompt, userPrompt });
    if (parsed && Array.isArray(parsed.questions)) {
      for (const item of parsed.questions) {
        let q = '';
        if (typeof item === 'string') q = item.trim();
        else if (typeof item === 'object' && item.question) q = String(item.question).trim();
        if (!q || seen.has(q)) continue;
        if (!appearsInText(q, text)) continue;
        results.push({ question: q });
        seen.add(q);
        if (results.length >= num) break;
      }
    }
    remaining = num - results.length;
    pass++;
  }
  return results;
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
      try {
        saveUserItem(req.user?.uid, 'summary', filename, { summary: content });
      } catch {}
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

// Saved items: list all (auth)
app.get('/saved-items', authenticateToken, (req, res) => {
  const items = getUserSaved(req.user?.uid);
  res.json({ items });
});

// Saved item: get single (auth)
app.get('/saved-item', authenticateToken, (req, res) => {
  const { kind, fileName } = req.query;
  if (!kind || !fileName) return res.status(400).json({ error: 'kind and fileName are required' });
  const item = getUserSavedItem(req.user?.uid, String(kind), String(fileName));
  if (!item) return res.status(404).json({ error: 'Saved item not found' });
  res.json(item);
});

// Download saved item as .doc (auth)
app.get('/saved-item/download', authenticateToken, (req, res) => {
  const { kind, fileName } = req.query;
  if (!kind || !fileName) return res.status(400).json({ error: 'kind and fileName are required' });
  const item = getUserSavedItem(req.user?.uid, String(kind), String(fileName));
  if (!item) return res.status(404).json({ error: 'Saved item not found' });

  // Generate basic DOC-compatible text content
  let content = `Title: ${item.title}\nDate: ${new Date(item.savedAt).toLocaleString()}\nType: ${item.kind}\nFile: ${item.filename}\n\n`;
  if (item.kind === 'summary') {
    content += String(item.data?.summary || '');
  } else if (item.kind === 'quiz') {
    const qs = Array.isArray(item.data?.questions) ? item.data.questions : [];
    qs.forEach((q, i) => {
      content += `Q${i + 1}. ${q.question || ''}\n`;
      if (Array.isArray(q.options)) {
        ['A','B','C','D'].forEach((label, idx) => {
          if (q.options[idx] != null) content += `  ${label}. ${q.options[idx]}\n`;
        });
      }
      if (q.answer) content += `Answer: ${q.answer}\n`;
      if (q.explanation) content += `Explanation: ${q.explanation}\n`;
      content += `\n`;
    });
  } else if (item.kind === 'questionBank') {
    const qs = Array.isArray(item.data?.questions) ? item.data.questions : [];
    qs.forEach((q, i) => {
      const text = typeof q === 'string' ? q : (q?.question || '');
      content += `Q${i + 1}. ${text}\n\n`;
    });
  } else {
    content += JSON.stringify(item.data || {}, null, 2);
  }

  const safeName = `${item.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}_${item.kind}.doc`;
  res.setHeader('Content-Type', 'application/msword');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.send(content);
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

    // Generate grounded MCQs iteratively across document chunks
    let questions = await generateGroundedMCQs({ text, num: num_questions });

    // Fallback if parsing failed or empty
    if (!questions.length) {
      questions = [
        {
          question: 'Placeholder question due to parsing failure.',
          options: ['A', 'B', 'C', 'D'],
          answer: 'A',
          explanation: 'Fallback because model returned invalid JSON.'
        }
      ].slice(0, num_questions);
    }

    // Ensure exactly num_questions by padding with placeholders if needed
    while (questions.length < num_questions) {
      questions.push({
        question: `Placeholder question ${questions.length + 1}`,
        options: ['A', 'B', 'C', 'D'],
        answer: 'A',
        explanation: ''
      });
    }

    try { saveUserItem(req.user?.uid, 'quiz', filename, { questions }); } catch {}
    return res.json({ file_id, num_questions: questions.length, questions });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Question bank endpoint
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
  
    // Generate grounded open-ended questions iteratively across document chunks
    let questions = await generateGroundedOpenQuestions({ text, num: num_questions });

    // Fallback if parsing failed or empty
    if (!questions.length) {
      questions = [
        { question: 'What are the main topics discussed in the document?' },
        { question: 'Explain a key concept introduced in the document in your own words.' },
        { question: 'How does one major idea in the document relate to another?' }
      ].slice(0, num_questions);
    }

    // Ensure exactly num_questions by padding with placeholders if needed
    while (questions.length < num_questions) {
      questions.push({ question: `Placeholder question ${questions.length + 1}?` });
    }

    try { saveUserItem(req.user?.uid, 'questionBank', filename, { questions }); } catch {}
    return res.json({ file_id, num_questions: questions.length, questions });
  } catch (error) {
    console.error('Question bank generation error:', error);
    return res.status(500).json({ error: 'Failed to generate question bank' });
  }
});