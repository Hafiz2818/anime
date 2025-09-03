// api/otakudesu/schedule.js
import axios from 'axios';

export default async function handler(req, res) {
  // Daftar hari lengkap
  const days = [
    'Minggu', 'Senin', 'Selasa', 
    'Rabu', 'Kamis', 'Jumat', 'Sabtu'
  ];

  try {
    // Ambil data ongoing dari API kita sendiri (via proxy)
    const response = await axios.get('/api/otakudesu/ongoing', {
      params: { page: 1 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const animeList = response.data.data?.animeList || [];

    // Buat jadwal kosong
    const schedule = {};
    days.forEach(day => {
      schedule[day] = [];
    });

    // Kelompokkan anime berdasarkan releaseDay
    animeList.forEach(anime => {
      const day = anime.releaseDay?.trim();

      // Hanya masukkan jika hari valid dan anime punya episode
      if (day && days.includes(day)) {
        schedule[day].push({
          title: anime.title,
          episodes: anime.episodes,
          latestReleaseDate: anime.latestReleaseDate,
          animeId: anime.animeId,
          href: `/otakudesu/anime/${anime.animeId}`,
          poster: anime.poster
        });
      }
    });

    // Hapus hari yang kosong
    Object.keys(schedule).forEach(day => {
      if (schedule[day].length === 0) {
        delete schedule[day];
      }
    });

    // Kirim respons sesuai format Otakudesu
    res.status(200).json({
      ok: true,
      message: "",
      statusCode: 200,
      data: { schedule }
    });

  } catch (error) {
    console.error('Error generating /schedule:', error.message);
    res.status(500).json({
      error: 'Gagal memuat jadwal',
      details: 'Tidak dapat mengambil data ongoing'
    });
  }
}