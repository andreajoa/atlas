const encoder = new TextEncoder();
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const PUBLIC_PAGES = new Set(['/', '/onde-ficar-buenos-aires.html', '/orcamento-viagem-argentina.html', '/documentos-viagem-argentina.html', '/privacidade.html', '/sobre.html']);
const sections = new Set(['geral', 'onde', 'voo', 'orc', 'etapas', 'artigo']);
const eventNames = new Set(['page_view', 'section_view', 'click', 'place_view', 'stay_search', 'flight_search', 'favorite_add', 'favorite_remove', 'budget_edit', 'checklist', 'print', 'map_zoom', 'search']);
const BOT = /bot\b|crawler|spider|headless|lighthouse|preview|facebookexternalhit|google-inspectiontool/i;
const number = (value, max) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
const label = (value, max = 80) => typeof value === 'string' ? value.replace(/[\u0000-\u001f<>@]/g, '').slice(0, max) : '';
const pagePath = value => value === '/index.html' ? '/' : PUBLIC_PAGES.has(value) ? value : null;
const bytesTo64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const from64 = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function hmacKey(secret) { return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function sign(value, secret) { return bytesTo64(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(value))); }
async function verify(value, signature, secret) { try { return await crypto.subtle.verify('HMAC', await hmacKey(secret), from64(signature), encoder.encode(value)); } catch { return false; } }
export async function issueToken(secret, now = Date.now()) {
  const payload = bytesTo64(encoder.encode(JSON.stringify({ role: 'admin', exp: now + 4 * 3600000, nonce: crypto.randomUUID() })));
  return payload + '.' + await sign(payload, secret);
}
export async function authorized(request, env, now = Date.now()) {
  if (!env.AUTH_SECRET) return false;
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (token.length > 1024) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !await verify(payload, signature, env.AUTH_SECRET)) return false;
  try { const data = JSON.parse(new TextDecoder().decode(from64(payload))); return data.role === 'admin' && Number.isFinite(data.exp) && data.exp > now && data.exp <= now + 4 * 3600000; } catch { return false; }
}
function response(request, status, data, allowedOrigin = '') {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
  if (allowedOrigin) { headers['Access-Control-Allow-Origin'] = allowedOrigin; headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'; headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'; }
  return new Response(JSON.stringify(data), { status, headers });
}
function originAllowed(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return ''; // Only anonymous status and authenticated GET may omit Origin.
  const allowed = [new URL(request.url).origin, ...String(env.SITE_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)];
  return allowed.includes(origin) ? origin : null;
}
async function readBody(request) {
  if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) throw new Error('content-type');
  if (Number(request.headers.get('content-length')) > 16000) throw new Error('body-size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  let size = 0; const chunks = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 16000) { await reader.cancel(); throw new Error('body-size'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function trafficSource(input, origin) {
  let referrer = '';
  try { const parsed = new URL(input.referrer); if (['http:', 'https:'].includes(parsed.protocol) && parsed.origin !== origin) referrer = parsed.hostname.slice(0, 100); } catch { /* Direct or absent. */ }
  const campaign = label(input.campaign, 60);
  const source = label(input.source, 60) || (/google\.|bing\.|duckduckgo\.|search\.yahoo\./.test(referrer) ? 'Busca' : referrer || 'Direto');
  const medium = label(input.medium, 40) || (source === 'Busca' ? 'orgânico' : referrer ? 'referência' : 'direto');
  return { referrer, source, medium, campaign };
}
function deviceInfo(ua) {
  const device = /ipad|tablet/i.test(ua) ? 'Tablet' : /mobile|iphone|android/i.test(ua) ? 'Celular' : 'Computador';
  const browser = /edg\//i.test(ua) ? 'Edge' : /firefox\//i.test(ua) ? 'Firefox' : /chrome\/|crios\//i.test(ua) ? 'Chrome' : /safari\//i.test(ua) ? 'Safari' : 'Outro';
  return { device, browser };
}
async function collect(request, env, body, now) {
  if (body.consent !== true || !uuid.test(body.visitorId) || !uuid.test(body.sessionId) || !pagePath(body.page) || !Array.isArray(body.events) || body.events.length > 20 || !Array.isArray(body.engagement) || body.engagement.length > 6) return { status: 400, data: { error: 'Dados de medição inválidos.' } };
  if (BOT.test(request.headers.get('user-agent') || '')) return { status: 202, data: { accepted: 0, ignored: true } };
  const events = body.events.map(e => {
    if (!e || !uuid.test(e.id) || !eventNames.has(e.name) || !pagePath(e.page) || !sections.has(e.section) || typeof e.target !== 'string' || !/^[a-zA-Z0-9._:/\-]{1,100}$/.test(e.target)) return null;
    return { ...e, at: Math.max(now - 1800000, Math.min(now, Number(e.at) || now)), page: pagePath(e.page) };
  });
  const metrics = body.engagement.map(e => {
    if (!e || !uuid.test(e.id) || !pagePath(e.page) || !sections.has(e.section)) return null;
    return { ...e, page: pagePath(e.page), at: Math.max(now - 43200000, Math.min(now, Number(e.at) || now)), active: number(e.activeMs, 43200000), scroll: number(e.maxScroll, 100) };
  });
  if (events.includes(null) || metrics.includes(null)) return { status: 400, data: { error: 'Evento não reconhecido.' } };
  if (!events.length && !metrics.length) return { status: 202, data: { accepted: 0 } };
  const db = env.DB;
  const day = new Date(now).toISOString().slice(0, 10);
  const amount = Math.max(1, events.length + metrics.length);
  const max = Number(env.MAX_RECORDS_PER_DAY) || 5000;
  if (amount > max) return { status: 429, data: { error: 'Medição pausada pelo limite diário.', retryAfter: 3600 } };
  const quota = await db.prepare('INSERT INTO daily_quota(day, used) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET used = used + excluded.used WHERE used + excluded.used <= ? RETURNING used').bind(day, amount, max).first();
  if (!quota || quota.used > max) return { status: 429, data: { error: 'Medição pausada pelo limite diário.', retryAfter: 3600 } };
  const cf = request.cf || {};
  const geo = { country: /^[A-Z]{2}$/.test(cf.country || '') ? cf.country : 'ND', region: label(cf.region, 60) || 'Não disponível', city: label(cf.city, 80) || 'Não disponível' };
  const traffic = trafficSource(body.traffic || {}, request.headers.get('origin') || new URL(request.url).origin);
  const device = deviceInfo(request.headers.get('user-agent') || '');
  const started = Math.max(now - 1800000, Math.min(now, Number(body.startedAt) || now));
  const queries = [db.prepare(`INSERT INTO sessions (id, visitor_id, started_at, last_seen, landing_page, source, medium, campaign, referrer, country, region, city, device, browser, language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET last_seen = MAX(last_seen, excluded.last_seen) WHERE sessions.visitor_id = excluded.visitor_id`).bind(body.sessionId, body.visitorId, started, now, pagePath(body.page), traffic.source, traffic.medium, traffic.campaign, traffic.referrer, geo.country, geo.region, geo.city, device.device, device.browser, /^[a-z]{2}(?:-[A-Za-z]{2,4})?$/.test(body.language || '') ? body.language : 'ND')];
  for (const e of events) queries.push(db.prepare(`INSERT INTO events(id, session_id, occurred_at, name, page, section, target)
    SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ? AND visitor_id = ?) ON CONFLICT(id) DO NOTHING`).bind(e.id, body.sessionId, e.at, e.name, e.page, e.section, e.target, body.sessionId, body.visitorId));
  for (const e of metrics) queries.push(db.prepare(`INSERT INTO engagement(id, session_id, started_at, page, section, active_ms, max_scroll)
    SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ? AND visitor_id = ?)
    ON CONFLICT(id) DO UPDATE SET active_ms = MAX(active_ms, excluded.active_ms), max_scroll = MAX(max_scroll, excluded.max_scroll)
    WHERE engagement.session_id = excluded.session_id`).bind(e.id, body.sessionId, e.at, e.page, e.section, Math.min(e.active, now - e.at + 1000), e.scroll, body.sessionId, body.visitorId));
  await db.batch(queries);
  return { status: 202, data: { accepted: events.length, stored: true } };
}
async function login(request, env, body, now) {
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) return { status: 401, data: { error: 'Senha inválida.' } };
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const bucket = await sign(ip + ':' + Math.floor(now / 3600000), env.AUTH_SECRET);
  const previous = await env.DB.prepare('SELECT failures FROM auth_attempts WHERE bucket = ?').bind(bucket).first();
  if (previous?.failures >= 5) return { status: 429, data: { error: 'Muitas tentativas. Tente novamente na próxima hora.' } };
  const expected = await sign(env.ADMIN_PASSWORD, env.AUTH_SECRET);
  if (!await verify(body.password, expected, env.AUTH_SECRET)) {
    await env.DB.prepare('INSERT INTO auth_attempts(bucket, failures, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET failures = failures + 1').bind(bucket, now + 3600000).run();
    return { status: 401, data: { error: 'Senha inválida.' } };
  }
  return { status: 200, data: { token: await issueToken(env.AUTH_SECRET, now), expiresIn: 14400 } };
}
export async function getSummary(env, days, now = Date.now()) {
  const from = now - days * 86400000;
  const db = env.DB;
  const queries = [
    db.prepare(`SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor_id) AS visitors, COALESCE(SUM(last_seen >= ?),0) AS online,
      COALESCE(AVG(COALESCE((SELECT SUM(active_ms) FROM engagement e WHERE e.session_id = sessions.id),0)),0) AS avgActiveMs
      FROM sessions WHERE started_at >= ?`).bind(now - 300000, from),
    db.prepare(`SELECT SUM(n - 1) AS returns FROM (SELECT COUNT(*) n FROM sessions WHERE started_at >= ? GROUP BY visitor_id)`).bind(from),
    db.prepare(`SELECT strftime('%Y-%m-%d', started_at / 1000, 'unixepoch') day, COUNT(*) visits FROM sessions WHERE started_at >= ? GROUP BY day ORDER BY day`).bind(from),
    db.prepare(`SELECT page target, COUNT(*) views, COUNT(DISTINCT session_id) visits FROM events WHERE occurred_at >= ? AND name = 'page_view' GROUP BY page ORDER BY views DESC LIMIT 10`).bind(from),
    db.prepare(`SELECT section target, COUNT(*) views, COUNT(DISTINCT session_id) visits FROM events WHERE occurred_at >= ? AND name = 'section_view' GROUP BY section ORDER BY views DESC LIMIT 10`).bind(from),
    db.prepare(`SELECT name, target, COUNT(*) clicks, COUNT(DISTINCT session_id) visits FROM events WHERE occurred_at >= ? AND name IN ('click','stay_search','flight_search','place_view','favorite_add','print','search','budget_edit') GROUP BY name, target ORDER BY clicks DESC LIMIT 25`).bind(from),
    db.prepare(`SELECT source, medium, campaign, COUNT(*) visits FROM sessions WHERE started_at >= ? GROUP BY source, medium, campaign ORDER BY visits DESC LIMIT 15`).bind(from),
    db.prepare(`SELECT country, city, region, COUNT(*) visits FROM sessions WHERE started_at >= ? GROUP BY country, city, region ORDER BY visits DESC LIMIT 20`).bind(from),
    db.prepare(`SELECT device, browser, COUNT(*) visits FROM sessions WHERE started_at >= ? GROUP BY device, browser ORDER BY visits DESC LIMIT 15`).bind(from),
    db.prepare(`SELECT page, section, SUM(active_ms) activeMs, AVG(max_scroll) avgScroll FROM engagement WHERE started_at >= ? GROUP BY page, section ORDER BY activeMs DESC LIMIT 15`).bind(from),
    db.prepare(`SELECT COUNT(DISTINCT CASE WHEN name = 'stay_search' THEN session_id END) hotelSearches,
      COUNT(DISTINCT CASE WHEN name = 'flight_search' THEN session_id END) flightSearches,
      COUNT(DISTINCT CASE WHEN name = 'favorite_add' THEN session_id END) savedTrips,
      COUNT(CASE WHEN name = 'page_view' THEN 1 END) pageViews FROM events WHERE occurred_at >= ?`).bind(from),
    db.prepare('SELECT used FROM daily_quota WHERE day = ?').bind(new Date(now).toISOString().slice(0,10))
  ];
  const results = await db.batch(queries);
  const rows = i => results[i].results || [];
  return { generatedAt: now, days, environment: env.DEVELOPMENT === 'true' ? 'local' : 'production',
    totals: { ...rows(0)[0], returns: rows(1)[0]?.returns || 0, ...rows(10)[0] },
    timeline: rows(2), pages: rows(3), sections: rows(4), actions: rows(5), sources: rows(6), locations: rows(7), devices: rows(8), engagement: rows(9),
    measurement: { consentRequired: true, historical: false, neighborhood: false, gender: false, geo: 'IP aproximado', retentionDays: 90, usedToday: rows(11)[0]?.used || 0, limitPerDay: Number(env.MAX_RECORDS_PER_DAY) || 5000 } };
}
export async function handleApi(request, env) {
  const origin = originAllowed(request, env);
  if (origin === null) return response(request, 403, { error: 'Origem não autorizada.' });
  const path = new URL(request.url).pathname;
  if (request.method === 'OPTIONS') return response(request, 200, {}, origin);
  if (path === '/api/status' && request.method === 'GET') return response(request, 200, { collectionReady: Boolean(env.DB && env.AUTH_SECRET && env.ADMIN_PASSWORD), consentRequired: true }, origin);
  if (!env.DB || !env.AUTH_SECRET || !env.ADMIN_PASSWORD) return response(request, 503, { error: 'Medição ainda não configurada no servidor.' }, origin);
  try {
    const now = Date.now();
    if (path === '/api/dashboard' && request.method === 'GET') {
      if (!await authorized(request, env, now)) return response(request, 401, { error: 'Entre para acessar o painel.' }, origin);
      const requested = Number(new URL(request.url).searchParams.get('days'));
      const days = [1,7,30,90].includes(requested) ? requested : 7;
      return response(request, 200, await getSummary(env, days, now), origin);
    }
    if (request.method !== 'POST' || !['/api/collect', '/api/login', '/api/forget'].includes(path)) return response(request, 405, { error: 'Método não permitido.' }, origin);
    if (!origin) return response(request, 403, { error: 'Origem obrigatória.' });
    const body = await readBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body');
    if (path === '/api/forget') {
      if (!uuid.test(body.visitorId)) return response(request, 400, { error: 'Identificador inválido.' }, origin);
      // Possession of the browser's unguessable random identifier permits deletion of its own measurements only.
      await env.DB.prepare('DELETE FROM sessions WHERE visitor_id = ?').bind(body.visitorId).run();
      return response(request, 200, { deleted: true }, origin);
    }
    const result = path === '/api/login' ? await login(request, env, body, now) : await collect(request, env, body, now);
    return response(request, result.status, result.data, origin);
  } catch (error) {
    if (['content-type','body-size','body'].includes(error.message) || error instanceof SyntaxError) return response(request, 400, { error: 'Solicitação inválida.' }, origin);
    console.error(JSON.stringify({ event: 'analytics_error', route: path, message: 'storage_or_runtime_failure' }));
    return response(request, 503, { error: 'Medição temporariamente indisponível.' }, origin);
  }
}
export async function cleanup(env, now = Date.now()) {
  const cutoff = now - 90 * 86400000;
  return env.DB.batch([
    env.DB.prepare('DELETE FROM events WHERE occurred_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM engagement WHERE started_at < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM sessions WHERE last_seen < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM auth_attempts WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM daily_quota WHERE day < ?').bind(new Date(cutoff).toISOString().slice(0,10))
  ]);
}
