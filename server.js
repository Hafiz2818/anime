const express = require('express');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(express.static('public'));

app.get('/api/otakudesu/*', async (req, res) => {
  try {
    const apiUrl = 'https://api.bellonime.web.id/otakudesu/' + req.params[0] + 
                  (req.url.includes('?') ? `?${req.url.split('?')[1]}` : '');
    
    console.log(`[PROXY] Memproses request ke: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://otakudesu.best/',
        'Origin': 'https://otakudesu.best'
      },
      timeout: 10000
    });
    
    console.log(`[PROXY] Status response API: ${response.status}`);
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API Proxy Error:', error.message);
    
    if (error.response) {
      console.error('API Response Error:', {
        status: error.response.status,
        data: error.response.data
      });
      
      res.status(error.response.status).json({
        error: 'API returned an error',
        details: error.response.data,
        endpoint: req.params[0]
      });
    } else if (error.request) {
      res.status(500).json({
        error: 'No response from API',
        details: 'The request was made but no response was received',
        endpoint: req.params[0]
      });
    } else {
      res.status(500).json({
        error: 'Request error',
        details: error.message,
        endpoint: req.params[0]
      });
    }
  }
});

// --- Endpoint untuk menerima laporan bug ---
app.post('/api/report-bug', async (req, res) => {
  console.log('=== DEBUG: BREVO_API_KEY ===');
  console.log('Nilai BREVO_API_KEY:', process.env.BREVO_API_KEY);
  console.log('Panjang BREVO_API_KEY:', process.env.BREVO_API_KEY?.length);

  if (!process.env.BREVO_API_KEY) {
    console.error('❌ ERROR: BREVO_API_KEY tidak ditemukan di environment variables!');
    return res.status(500).json({ 
      success: false,
      error: 'Konfigurasi server tidak lengkap. Silakan coba lagi nanti.' 
    });
  }

  try {
    const { type, pageTitle, pageUrl, description, email } = req.body;

    if (!type || !description) {
      return res.status(400).json({ 
        success: false,
        error: 'Jenis laporan dan deskripsi wajib diisi.' 
      });
    }

    // Sanitasi input
    const sanitizeInput = (str) => {
      if (typeof str !== 'string') return '';
      return str.replace(/[<>'"&]/g, '').trim();
    };

    const sanitized = {
      type: sanitizeInput(type),
      pageTitle: sanitizeInput(pageTitle),
      pageUrl: sanitizeInput(pageUrl),
      description: sanitizeInput(description),
      email: sanitizeInput(email)
    };

    // Siapkan payload untuk Brevo API
    const emailPayload = {
      sender: {
        name: 'NontonAnime Bug Reporter',
        email: 'no-reply@nontonanime.com' // Bisa email apa saja, tidak harus verified
      },
      to: [
        {
          email: 'hapisnovalrianto@gmail.com', // Ganti dengan email tujuan Anda
          name: 'Admin NontonAnime'
        }
      ],
      subject: `[LAPORAN BUG] ${sanitized.type} - NontonAnime`,
      htmlContent: `
        <h2>Laporan Bug Baru</h2>
        <p><strong>Jenis Laporan:</strong> ${sanitized.type}</p>
        <p><strong>Halaman:</strong> ${sanitized.pageTitle}</p>
        <p><strong>URL:</strong> <a href="${sanitized.pageUrl}">${sanitized.pageUrl}</a></p>
        <p><strong>Email Pelapor:</strong> ${sanitized.email || 'Tidak disediakan'}</p>
        <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID')}</p>
        <p><strong>Browser:</strong> ${req.get('User-Agent')}</p>
        <hr>
        <h3>Deskripsi Lengkap:</h3>
        <p>${sanitized.description.replace(/\n/g, '<br>')}</p>
      `
    };

    // Kirim request ke Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY, // Ambil dari environment variable
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error(`Brevo API responded with status ${response.status}`);
    }

    console.log('✅ Email laporan bug berhasil dikirim via Brevo API!');

    res.json({ 
      success: true, 
      message: 'Laporan berhasil dikirim! Terima kasih atas masukannya.' 
    });

  } catch (error) {
    console.error('❌ Gagal mengirim email:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Gagal mengirim laporan. Silakan coba lagi nanti.' 
    });
  }
});

// Handle semua route lainnya untuk melayani file HTML utama
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan server di semua antarmuka jaringan (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
  console.log(`NontonAnime server berjalan di http://localhost:${port}`);
  console.log(`Akses dari perangkat lain di: http://<alamat-IP-anda>:${port}`);
  console.log('API proxy aktif di /api/otakudesu/*');
});