// api/otakudesu/[...proxy].js
import axios from 'axios';

const API_BASE = 'https://api.bellonime.web.id/otakudesu';

export default async function handler(req, res) {
  const { params } = req.query;
  const path = params.join('/');
  const url = `${API_BASE}/${path}`;

  try {
    const response = await axios.get(url, {
      params: req.query,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://otakudesu.best/',
        'Origin': 'https://otakudesu.best'
      },
      timeout: 10000
    });
    res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: 'Proxy request failed',
      route: path,
      status
    });
  }
}