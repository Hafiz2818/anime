// api/otakudesu/home.js
import axios from 'axios';

export default async function handler(req, res) {
  try {
    const [ongoingRes, completedRes] = await Promise.all([
      fetch('/api/otakudesu/ongoing?page=1').then(r => r.json()),
      fetch('/api/otakudesu/completed?page=1').then(r => r.json())
    ]);

    const data = {
      statusCode: 200,
      statusMessage: 'OK',
      message: '',
      ok: true,
      data: {
        ongoing: {
          href: '/otakudesu/ongoing',
          otakudesuUrl: 'https://otakudesu.best/ongoing-anime/',
          animeList: ongoingRes.data.animeList.map(anime => ({
            title: anime.title,
            poster: anime.poster,
            episodes: anime.episodes,
            releaseDay: anime.releaseDay,
            latestReleaseDate: anime.latestReleaseDate,
            animeId: anime.animeId,
            href: `/otakudesu/anime/${anime.animeId}`,
            otakudesuUrl: `https://otakudesu.best/anime/${anime.animeId}/`
          }))
        },
        completed: {
          href: '/otakudesu/completed',
          otakudesuUrl: 'https://otakudesu.best/complete-anime/',
          animeList: completedRes.data.animeList.map(anime => ({
            title: anime.title,
            poster: anime.poster,
            episodes: anime.episodes,
            score: anime.score,
            lastReleaseDate: anime.lastReleaseDate,
            animeId: anime.animeId,
            href: `/otakudesu/anime/${anime.animeId}`,
            otakudesuUrl: `https://otakudesu.best/anime/${anime.animeId}/`
          }))
        }
      },
      pagination: null
    };

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal muat home' });
  }
}