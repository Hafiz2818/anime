require('dotenv').config();

const express = require('express');
const path = require('path');
const axios = require('axios');
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 3000;

const jwtSecret = process.env.JWT_SECRET;

// --- Inisialisasi Firebase Admin SDK ---
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK terhubung');
  } catch (error) {
    console.error('❌ Gagal parse FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
  }
} else {
  console.warn('⚠️  Firebase Admin tidak diaktifkan (FIREBASE_SERVICE_ACCOUNT_KEY tidak ditemukan)');
}

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- Middleware: Verifikasi Token Firebase ---
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'No token provided' });
  }

  const idToken = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// --- Cek Login ---
app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({
    loggedIn: true,
    user: {
      uid: req.user.uid,
      email: req.user.email
    }
  });
});

// --- Proxy API Otakudesu ---
app.get('/api/otakudesu/*', async (req, res) => {
  try {
    const baseUrl = 'https://api.bellonime.web.id/otakudesu'; // ✅ No extra space
    const endpoint = req.params[0];
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const apiUrl = `${baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log(`[PROXY] Memproses request ke: ${apiUrl}`);

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://otakudesu.best/',
        'Origin': 'https://otakudesu.best'
      },
      timeout: 10000
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json({
        error: 'API returned an error',
        details: error.response.data
      });
    } else {
      res.status(500).json({ error: 'Request failed' });
    }
  }
});

// --- Handle SPA Routing ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Jalankan Server ---
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ NontonAnime server berjalan di http://localhost:${port}`);
  console.log('🔌 Firebase Auth: aktif jika FIREBASE_SERVICE_ACCOUNT_KEY tersedia');
});