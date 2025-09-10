document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  setupSearch();
  setupMobileSearch();
  handleRoute();
  window.addEventListener('popstate', handleRoute);
});

function initRouter() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-page]');
    if (link && link.href) {
      e.preventDefault();
      const href = new URL(link.href).pathname;

      // --- SIMPAN URL SAAT INI JIKA MENUJU HALAMAN /report ---
      if (href === '/report') {
        localStorage.setItem('bugReportSourceUrl', window.location.href);
        localStorage.setItem('bugReportSourceTitle', document.title);
      }

      navigateTo(href);
    }
  });
}
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) navigateTo('/search', { q: query });
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) navigateTo('/search', { q: query });
    }
  });
}

function setupMobileSearch() {
  const mobileSearchBtn = document.getElementById('mobileSearchButton');
  const searchOverlay = document.getElementById('searchOverlay');
  const closeSearchBtn = document.getElementById('closeSearchBtn');
  const overlaySearchInput = document.getElementById('overlaySearchInput');
  const searchIconBtn = document.getElementById('searchIconBtn');
  const searchResults = document.getElementById('searchResults');

  if (!mobileSearchBtn || !searchOverlay || !closeSearchBtn || !overlaySearchInput || !searchIconBtn) {
    console.error('Elemen mobile search tidak ditemukan di DOM');
    return;
  }

  mobileSearchBtn.addEventListener('click', () => {
    searchOverlay.style.display = 'flex';
    overlaySearchInput.focus();
  });

  closeSearchBtn.addEventListener('click', () => {
    searchOverlay.style.display = 'none';
    overlaySearchInput.value = '';
    searchResults.innerHTML = '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay.style.display === 'flex') {
      closeSearchBtn.click();
    }
  });

  overlaySearchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const query = overlaySearchInput.value.trim();
      if (!query) return;

      searchResults.innerHTML = '<p>Mencari...</p>';

      try {
        const data = await fetchData(`/search?q=${encodeURIComponent(query)}`);
        if (data?.ok && data.data?.animeList?.length > 0) {
          searchResults.innerHTML = `
            <div class="anime-grid">
              ${data.data.animeList.slice(0, 20).map(anime => `
                <div class="anime-card">
                  <a href="/anime/${anime.animeId}" onclick="closeSearchBtn.click()">
                    ${anime.poster ? `
                      <img src="${anime.poster.trim()}" alt="${anime.title}" class="anime-thumbnail">
                    ` : `
                      <div class="anime-thumbnail-placeholder">
                        <span>${anime.title.charAt(0)}</span>
                      </div>
                    `}
                    <div class="anime-info">
                      <h3 class="anime-title">${truncateTitle(anime.title)}</h3>
                    </div>
                  </a>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          searchResults.innerHTML = '<p>Tidak ada hasil ditemukan.</p>';
        }
      } catch (err) {
        searchResults.innerHTML = '<p>Gagal memuat hasil pencarian.</p>';
      }
    }
  });

  searchIconBtn.addEventListener('click', () => {
    overlaySearchInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
  });
}

function navigateTo(path, params = {}) {
  const url = new URL(path, window.location.origin);
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });
  window.history.pushState({}, '', url);
  handleRoute();
}

function handleRoute() {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading anime content...</p>
    </div>
  `;

  if (path === '/' || path === '/home') {
    loadHomePage();
  } else if (path === '/schedule') {
    loadSchedulePage();
  } else if (path === '/anime') {
    const page = searchParams.get('page') || 1;
    loadAllAnimePage(page);
  } else if (path === '/genres') {
    loadAllGenresPage();
  } else if (path === '/ongoing') {
    const page = searchParams.get('page') || 1;
    loadOngoingAnime(page);
  } else if (path === '/completed') {
    const page = searchParams.get('page') || 1;
    loadCompletedAnime(page);
  } else if (path === '/search') {
    const query = searchParams.get('q');
    if (query) {
      searchAnime(query);
    } else {
      showErrorMessage('Silakan masukkan kata kunci pencarian');
    }
  } else if (path.startsWith('/genres/')) {
    const genreId = path.split('/').pop();
    const page = searchParams.get('page') || 1;
    loadGenreAnime(genreId, page);
  } else if (path.startsWith('/anime/')) {
    const animeId = path.split('/').pop();
    loadAnimeDetail(animeId);
  } else if (path.startsWith('/episode/')) {
    const episodeId = path.split('/').pop();
    loadEpisode(episodeId);
  } else if (path.startsWith('/server/')) {
    const serverId = path.split('/').pop();
    loadServer(serverId);
  } else if (path.startsWith('/batch/')) {
    const batchId = path.split('/').pop();
    loadBatch(batchId);
  } else if (path === '/report') { 
    loadReportPage(); 
  } else {
    show404();
  }

  updateMobileNav();
}

async function fetchData(endpoint) {
  try {
    const response = await fetch(`/api/otakudesu${endpoint}`);
    if (!response.ok) {
      throw new Error(`Permintaan API gagal dengan status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Kesalahan pengambilan data:', error);
    throw error;
  }
}

// === Fungsi Pemuatan Halaman ===
async function loadHomePage() {
  try {
    const homeData = await fetchData('/home');
    renderHomePage(homeData);
  } catch (error) {
    showErrorMessage('Gagal memuat halaman beranda. Silakan coba lagi nanti.');
  }
}

async function loadSchedulePage() {
  try {
    const scheduleData = await fetchData('/schedule');
    renderSchedulePage(scheduleData);
  } catch (error) {
    showErrorMessage('Gagal memuat jadwal tayang. Silakan coba lagi nanti.');
  }
}

async function loadAllAnimePage(page = 1) {
  try {
    const animeData = await fetchData('/anime');
    renderAllAnimePage(animeData, parseInt(page));
  } catch (error) {
    showErrorMessage('Gagal memuat daftar anime. Silakan coba lagi nanti.');
  }
}

async function loadAllGenresPage() {
  try {
    const genresData = await fetchData('/genres');
    renderAllGenresPage(genresData);
  } catch (error) {
    showErrorMessage('Gagal memuat daftar genre. Silakan coba lagi nanti.');
  }
}

async function loadOngoingAnime(page = 1) {
  try {
    const data = await fetchData(`/ongoing?page=${page}`);
    renderAnimeListPage(data, 'Anime Sedang Tayang', 'ongoing');
  } catch (error) {
    showErrorMessage('Gagal memuat anime sedang tayang. Silakan coba lagi nanti.');
  }
}

async function loadCompletedAnime(page = 1) {
  try {
    const data = await fetchData(`/completed?page=${page}`);
    renderAnimeListPage(data, 'Anime Sudah Tamat', 'completed');
  } catch (error) {
    showErrorMessage('Gagal memuat anime sudah tamat. Silakan coba lagi nanti.');
  }
}

async function searchAnime(query) {
  try {
    const data = await fetchData(`/search?q=${encodeURIComponent(query)}`);
    renderSearchResults(query, data);
  } catch (error) {
    showErrorMessage(`Tidak ada hasil ditemukan untuk "${query}". Silakan coba pencarian lain.`);
  }
}

async function loadGenreAnime(genreId, page = 1) {
  try {
    const data = await fetchData(`/genres/${genreId}?page=${page}`);
    renderGenrePage(genreId, data, page);
  } catch (error) {
    showErrorMessage(`Gagal memuat anime untuk genre "${genreId}". Silakan coba lagi nanti.`);
  }
}

async function loadAnimeDetail(animeId) {
  try {
    const data = await fetchData(`/anime/${animeId}`);
    renderAnimeDetail(data);
  } catch (error) {
    showErrorMessage(`Gagal memuat detail anime "${animeId}". Silakan coba lagi nanti.`);
  }
}

async function loadEpisode(episodeId) {
  try {
    const data = await fetchData(`/episode/${episodeId}`);
    renderEpisodePage(data);
    setupQualityTabs();
  } catch (error) {
    showErrorMessage(`Gagal memuat episode "${episodeId}". Silakan coba lagi nanti.`);
  }
}

async function loadServer(serverId) {
  try {
    const data = await fetchData(`/server/${serverId}`);
    if (!data || !data.ok || !data.data) {
      throw new Error('Invalid server data received');
    }
    if (data.data.redirectUrl) {
      window.location.href = data.data.redirectUrl;
      return;
    }
    renderServerPage(data);
  } catch (error) {
    showErrorMessage(`Gagal memuat server "${serverId}". Silakan coba lagi nanti.`);
  }
}

async function loadBatch(batchId) {
  try {
    const data = await fetchData(`/batch/${batchId}`);
    renderBatchPage(data);
  } catch (error) {
    showErrorMessage(`Gagal memuat batch "${batchId}". Silakan coba lagi nanti.`);
  }
}

async function loadReportPage() {
  renderReportPage();
}

// === Fungsi Rendering ===
function loadEmailJS() { // ✅ Ganti IIFE menjadi fungsi biasa
  return new Promise((resolve, reject) => {
    if (window.emailjs) {
      resolve(window.emailjs);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'; // ✅ HAPUS SPASI EKSTRA
    script.async = true;
    script.onload = () => {
      if (window.emailjs) {
        window.emailjs.init('HQ0yKXy9yrRp8It5c');
        resolve(window.emailjs);
      } else {
        reject(new Error('EmailJS failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load EmailJS script'));

    document.head.appendChild(script);
  });
}

function renderHomePage(homeData) {
  const contentElement = document.getElementById('content');
  if (!homeData || !homeData.ok || !homeData.data || !homeData.data.ongoing || !homeData.data.completed) {
    showErrorMessage('Gagal memuat halaman beranda. Format data tidak valid dari API.');
    return;
  }

  const ongoing = homeData.data.ongoing;
  const completed = homeData.data.completed;

  let ongoingHTML = '';
  if (ongoing.animeList && ongoing.animeList.length > 0) {
    ongoingHTML = `
      <section class="section ongoing-section">
        <div class="section-header">
          <h2 class="section-title">Anime Sedang Tayang</h2>
          <a href="/ongoing" class="view-all">Lihat Semua</a>
        </div>
        <div class="anime-grid">
          ${ongoing.animeList.slice(0, 10).map(anime => `
            <div class="anime-card">
              <a href="/anime/${anime.animeId}">
                ${anime.poster ? `
                  <img src="${anime.poster.trim()}" 
                       alt="${anime.title}" 
                       class="anime-thumbnail"
                       onerror="this.onerror=null; this.parentElement.querySelector('.anime-thumbnail-placeholder').style.display='flex'; this.style.display='none';">
                  <div class="anime-thumbnail-placeholder" style="display: none;">
                    <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                  </div>
                ` : `
                  <div class="anime-thumbnail-placeholder">
                    <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                  </div>
                `}
                <div class="anime-info">
                  <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
                  <div class="anime-meta">
                    <span class="episode-info">${anime.episodes} eps</span>
                    <span class="release-day">${anime.releaseDay}</span>
                  </div>
                  <div class="release-date">Terbaru: ${anime.latestReleaseDate}</div>
                </div>
              </a>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  let completedHTML = '';
  if (completed.animeList && completed.animeList.length > 0) {
    completedHTML = `
      <section class="section completed-section">
        <div class="section-header">
          <h2 class="section-title">Anime Sudah Tamat</h2>
          <a href="/completed" class="view-all">Lihat Semua</a>
        </div>
        <div class="anime-grid">
          ${completed.animeList.slice(0, 10).map(anime => `
            <div class="anime-card">
              <a href="/anime/${anime.animeId}">
                ${anime.poster ? `
                  <img src="${anime.poster.trim()}" 
                       alt="${anime.title}" 
                       class="anime-thumbnail"
                       onerror="this.onerror=null; this.parentElement.querySelector('.anime-thumbnail-placeholder').style.display='flex'; this.style.display='none';">
                  <div class="anime-thumbnail-placeholder" style="display: none;">
                    <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                  </div>
                ` : `
                  <div class="anime-thumbnail-placeholder">
                    <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                  </div>
                `}
                <div class="anime-info">
                  <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
                  <div class="anime-meta">
                    <span class="episode-info">${anime.episodes} eps</span>
                    ${anime.score ? `<span class="anime-score"><span class="score-icon">★</span> ${anime.score}</span>` : ''}
                  </div>
                  <div class="release-date">Rilis: ${anime.lastReleaseDate}</div>
                </div>
              </a>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  contentElement.innerHTML = `
    <div class="hero-section">
      ${ongoing.animeList && ongoing.animeList.length > 0 ? `
        <div class="hero-content" style="background-image: url('${ongoing.animeList[0].poster.trim()}')">
          <div class="hero-overlay"></div>
          <div class="hero-info">
            <h1 class="hero-title" title="${ongoing.animeList[0].title}">${truncateTitle(ongoing.animeList[0].title, 40)}</h1>
            <p class="hero-description">Sedang tayang setiap hari ${ongoing.animeList[0].releaseDay}</p>
            <div class="hero-meta">
              <span>${ongoing.animeList[0].episodes} episode</span>
              <span>Terbaru: ${ongoing.animeList[0].latestReleaseDate}</span>
            </div>
            <a href="/anime/${ongoing.animeList[0].animeId}" class="hero-button">Nonton Sekarang</a>
          </div>
        </div>
      ` : `
        <div class="hero-content placeholder">
          <div class="hero-info">
            <h1 class="hero-title">NontonAnime</h1>
            <p class="hero-description">Platform favorit Anda untuk menonton anime online</p>
            <a href="/anime" class="hero-button">Jelajahi Anime</a>
          </div>
        </div>
      `}
    </div>
    ${ongoingHTML}
    ${completedHTML}
  `;
}

function renderSchedulePage(scheduleData) {
  const contentElement = document.getElementById('content');
  if (!scheduleData || !scheduleData.ok || !scheduleData.data || !scheduleData.data.days) {
    showErrorMessage('Gagal memuat jadwal tayang. Format data tidak valid dari API.');
    return;
  }

  const days = scheduleData.data.days;
  let scheduleHTML = '';

  days.forEach(day => {
    if (day.animeList && day.animeList.length > 0) {
      const animeCards = day.animeList.map(anime => `
        <div class="anime-card">
          <a href="/anime/${anime.animeId}">
            ${anime.poster ? `
              <img src="${anime.poster.trim()}" 
                   alt="${anime.title}" 
                   class="anime-thumbnail"
                   onerror="this.onerror=null; this.parentElement.querySelector('.anime-thumbnail-placeholder').style.display='flex'; this.style.display='none';">
              <div class="anime-thumbnail-placeholder" style="display: none;">
                <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
              </div>
            ` : `
              <div class="anime-thumbnail-placeholder">
                <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
              </div>
            `}
            <div class="anime-info">
              <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
            </div>
          </a>
        </div>
      `).join('');

      scheduleHTML += `
        <section class="schedule-day" id="day-${day.day.toLowerCase()}">
          <h2 class="day-title">${day.day}</h2>
          <div class="anime-grid">
            ${animeCards}
          </div>
        </section>
      `;
    }
  });

  contentElement.innerHTML = `
    <h1 class="page-title">Jadwal Tayang Anime</h1>
    <div class="schedule-content">
      ${scheduleHTML}
    </div>
  `;
}

function renderAllAnimePage(animeData, currentPage = 1) {
  const contentElement = document.getElementById('content');
  if (!animeData || !animeData.ok || !animeData.data || !animeData.data.list) {
    showErrorMessage('Gagal memuat daftar anime. Format data tidak valid dari API.');
    return;
  }

  // Gabungkan semua anime
  const allAnimeList = [];
  animeData.data.list.forEach(group => {
    if (group.animeList && group.animeList.length > 0) {
      allAnimeList.push(...group.animeList);
    }
  });

  const itemsPerPage = 20;
  const totalPages = Math.ceil(allAnimeList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAnime = allAnimeList.slice(startIndex, endIndex);

  let animeHTML = '';
  if (paginatedAnime.length > 0) {
    animeHTML = `
      <div class="anime-grid">
        ${paginatedAnime.map(anime => `
          <div class="anime-card">
            <a href="/anime/${anime.animeId}">
              <div class="anime-thumbnail-placeholder">
                <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
              </div>
              <div class="anime-info">
                <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
              </div>
            </a>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    animeHTML = '<p>Tidak ada anime yang tersedia.</p>';
  }

  let paginationHTML = '';
  if (totalPages > 1) {
    paginationHTML = `
      <div class="pagination">
        ${currentPage > 1 ? `
          <a href="#" onclick="navigateTo('/anime?page=${currentPage - 1}')">&laquo; Sebelumnya</a>
        ` : '<span class="disabled">&laquo; Sebelumnya</span>'}
        <span class="current-page">Halaman ${currentPage} dari ${totalPages}</span>
        ${currentPage < totalPages ? `
          <a href="#" onclick="navigateTo('/anime?page=${currentPage + 1}')">Berikutnya &raquo;</a>
        ` : '<span class="disabled">Berikutnya &raquo;</span>'}
      </div>
    `;
  }

  contentElement.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Semua Anime</h1>
    </div>
    ${animeHTML}
    ${paginationHTML}
  `;
}

function renderAllGenresPage(genresData) {
  const contentElement = document.getElementById('content');
  if (!genresData || !genresData.ok || !genresData.data || !genresData.data.genreList) {
    showErrorMessage('Gagal memuat genre. Format data tidak valid dari API.');
    return;
  }

  const genres = genresData.data.genreList;
  let genresHTML = '';

  if (genres && genres.length) {
    genresHTML = genres.map(genre => `
      <div class="genre-card">
        <a href="/genres/${genre.genreId}">
          <div class="genre-icon">${getGenreInitial(genre.title)}</div>
          <div class="genre-info">
            <h3>${genre.title}</h3>
            <p>${genre.genreId}</p>
          </div>
        </a>
      </div>
    `).join('');
  } else {
    genresHTML = '<p>Tidak ada genre yang tersedia saat ini.</p>';
  }

  contentElement.innerHTML = `
    <h1 class="page-title">Semua Genre Anime</h1>
    <div class="genres-grid">
      ${genresHTML}
    </div>
    <p class="info-text">Jelajahi anime berdasarkan genre untuk menemukan tipe tayangan favorit Anda.</p>
  `;
}

function renderAnimeListPage(data, title, pageType = 'anime') {
  const contentElement = document.getElementById('content');
  if (!data || !data.ok || !data.data || !data.data.animeList) {
    showErrorMessage(`Gagal memuat ${title.toLowerCase()}. Format data tidak valid dari API.`);
    return;
  }

  const animeList = data.data.animeList;
  const pagination = data.pagination || {};

  let animeGridHTML = '';
  if (animeList && animeList.length > 0) {
    animeGridHTML = `
      <div class="anime-grid">
        ${animeList.map(anime => `
          <div class="anime-card">
            <a href="/anime/${anime.animeId}">
              ${anime.poster ? `
                <img src="${anime.poster.trim()}" 
                     alt="${anime.title}" 
                     class="anime-thumbnail"
                     onerror="this.onerror=null; this.parentElement.querySelector('.anime-thumbnail-placeholder').style.display='flex'; this.style.display='none';">
                <div class="anime-thumbnail-placeholder" style="display: none;">
                  <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                </div>
              ` : `
                <div class="anime-thumbnail-placeholder">
                  <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                </div>
              `}
              <div class="anime-info">
                <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
                <div class="anime-meta">
                  ${anime.episodes ? `<span class="episode-info">${anime.episodes} eps</span>` : ''}
                  ${anime.score ? `<span class="anime-score"><span class="score-icon">★</span> ${anime.score}</span>` : ''}
                </div>
                ${anime.lastReleaseDate ? `<div class="release-date">Rilis: ${anime.lastReleaseDate}</div>` : ''}
              </div>
            </a>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    animeGridHTML = '<p>Tidak ada anime yang tersedia dalam kategori ini.</p>';
  }

  let paginationHTML = '';
  if (pagination.totalPages > 1) {
    paginationHTML = `
      <div class="pagination">
        ${pagination.hasPrevPage ? `
          <a href="#" onclick="navigateTo('/${pageType}?page=${pagination.prevPage}')">&laquo; Sebelumnya</a>
        ` : '<span class="disabled">&laquo; Sebelumnya</span>'}
        <span class="current-page">Halaman ${pagination.currentPage} dari ${pagination.totalPages}</span>
        ${pagination.hasNextPage ? `
          <a href="#" onclick="navigateTo('/${pageType}?page=${pagination.nextPage}')">Berikutnya &raquo;</a>
        ` : '<span class="disabled">Berikutnya &raquo;</span>'}
      </div>
    `;
  }

  contentElement.innerHTML = `
    <h1 class="page-title">${title}</h1>
    ${animeGridHTML}
    ${paginationHTML}
  `;
}

function renderSearchResults(query, data) {
  const contentElement = document.getElementById('content');
  let resultsHTML = '';

  if (data && data.ok && data.data && data.data.animeList && data.data.animeList.length > 0) {
    resultsHTML = `
      <h1 class="page-title">Hasil Pencarian untuk "${query}"</h1>
      <div class="anime-grid">
        ${data.data.animeList.map(anime => `
          <div class="anime-card">
            <a href="/anime/${anime.animeId}">
              ${anime.poster ? `
                <img src="${anime.poster.trim()}" 
                     alt="${anime.title}" 
                     class="anime-thumbnail"
                     onerror="this.onerror=null; this.parentElement.querySelector('.anime-thumbnail-placeholder').style.display='flex'; this.style.display='none';">
                <div class="anime-thumbnail-placeholder" style="display: none;">
                  <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                </div>
              ` : `
                <div class="anime-thumbnail-placeholder">
                  <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                </div>
              `}
              <div class="anime-info">
                <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
                <div class="anime-meta">
                  ${anime.episodes ? `<span class="episode-info">${anime.episodes} eps</span>` : ''}
                  ${anime.score ? `<span class="anime-score"><span class="score-icon">★</span> ${anime.score}</span>` : ''}
                </div>
                ${anime.lastReleaseDate ? `<div class="release-date">Rilis: ${anime.lastReleaseDate}</div>` : ''}
              </div>
            </a>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    resultsHTML = `
      <h1 class="page-title">Tidak Ada Hasil Ditemukan</h1>
      <p>Maaf, kami tidak dapat menemukan anime yang cocok dengan "${query}". Silakan coba kata kunci pencarian lain.</p>
      <div class="text-center">
        <a href="/" class="btn">Kembali ke Beranda</a>
      </div>
    `;
  }

  contentElement.innerHTML = resultsHTML;
}

function renderGenrePage(genreId, data, page) {
  const contentElement = document.getElementById('content');
  if (!data || !data.ok || !data.data || !data.data.animeList) {
    showErrorMessage(`Gagal memuat anime untuk genre "${genreId}". Format data tidak valid dari API.`);
    return;
  }

  const genreTitle = genreId.charAt(0).toUpperCase() + genreId.slice(1);
  const animeList = data.data.animeList;
  const pagination = data.pagination || {};

  let paginationHTML = '';
  if (pagination.totalPages > 1) {
    paginationHTML = `
      <div class="pagination">
        ${pagination.hasPrevPage ? `
          <a href="#" onclick="navigateTo('/genres/${genreId}?page=${pagination.prevPage}')">&laquo; Sebelumnya</a>
        ` : '<span class="disabled">&laquo; Sebelumnya</span>'}
        <span class="current-page">Halaman ${pagination.currentPage} dari ${pagination.totalPages}</span>
        ${pagination.hasNextPage ? `
          <a href="#" onclick="navigateTo('/genres/${genreId}?page=${pagination.nextPage}')">Berikutnya &raquo;</a>
        ` : '<span class="disabled">Berikutnya &raquo;</span>'}
      </div>
    `;
  }

  contentElement.innerHTML = `
    <h1 class="page-title">Anime Genre ${genreTitle}</h1>
    <div class="anime-grid">
      ${animeList.map(anime => `
        <div class="anime-card">
          <a href="/anime/${anime.animeId}">
            ${anime.poster ? `
              <img src="${anime.poster.trim()}" 
                   alt="${anime.title}" 
                   class="anime-thumbnail"
                   onerror="this.onerror=null; this.parentElement.querySelector('.anime-thumbnail-placeholder').style.display='flex'; this.style.display='none';">
              <div class="anime-thumbnail-placeholder" style="display: none;">
                <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
              </div>
            ` : `
              <div class="anime-thumbnail-placeholder">
                <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
              </div>
            `}
            <div class="anime-info">
              <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
              <div class="anime-meta">
                ${anime.episodes ? `<span class="episode-info">${anime.episodes} eps</span>` : ''}
                ${anime.score ? `<span class="anime-score"><span class="score-icon">★</span> ${anime.score}</span>` : ''}
              </div>
              ${anime.lastReleaseDate ? `<div class="release-date">Rilis: ${anime.lastReleaseDate}</div>` : ''}
            </div>
          </a>
        </div>
      `).join('')}
    </div>
    ${paginationHTML}
  `;
}

function renderAnimeDetail(data) {
  const contentElement = document.getElementById('content');
  if (!data || !data.ok || !data.data) {
    showErrorMessage('Gagal memuat detail anime. Format data tidak terduga.');
    return;
  }

  const anime = data.data;
  const itemsPerPage = 25;
  const totalEpisodes = anime.episodeList ? anime.episodeList.length : 0;
  const totalPages = Math.ceil(totalEpisodes / itemsPerPage);

  // Ambil nomor halaman dari URL (default: 1)
  const urlParams = new URLSearchParams(window.location.search);
  let currentPage = parseInt(urlParams.get('episode_page')) || 1;
  currentPage = Math.max(1, Math.min(currentPage, totalPages)); // Batasi valid

  // Fungsi: Dapatkan episode sesuai halaman
  function getEpisodesForPage(page) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return anime.episodeList.slice(start, end);
  }

  // Render episode untuk halaman saat ini
  const currentEpisodes = getEpisodesForPage(currentPage);

  // Pagination HTML
  function generatePaginationHTML() {
    if (totalPages <= 1) return '';

    const maxVisiblePages = 3;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let pageButtons = '';
    for (let i = startPage; i <= endPage; i++) {
      pageButtons += `
      <button class="page-btn ${i === currentPage ? 'current-page' : ''}"
              onclick="changeEpisodePage(${i})">
        ${i}
      </button>
    `;
    }

    return `
    <div class="episode-pagination" style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 300px; margin: 0 auto;">
      <!-- Baris 1: Nomor Halaman (Center) -->
      <div class="pagination-pages">
        ${pageButtons}
      </div>

      <!-- Baris 2: Navigasi (Left & Right) -->
      <div class="pagination-nav">
        <div class="nav-left">
          <button class="nav-prev" onclick="changeEpisodePage(1)" ${currentPage === 1 ? 'disabled' : ''}>
            ← Awal
          </button>
          <button class="nav-prev" onclick="changeEpisodePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            ← Sebelumnya
          </button>
        </div>

        <div class="nav-right">
          <button class="nav-next" onclick="changeEpisodePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Selanjutnya →
          </button>
          <button class="nav-next" onclick="changeEpisodePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
            Akhir →
          </button>
        </div>
      </div>
    </div>
  `;
  }

  // Generate episodes HTML
  let episodesHTML = '';
  if (anime.episodeList && anime.episodeList.length > 0) {
    episodesHTML = `
      <div class="episode-list">
        <h2>Daftar Episode</h2>
        <div class="episodes-grid">
          ${currentEpisodes.map(episode => `
            <a href="/episode/${episode.episodeId}" class="episode-card">
              <div class="episode-number">Episode ${episode.title}</div>
            </a>
          `).join('')}
        </div>
        ${generatePaginationHTML()}
      </div>
    `;
  }

  // Sisanya tetap sama...
  let genresHTML = '';
  if (anime.genreList && anime.genreList.length > 0) {
    genresHTML = anime.genreList.map(genre => `
      <a href="/genres/${genre.genreId}" class="genre-tag">${genre.title}</a>
    `).join('');
  }

  let synopsisHTML = '';
  if (anime.synopsis && anime.synopsis.paragraphs && anime.synopsis.paragraphs.length > 0) {
    synopsisHTML = anime.synopsis.paragraphs.map(paragraph => `
      <p>${paragraph}</p>
    `).join('');
  }

  let recommendedHTML = '';
  if (anime.recommendedAnimeList && anime.recommendedAnimeList.length > 0) {
    recommendedHTML = `
      <div class="recommended-section">
        <h2>Mungkin Anda Suka</h2>
        <div class="anime-grid">
          ${anime.recommendedAnimeList.map(anime => `
            <div class="anime-card">
              <a href="/anime/${anime.animeId}">
                ${anime.poster ? `
                  <img src="${anime.poster.trim()}" 
                       alt="${anime.title}" 
                       class="anime-thumbnail"
                       onerror="this.onerror=null; this.parentElement.querySelector('.anime-thumbnail-placeholder').style.display='flex'; this.style.display='none';">
                  <div class="anime-thumbnail-placeholder" style="display: none;">
                    <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                  </div>
                ` : `
                  <div class="anime-thumbnail-placeholder">
                    <span class="thumbnail-initial">${anime.title.charAt(0)}</span>
                  </div>
                `}
                <div class="anime-info">
                  <h3 class="anime-title" title="${anime.title}">${truncateTitle(anime.title)}</h3>
                </div>
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  let productionInfoHTML = '';
  if (anime.producers || anime.studios) {
    productionInfoHTML = `
      <div class="production-info">
        ${anime.studios ? `
          <div class="info-item">
            <span class="info-label">Studio:</span>
            <span class="info-value">${anime.studios}</span>
          </div>
        ` : ''}
        ${anime.producers ? `
          <div class="info-item">
            <span class="info-label">Produser:</span>
            <span class="info-value">${anime.producers}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  contentElement.innerHTML = `
    <div class="anime-detail">
      <div class="anime-detail-header">
        <div class="poster-container">
          ${anime.poster ? `
            <img src="${anime.poster.trim()}" 
                 alt="${anime.title}" 
                 class="anime-detail-poster"
                 onerror="this.onerror=null; this.parentElement.querySelector('.poster-placeholder').style.display='flex'; this.style.display='none';">
            <div class="poster-placeholder" style="display: none;">
              <span class="placeholder-initial">${anime.title.charAt(0)}</span>
            </div>
          ` : `
            <div class="poster-placeholder">
              <span class="placeholder-initial">${anime.title.charAt(0)}</span>
            </div>
          `}
        </div>
        <div class="anime-detail-info">
          <h1 class="anime-detail-title">${anime.title || 'Judul Anime'}</h1>
          ${anime.japanese ? `
            <p class="anime-japanese">${anime.japanese}</p>
          ` : ''}
          <div class="anime-meta">
            <div class="meta-item">
              <span class="meta-label">Status:</span>
              <span class="meta-value status-badge ${anime.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'}">
                ${anime.status || 'N/A'}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Tipe:</span>
              <span class="meta-value">TV</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Episode:</span>
              <span class="meta-value">${anime.episodes || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Durasi:</span>
              <span class="meta-value">${anime.duration || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Rilis:</span>
              <span class="meta-value">${anime.aired || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Skor:</span>
              <span class="meta-value anime-score">
                <span class="score-icon">★</span> ${anime.score || 'N/A'}
              </span>
            </div>
          </div>
          <div class="genre-list">
            ${genresHTML || 'Tidak ada genre'}
          </div>
        </div>
      </div>
      <div class="anime-detail-content">
        <div class="synopsis-section">
          <h2>Sinopsis</h2>
          <div class="synopsis-content">
            ${synopsisHTML || '<p>Sinopsis akan ditampilkan setelah data API tersedia.</p>'}
          </div>
        </div>
        ${productionInfoHTML}
        ${episodesHTML}
        ${recommendedHTML}
      </div>
    </div>
  `;

  window.currentAnimeData = anime;
}

function changeEpisodePage(page) {
  const totalPages = Math.ceil(window.currentAnimeData.episodeList.length / 25);
  const safePage = Math.max(1, Math.min(page, totalPages));

  const url = new URL(window.location);
  url.searchParams.set('episode_page', safePage);
  window.history.pushState({}, '', url);
  renderAnimeDetail({ ok: true, data: window.currentAnimeData });
}


function renderEpisodePage(data) {
  const contentElement = document.getElementById('content');
  if (!data || !data.ok || !data.data) {
    showErrorMessage('Gagal memuat detail episode. Format data tidak terduga.');
    return;
  }

  const episode = data.data;
  const anime = {
    title: episode.title.replace(/ Episode \d+ Subtitle Indonesia$/, ''),
    animeId: episode.animeId
  };

  const urlParams = new URLSearchParams(window.location.search);
  const serverIdFromUrl = urlParams.get('server');

  let serverSelectionHTML = '';
  if (episode.server && episode.server.qualities && episode.server.qualities.length > 0) {
    serverSelectionHTML = `
      <div class="server-container">
        <h2>Pilih Kualitas dan Server</h2>
        <div class="quality-tabs">
          ${episode.server.qualities.map(quality => `
            <button class="quality-tab" data-quality="${quality.title}">
              ${quality.title}
            </button>
          `).join('')}
        </div>
        <div class="server-options">
          ${episode.server.qualities.map(quality => `
            <div class="server-list" data-quality="${quality.title}" style="display: ${quality.title === '480p' ? 'flex' : 'none'};">
              ${quality.serverList.map(server => `
                <button class="server-button" 
                        data-server-id="${server.serverId}"
                        onclick="changeServer('${server.serverId}')">
                  ${server.title.trim()}
                </button>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    serverSelectionHTML = `
      <div class="server-container">
        <h2>Video Player</h2>
        <div class="video-container">
          <div class="video-player">
            <iframe src="${episode.defaultStreamingUrl || '#'}" allowfullscreen></iframe>
          </div>
        </div>
      </div>
    `;
  }

  let navigationHTML = `
    <div class="episode-navigation">
      <div class="nav-buttons">
        ${episode.hasPrevEpisode ? `
          <a href="/episode/${episode.prevEpisode.episodeId}" class="btn nav-prev">
            <span class="arrow">&laquo;</span> Episode Sebelumnya
          </a>
        ` : '<span class="btn disabled nav-prev">Episode Pertama</span>'}
        ${episode.hasNextEpisode ? `
          <a href="/episode/${episode.nextEpisode.episodeId}" class="btn nav-next">
            Episode Berikutnya <span class="arrow">&raquo;</span>
          </a>
        ` : '<span class="btn disabled nav-next">Episode Terakhir</span>'}
      </div>
      <div class="back-to-anime">
        <a href="/anime/${anime.animeId}" class="btn secondary">
          <span class="arrow">&laquo;</span> Kembali ke ${anime.title || 'Anime'}
        </a>
      </div>
    </div>
  `;

  let downloadOptionsHTML = '';
  if (episode.downloadUrl && episode.downloadUrl.qualities && episode.downloadUrl.qualities.length > 0) {
    downloadOptionsHTML = `
      <div class="download-section">
        <h2>Opsi Download</h2>
        <div class="download-qualities">
          ${episode.downloadUrl.qualities.map(quality => `
            <div class="quality-card">
              <div class="quality-header">
                <span class="quality-title">${quality.title.replace('Mp4_', '').replace('MKV_', '')}</span>
                <span class="quality-size">${quality.size}</span>
              </div>
              <div class="download-links">
                ${quality.urls.map(url => `
                  <a href="${url.url.trim()}" class="download-link" target="_blank">${url.title}</a>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  contentElement.innerHTML = `
    <div class="episode-detail">
      <div class="episode-header">
        <h1 class="page-title">${episode.title}</h1>
        <div class="episode-meta">
          <span class="release-time">${episode.releaseTime || ''}</span>
          ${episode.info && episode.info.genreList ? `
            <div class="genre-list">
              ${episode.info.genreList.map(genre => `
                <a href="/genres/${genre.genreId}" class="genre-tag">${genre.title}</a>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
      <div class="video-container">
        <div class="video-player">
          ${episode.defaultStreamingUrl ? `
            <iframe src="${episode.defaultStreamingUrl.trim()}" allowfullscreen></iframe>
          ` : `
            <div class="no-video-placeholder">
              <p>Pilih server untuk memutar video</p>
            </div>
          `}
        </div>
      </div>
      ${serverSelectionHTML}
      ${navigationHTML}
      ${downloadOptionsHTML}
    </div>
  `;

  setupQualityTabs();
  if (serverIdFromUrl) {
    changeServer(serverIdFromUrl);
  }
}

// Fungsi untuk pindah halaman episode


function changeServer(serverId) {
  console.log(`Mengganti ke server: ${serverId}`);
  const container = document.querySelector('.video-player');
  if (!container) {
    console.error('Video player container tidak ditemukan');
    return;
  }

  container.innerHTML = `
    <div class="loading-iframe">
      <div class="loading-spinner"></div>
      <p>Memuat video...</p>
    </div>
  `;

  fetchData(`/server/${serverId}`)
    .then(data => {
      if (!data?.ok || !data.data || !data.data.url) {
        throw new Error('URL video tidak ditemukan di respons API');
      }
      const embedUrl = data.data.url.trim();
      container.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
      const url = new URL(window.location);
      url.searchParams.set('server', serverId);
      window.history.replaceState({}, '', url);
      document.querySelectorAll('.server-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.serverId === serverId);
      });
    })
    .catch(err => {
      console.error('Gagal muat server:', err);
      container.innerHTML = `
        <div class="error-message">
          <p>Gagal memuat video. Coba server lain.</p>
        </div>
      `;
    });
}

function setupQualityTabs() {
  const qualityTabs = document.querySelectorAll('.quality-tab');
  qualityTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.server-list').forEach(list => {
        list.style.display = 'none';
      });
      const quality = tab.getAttribute('data-quality');
      document.querySelector(`.server-list[data-quality="${quality}"]`).style.display = 'flex';
      qualityTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
  if (qualityTabs.length > 0) {
    qualityTabs[0].classList.add('active');
  }
}

function renderBatchPage(data) {
  const contentElement = document.getElementById('content');
  if (!data || !data.ok || !data.data) {
    showErrorMessage('Gagal memuat batch download. Format data tidak terduga.');
    return;
  }

  const batch = data.data;
  const anime = {
    title: batch.animeTitle || 'Judul Anime',
    animeId: batch.animeId || ''
  };

  contentElement.innerHTML = `
    <div class="batch-detail">
      <h1 class="page-title">Download Batch ${anime.title}</h1>
      <div class="batch-info">
        <div class="batch-poster">
          <img src="${batch.thumbnail || 'https://via.placeholder.com/200x300?text=Anime'}" 
               alt="${anime.title}">
        </div>
        <div class="batch-details">
          <h2>${anime.title}</h2>
          <p class="batch-status">Status: ${batch.status || 'N/A'}</p>
          <div class="batch-synopsis">
            <h3>Sinopsis</h3>
            <p>${batch.synopsis || 'Sinopsis batch akan ditampilkan setelah data API tersedia.'}</p>
          </div>
          <div class="batch-download">
            <h3>Opsi Download</h3>
            <div class="quality-buttons">
              ${batch.downloadLinks ? Object.entries(batch.downloadLinks).map(([quality, url]) => `
                <a href="${url}" class="btn" target="_blank">${quality}</a>
              `).join('') : '<p>Link download tidak tersedia</p>'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateMobileNav() {
  const path = window.location.pathname;
  const mobileLinks = document.querySelectorAll('.mobile-navbar a');
  mobileLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });
}

function renderReportPage() {
  const savedUrl = localStorage.getItem('bugReportSourceUrl') || window.location.href;
  const savedTitle = localStorage.getItem('bugReportSourceTitle') || document.title;

  const contentElement = document.getElementById('content');
  contentElement.innerHTML = `
    <div class="report-page">
      <div class="report-container">
        <h1 class="page-title">Lapor Bug atau Beri Saran</h1>
        <p class="report-intro">
          Kami sangat menghargai masukan Anda! Silakan laporkan bug, error, atau berikan saran untuk membuat NontonAnime lebih baik.
        </p>
        
        <form id="bugReportForm" class="report-form">
          <div class="form-group">
            <label for="reportType">Jenis Laporan:</label>
            <select id="reportType" name="reportType" required>
              <option value="">-- Pilih Jenis --</option>
              <option value="bug">Bug / Error Aplikasi</option>
              <option value="suggestion">Saran Fitur Baru</option>
              <option value="content">Masalah Konten (Anime/Episode)</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          <div class="form-group">
            <label for="pageTitle">Halaman yang Bermasalah:</label>
            <input type="text" id="pageTitle" name="pageTitle" value="${savedTitle}" readonly>
          </div>

          <div class="form-group">
            <label for="pageUrl">URL Halaman Saat Ini:</label>
            <input type="url" id="pageUrl" name="pageUrl" value="${savedUrl}" readonly>
          </div>

          <div class="form-group">
            <label for="description">Deskripsi Lengkap:</label>
            <textarea id="description" name="description" rows="6" placeholder="Jelaskan secara detail apa yang terjadi, langkah-langkah untuk mereproduksi bug, atau saran Anda..." required></textarea>
          </div>

          <div class="form-group">
            <label for="email">Email Anda (Opsional, jika ingin balasan):</label>
            <input type="email" id="email" name="email" placeholder="contoh@email.com">
          </div>

          <button type="submit" class="btn btn-submit">Kirim Laporan</button>
          <div id="formMessage" class="form-message"></div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('bugReportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formMessage = document.getElementById('formMessage');
    const submitBtn = document.querySelector('.btn-submit');

    // Ambil data form (hanya sekali)
    const formData = {
      reportType: document.getElementById('reportType').value,
      pageTitle: document.getElementById('pageTitle').value,
      pageUrl: document.getElementById('pageUrl').value,
      description: document.getElementById('description').value,
      email: document.getElementById('email').value || 'Tidak disediakan',
      timestamp: new Date().toLocaleString('id-ID'),
      userAgent: navigator.userAgent
    };

    // Validasi minimal
    if (!formData.reportType || !formData.description) {
      formMessage.innerHTML = '<p class="error">❌ Jenis laporan dan deskripsi wajib diisi.</p>';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    formMessage.innerHTML = '<p class="info">Sedang memproses laporan Anda...</p>';

    try {
      await loadEmailJS();

      // Kirim email via EmailJS
      await window.emailjs.send(
        'service_2008',        
        'template_281811',     
        formData
      );

      formMessage.innerHTML = '<p class="success">✅ Laporan berhasil dikirim! Terima kasih atas masukannya.</p>';
      document.getElementById('bugReportForm').reset();

      localStorage.removeItem('bugReportSourceUrl');
      localStorage.removeItem('bugReportSourceTitle');

    } catch (error) {
      console.error('Error:', error);
      formMessage.innerHTML = `<p class="error">❌ ${error.message || 'Gagal mengirim laporan. Silakan coba lagi.'}</p>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim Laporan';
    }
  });
}

function truncateTitle(title, maxLength = 30) {
  return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

function getGenreInitial(title) {
  return title.charAt(0).toUpperCase();
}

function showErrorMessage(message) {
  document.getElementById('content').innerHTML = `
    <div class="error-message">
      <h2>Error</h2>
      <p>${message}</p>
      <a href="/" class="btn">Kembali ke Beranda</a>
    </div>
  `;
}

function show404() {
  document.getElementById('content').innerHTML = `
    <div class="error-404">
      <h1>404</h1>
      <h2>Halaman Tidak Ditemukan</h2>
      <p>Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
      <a href="/" class="btn">Kembali ke Beranda</a>
    </div>
  `;
}