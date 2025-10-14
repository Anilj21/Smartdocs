// Entry point for Express backend
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT_ENV = process.env.PORT && Number(process.env.PORT)
const DEFAULT_PORT = Number.isFinite(PORT_ENV) ? PORT_ENV : 5000

function tryListen(startPort, maxTries = 10) {
  let attempt = 0
  function listenOn(port) {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && attempt < maxTries) {
        attempt += 1
        const nextPort = port + 1
        console.warn(`Port ${port} in use, trying ${nextPort}...`)
        listenOn(nextPort)
      } else {
        console.error('Failed to start server:', err)
        process.exit(1)
      }
    })
  }
  listenOn(startPort)
}

tryListen(DEFAULT_PORT)
