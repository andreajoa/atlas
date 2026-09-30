'use strict';
(() => {
  const video = document.getElementById('travel-film');
  const control = document.getElementById('film-control');
  if (!video || !control) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData;
  let paused = false;
  let visible = true;
  async function update() {
    if (reduced.matches || saveData || paused || !visible || document.hidden) { video.pause(); return; }
    if (!video.getAttribute('src')) video.src = 'assets/hero-buenos-aires.mp4';
    try { await video.play(); } catch { /* Poster remains visible if autoplay is unavailable. */ }
  }
  control.hidden = Boolean(reduced.matches || saveData);
  control.addEventListener('click', () => {
    paused = !paused;
    control.textContent = paused ? 'Reproduzir animação' : 'Pausar animação';
    control.setAttribute('aria-pressed', String(paused));
    update();
  });
  video.addEventListener('playing', () => video.classList.add('playing'));
  video.addEventListener('error', () => { video.classList.remove('playing'); control.hidden = true; });
  reduced.addEventListener('change', () => { control.hidden = reduced.matches || Boolean(saveData); if (reduced.matches) video.classList.remove('playing'); update(); });
  document.addEventListener('visibilitychange', update);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(video.parentElement);
})();
