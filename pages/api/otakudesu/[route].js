// pages/api/otakudesu/[route].js
import axios from 'axios';

export default async function handler(req, res) {
  // Ambil route dinamis
  const { route } = req.query; // Misal: ['ongoing'] atau ['genres', 'action']
  const endpoint = Array.isArray(route) ? route.join('/') : route;

  if (!endpoint) {
    return res.status(400).json({ error: 'Rute tidak boleh kosong' });
  }

  const apiUrl = `https://api.bellonime.web.id/otakudesu/${endpoint}`;

  // Tambahkan query params jika ada
  const queryParams = new URLSearchParams(req.query);
  // Hapus 'route' dari query karena sudah dipakai
  const cleanParams = new URLSearchParams();
  for (let [key, value] of queryParams) {
    if (key !== 'route') cleanParams.append(key, value);
  }

  const finalUrl = cleanParams.toString() ? `${apiUrl}?${cleanParams}` : apiUrl;

  try {
    console.log('[PROXY] Mengakses:', finalUrl);

    const response = await axios.get(finalUrl, {
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
    console.error('Error di proxy:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'API eksternal gagal',
        status: error.response.status,
        details: error.response.data,
      });
    }
    res.status(500).json({ error: 'Gagal terhubung ke API' });
  }
}