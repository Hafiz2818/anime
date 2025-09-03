const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const port = 3000;

// Middleware untuk parsing URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Middleware untuk parsing JSON
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Proxy API requests untuk menghindari CORS
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