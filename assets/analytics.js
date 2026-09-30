'use strict';
(() => {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const settings = window.ATLAS_ANALYTICS || {};
  const endpoint = local ? location.origin : settings.endpoint || (/\.workers\.dev$/.test(location.hostname) ? location.origin : '');
  const enabled = settings.enabled !== false && !!endpoint && !location.pathname.startsWith('/dashboard');
  const CONSENT = 'atlas:privacy:v1';
  const VISITOR = 'atlas:visitor:v1';
  const SESSION = 'atlas:session:v1';
  const path = location.pathname === '/index.html' ? '/' : location.pathname;
  let choice = null;
  try { choice = localStorage.getItem(CONSENT); } catch { /* No storage: ask for this visit. */ }
  let running = false;
  let session;
  let visitor;
  let view;
  let queue = [];
  let completedViews = [];
  let tickTimer;
  let flushTimer;
  let sending = false;
  let pausedUntil = 0;
  let lastTick = performance.now();
  let lastActivity = lastTick;
  let currentSection = document.querySelector('.tab[aria-selected="true"]')?.dataset.t || 'artigo';
  const safeRead = (storage, key) => { try { return JSON.parse(storage.getItem(key)); } catch { return null; } };
  const safeWrite = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch { /* Memory-only IDs still work. */ } };
  const remove = (storage,key) => { try { storage.removeItem(key); } catch { /* Unavailable. */ } };
  const uuid = () => crypto.randomUUID();
  const makeView = () => ({ id: uuid(), page: path, section: currentSection, at: Date.now(), activeMs: 0, maxScroll: 0 });
  const traffic = () => {
    const params = new URLSearchParams(location.search);
    return { referrer: document.referrer, source: params.get('utm_source') || '', medium: params.get('utm_medium') || '', campaign: params.get('utm_campaign') || '' };
  };
  function ensureSession() {
    const now = Date.now();
    if (!session || now - session.lastSeen > 1800000) {
      if (session) { accrue(); void flush(); queue = []; completedViews = []; }
      session = { id: uuid(), startedAt: now, lastSeen: now, traffic: traffic(), visitor: visitor.id };
      view = makeView();
      queue.push({ id: uuid(), name: 'page_view', target: path, page: path, section: currentSection, at: now });
      queue.push({ id: uuid(), name: 'section_view', target: currentSection, page: path, section: currentSection, at: now });
    }
    session.lastSeen = now; safeWrite(sessionStorage, SESSION, session);
  }
  function scrollDepth() {
    const height = document.documentElement.scrollHeight - innerHeight;
    return height > 0 ? Math.min(100, Math.round(scrollY / height * 100)) : 100;
  }
  function accrue() {
    const now = performance.now();
    if (running && view && document.visibilityState === 'visible') {
      const active = Math.max(0, Math.min(now, lastActivity + 60000) - lastTick);
      view.activeMs += Math.round(active);
      view.maxScroll = Math.max(view.maxScroll, scrollDepth());
    }
    lastTick = now;
  }
  function track(name, target) {
    if (!running || Date.now() < pausedUntil || typeof target !== 'string' || !/^[a-zA-Z0-9._:/\-]{1,100}$/.test(target)) return;
    ensureSession();
    queue.push({ id: uuid(), name, target, page: path, section: currentSection, at: Date.now() });
    if (queue.length >= 20) void flush();
  }
  async function flush() {
    if (!running || sending || !view || Date.now() < pausedUntil) return;
    accrue();
    sending = true;
    const events = queue.splice(0,20);
    const metrics = completedViews.splice(0,5);
    metrics.push({ ...view });
    const payload = { consent: true, visitorId: visitor.id, sessionId: session.id, startedAt: session.startedAt, page: path, language: navigator.language, traffic: session.traffic, events, engagement: metrics };
    try {
      const result = await fetch(endpoint + '/api/collect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'omit', keepalive: true });
      if (result.status === 429) pausedUntil = Date.now() + 3600000;
      else if (!result.ok) pausedUntil = Date.now() + 60000;
    } catch {
      // Retry these IDs once connectivity returns; inserts and cumulative time are idempotent.
      if (running && choice === 'accepted') { queue = [...events, ...queue].slice(0,40); completedViews = [...metrics.filter(m => m.id !== view?.id), ...completedViews].slice(0,5); }
      pausedUntil = Date.now() + 60000;
    } finally { sending = false; }
  }
  function start() {
    if (running || !enabled || choice !== 'accepted') return;
    visitor = safeRead(localStorage, VISITOR);
    if (!visitor || typeof visitor.id !== 'string' || visitor.expires < Date.now()) {
      visitor = { id: uuid(), expires: Date.now() + 30 * 86400000 }; safeWrite(localStorage, VISITOR, visitor);
    }
    session = safeRead(sessionStorage, SESSION);
    if (session?.visitor !== visitor.id) session = null;
    running = true; view = makeView();
    if (session && Date.now() - session.lastSeen <= 1800000) {
      session.lastSeen = Date.now(); safeWrite(sessionStorage, SESSION, session);
      track('page_view', path); track('section_view', currentSection);
    } else ensureSession();
    lastTick = lastActivity = performance.now();
    tickTimer = setInterval(accrue, 1000);
    flushTimer = setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - session.lastSeen <= 1800000) void flush(); }, 60000);
    void flush();
  }
  function stop() {
    running = false; clearInterval(tickTimer); clearInterval(flushTimer); queue = []; completedViews = [];
    remove(localStorage,VISITOR); remove(sessionStorage,SESSION); session = null; view = null;
  }
  const banner = document.createElement('section');
  banner.className = 'privacy-banner'; banner.hidden = true; banner.setAttribute('aria-labelledby','privacy-title');
  banner.innerHTML = '<div><strong id="privacy-title">Você permite estatísticas de uso?</strong><p>Medimos páginas, cliques e tempo ativo para melhorar o guia. Cidade e país podem ser estimados pelo IP. Não coletamos gênero, bairro nem conteúdo dos campos.</p><a href="/privacidade.html">Como tratamos esses dados</a></div><div class="privacy-actions"><button class="button quiet" type="button" data-choice="declined">Só essenciais</button><button class="button quiet" type="button" data-choice="accepted">Permitir estatísticas</button></div>';
  document.body.append(banner);
  function openPrivacy() {
    banner.hidden = false;
    banner.querySelector('#privacy-title').textContent = enabled ? 'Você permite estatísticas de uso?' : 'Estatísticas opcionais';
    if (!enabled) banner.querySelector('p').textContent = 'A coleta de estatísticas ainda não está ativada neste endereço. O planejamento funciona sem ela. Sua escolha será respeitada quando a medição estiver disponível.';
  }
  function setChoice(value) {
    choice = value;
    try { localStorage.setItem(CONSENT,value); } catch { /* Keep the choice in memory. */ }
    banner.hidden = true;
    if (value === 'accepted') start(); else stop();
    document.dispatchEvent(new CustomEvent('atlas:privacy-change', { detail: { choice } }));
  }
  banner.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => setChoice(button.dataset.choice)));
  document.querySelectorAll('[data-privacy-settings]').forEach(button => button.addEventListener('click',openPrivacy));
  document.getElementById('forget-statistics')?.addEventListener('click', async event => {
    const status = document.getElementById('forget-status');
    const saved = visitor || safeRead(localStorage, VISITOR);
    if (!saved?.id || !enabled) { status.textContent = 'Não há identificador de estatísticas disponível neste navegador.'; return; }
    event.target.disabled = true;
    const visitorId = saved.id;
    try {
      // Stop collection before deletion. Wait for any earlier flush to finish so it cannot recreate the session.
      running = false; clearInterval(tickTimer); clearInterval(flushTimer);
      for (let i = 0; sending && i < 100; i++) await new Promise(resolve => setTimeout(resolve,100));
      if (sending) throw new Error('Aguarde a conclusão do envio anterior e tente novamente.');
      const result = await fetch(endpoint + '/api/forget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId }), credentials: 'omit' });
      if (!result.ok) throw new Error('Não foi possível excluir agora. Tente novamente.');
      setChoice('declined'); status.textContent = 'Registros desse identificador excluídos. Estatísticas opcionais desativadas.';
    } catch (error) { status.textContent = error.message; if (choice === 'accepted') start(); }
    finally { event.target.disabled = false; }
  });
  window.atlasPrivacy = { open: openPrivacy, choice: () => choice, enabled: () => enabled };
  document.addEventListener('atlas:section', event => {
    if (!event.detail?.section || event.detail.section === currentSection) return;
    accrue(); if (view) completedViews.push({ ...view });
    currentSection = event.detail.section;
    if (running) { view = makeView(); track('section_view',currentSection); }
  });
  document.addEventListener('atlas:analytics', event => { if (event.detail) track(event.detail.name,event.detail.target); });
  function activity() {
    if (!running) return;
    accrue(); ensureSession(); lastActivity = performance.now();
  }
  ['pointerdown','keydown','scroll'].forEach(name => document.addEventListener(name,activity,{ passive:true }));
  document.addEventListener('pointermove',activity,{ passive:true });
  document.addEventListener('click',event => {
    const el = event.target.closest?.('a,button,input,select');
    if (!el || el.closest('.privacy-banner') || el.hasAttribute('data-privacy-settings')) return;
    let target = el.dataset.analytics || el.id || (el.dataset.t ? 'tab:' + el.dataset.t : el.dataset.filter ? 'filter:' + el.dataset.filter : el.dataset.go ? 'open:' + el.dataset.go : '');
    if (el.tagName === 'A' && el.href) {
      try { const url = new URL(el.href); target = url.origin === location.origin ? 'guide:' + url.pathname : 'external:' + url.hostname; } catch { /* Skip unknown links. */ }
    }
    if (target) track('click', target);
    if (el.id === 'flight-search' && el.hasAttribute('href')) track('flight_search',document.getElementById('flight-origin').value);
    if (el.id === 'print-plan') track('print','planning');
    if (el.classList.contains('leaflet-control-zoom-in') || el.classList.contains('leaflet-control-zoom-out')) track('map_zoom',el.classList.contains('leaflet-control-zoom-in')?'in':'out');
    if (el.tagName === 'A' && el.href) void flush();
  });
  document.addEventListener('change',event => {
    if (event.target.id?.startsWith('budget-')) track('budget_edit',event.target.id);
    if (event.target.matches?.('[data-task]')) track('checklist','task:' + event.target.dataset.task);
    if (event.target.id === 'place-search' && event.target.value.trim()) track('search','places');
  });
  document.addEventListener('visibilitychange', () => { accrue(); if (document.visibilityState === 'hidden') void flush(); else { lastTick = lastActivity = performance.now(); if (running) ensureSession(); } });
  window.addEventListener('pagehide',() => { accrue(); void flush(); });
  window.addEventListener('storage',event => { if (event.key === CONSENT) { choice = event.newValue; if (choice === 'accepted') start(); else stop(); } });
  if (choice === 'accepted') start(); else if (choice !== 'declined' && enabled) openPrivacy();
})();
