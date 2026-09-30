'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const KEY = 'atlas-viagem:v1';
  const defaults = { budget: [7000, 6500, 5000, 3000, 700, 800], saved: [], completed: [], checkin: '2027-07-10', checkout: '2027-07-20', area: 'Buenos Aires', rooms: 1, adults: 3, ages: [10], origin: 'GRU' };
  let state = structuredClone(defaults);
  let storageAvailable = true;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored && typeof stored === 'object') {
      for (const key of ['checkin', 'checkout']) if (/^\d{4}-\d{2}-\d{2}$/.test(stored[key])) state[key] = stored[key];
      if (Array.isArray(stored.budget) && stored.budget.length === 6) state.budget = stored.budget.map((n, i) => Number.isFinite(n) && n >= 0 && n <= 10000000 ? n : defaults.budget[i]);
      if (Array.isArray(stored.saved)) state.saved = stored.saved.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180).slice(0, 100);
      if (Array.isArray(stored.completed)) state.completed = [...new Set(stored.completed.filter(n => Number.isInteger(n) && n >= 0 && n < 7))];
      if (Array.isArray(stored.ages) && stored.ages.length <= 4) state.ages = stored.ages.map(n => Number.isInteger(n) && n >= 0 && n <= 17 ? n : 10);
      if (Number.isInteger(stored.adults) && stored.adults >= 1 && stored.adults <= 12) state.adults = stored.adults;
      if (Number.isInteger(stored.rooms) && stored.rooms >= 1 && stored.rooms <= 4) state.rooms = stored.rooms;
      if ([...$('stay-area').options].some(o => o.value === stored.area)) state.area = stored.area;
      if ([...$('flight-origin').options].some(o => o.value === stored.origin)) state.origin = stored.origin;
    }
  } catch { storageAvailable = false; }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageAvailable = true; }
    catch { storageAvailable = false; }
    $('storage-status').textContent = storageAvailable ? 'Seu planejamento fica salvo neste navegador.' : 'Armazenamento indisponível. Use Imprimir para guardar o planejamento.';
  }
  let toastTimer;
  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3200); }
  const places = [
    { id: 'recoleta', name: 'Recoleta', type: 'bairro', lat: -34.5889, lng: -58.3933, note: 'Museus, cafés e caminhadas. Compare a localização de cada hospedagem.', area: 'Recoleta' },
    { id: 'palermo', name: 'Palermo', type: 'bairro', lat: -34.5812, lng: -58.4267, note: 'Parques e gastronomia. O bairro é grande: confira a distância dos seus passeios.', area: 'Palermo' },
    { id: 'belgrano', name: 'Belgrano', type: 'bairro', lat: -34.5624, lng: -58.4562, note: 'Uma base ao norte da cidade. Compare o tempo de deslocamento até o seu roteiro.', area: 'Belgrano' },
    { id: 'madero', name: 'Puerto Madero', type: 'bairro', lat: -34.6114, lng: -58.3630, note: 'Explore a região das docas e compare hospedagens pelo custo total.', area: 'Puerto Madero' },
    { id: 'santelmo', name: 'San Telmo', type: 'bairro', lat: -34.6218, lng: -58.3731, note: 'Ruas históricas e mercado. Use Street View para conhecer o entorno.', area: 'San Telmo' },
    { id: 'microcentro', name: 'Microcentro', type: 'bairro', lat: -34.6030, lng: -58.3777, note: 'Base central. Confira o entorno, os horários e os deslocamentos do seu plano.', area: 'Microcentro' },
    { id: 'colon', name: 'Teatro Colón', type: 'passeio', lat: -34.6011, lng: -58.3831, note: 'Consulte as visitas e a programação no site oficial antes de ir.', website: 'https://teatrocolon.org.ar/' },
    { id: 'malba', name: 'MALBA', type: 'passeio', lat: -34.5770, lng: -58.4032, note: 'Museu de arte latino-americana. Confira horários e ingressos no site oficial.', website: 'https://www.malba.org.ar/' },
    { id: 'planetario', name: 'Planetário Galileo Galilei', type: 'passeio', lat: -34.5697, lng: -58.4116, note: 'Confira sessões, ingressos e funcionamento no site oficial.', website: 'https://planetario.buenosaires.gob.ar/' },
    { id: 'jardim', name: 'Jardim Japonês', type: 'passeio', lat: -34.5750, lng: -58.4094, note: 'Um passeio ao ar livre. Consulte os horários e a previsão antes de ir.', website: 'https://jardinjapones.org.ar/' },
    { id: 'mayo', name: 'Plaza de Mayo', type: 'passeio', lat: -34.6083, lng: -58.3713, note: 'Um ponto para explorar o centro histórico e combinar passeios próximos.' },
    { id: 'puente', name: 'Puente de la Mujer', type: 'passeio', lat: -34.6077, lng: -58.3647, note: 'Um ponto de referência para caminhar pela região de Puerto Madero.' }
  ];
  const categories = { bairro: 'Bairro · região aproximada', passeio: 'Passeio', hotel: 'Hospedagem · cadastro OpenStreetMap' };
  let hotelsLoaded = false;
  let hotelPromise = null;
  let hotelError = false;
  let filter = 'all';
  let selected = null;
  let map = null;
  let markerGroup = null;
  const savedHas = id => state.saved.some(p => p.id === id);
  const mapSearch = place => 'https://www.google.com/maps/search/?' + new URLSearchParams({ api: '1', query: `${place.name}, Buenos Aires, Argentina` });
  const streetView = place => 'https://www.google.com/maps/@?' + new URLSearchParams({ api: '1', map_action: 'pano', viewpoint: `${place.lat},${place.lng}` });
  function external(label, url, primary = false) { return `<a class="button ${primary ? 'primary' : 'quiet'}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`; }
  function safeWebsite(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
  const measure = (name, target) => document.dispatchEvent(new CustomEvent('atlas:analytics', { detail: { name, target } }));
  function selectPlace(place, move = true, record = true) {
    if (record) measure('place_view', place.id);
    selected = place;
    $('selected-place').hidden = false;
    $('selected-place').innerHTML = `<div><span class="small-label">${esc(categories[place.type] || 'Lugar salvo')}</span><h3>${esc(place.name)}</h3><p>${esc(place.note || 'Confira localização, funcionamento e disponibilidade com a hospedagem.')}</p></div><div class="place-actions">${external('Ver a rua no Street View', streetView(place))}${external('Abrir no Google Maps', mapSearch(place))}${place.website && safeWebsite(place.website) ? external('Site do lugar', safeWebsite(place.website)) : ''}<button class="button quiet" id="save-selected" type="button">${savedHas(place.id) ? 'Remover dos salvos' : 'Salvar no roteiro'}</button>${place.type === 'bairro' || place.type === 'hotel' ? '<button class="button primary" id="search-selected-stay" type="button">Ver quartos e preços ↗</button>' : ''}</div>`;
    $('save-selected').addEventListener('click', () => toggleSaved(place));
    $('search-selected-stay')?.addEventListener('click', () => {
      if (place.area) { $('stay-area').value = place.area; updateTrip(); }
      if (!$('stay-form').reportValidity() || !updateTrip()) { $('stay-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      measure('stay_search', place.id);
      window.open(bookingUrl(place.type === 'hotel' ? `${place.name}, Buenos Aires` : null), '_blank', 'noopener,noreferrer');
    });
    if (map && move) map.setView([place.lat, place.lng], place.type === 'bairro' ? 14 : 16);
    renderPlaces();
  }
  function toggleSaved(place) {
    if (savedHas(place.id)) state.saved = state.saved.filter(p => p.id !== place.id);
    else state.saved.push({ ...place });
    measure(savedHas(place.id) ? 'favorite_add' : 'favorite_remove', place.id);
    persist(); renderSaved(); renderPlaces();
    if (selected?.id === place.id) selectPlace(place, false, false);
    toast(savedHas(place.id) ? 'Lugar salvo no seu roteiro.' : 'Lugar removido do roteiro.');
  }
  function filteredPlaces() {
    const query = normalize($('place-search').value.trim());
    return (filter === 'saved' ? state.saved : places).filter(p => (['all', 'saved'].includes(filter) || p.type === filter) && normalize(`${p.name} ${p.area || ''} ${p.note || ''} ${categories[p.type] || ''}`).includes(query));
  }
  function renderPlaces() {
    const list = filteredPlaces();
    $('place-count').textContent = `${list.length} ${list.length === 1 ? 'lugar' : 'lugares'}`;
    const container = $('place-list'); container.replaceChildren();
    if (!list.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      empty.textContent = filter === 'hotel' && !hotelsLoaded ? 'Carregando o cadastro de hospedagens…' : filter === 'saved' ? 'Salve lugares pelo botão ☆. Eles aparecem aqui e no seu roteiro.' : 'Nenhum lugar encontrado. Tente outro nome ou filtro.';
      container.append(empty);
      if (hotelError && filter === 'hotel') { empty.textContent = 'Não foi possível carregar o cadastro. Você ainda pode pesquisar quartos e preços abaixo.'; const retry = document.createElement('button'); retry.className = 'button quiet'; retry.type = 'button'; retry.textContent = 'Tentar novamente'; retry.addEventListener('click', loadHotels); empty.append(retry); }
    }
    for (const place of list) {
      const row = document.createElement('div'); row.className = 'place-item';
      const button = document.createElement('button'); button.type = 'button'; button.className = `place-select${selected?.id === place.id ? ' selected' : ''}`; button.dataset.place = place.id;
      button.innerHTML = `<strong>${esc(place.name)}</strong><small>${esc(categories[place.type] || 'Lugar salvo')}</small>`;
      button.addEventListener('click', () => selectPlace(place));
      const save = document.createElement('button'); save.type = 'button'; save.className = `save-button${savedHas(place.id) ? ' saved' : ''}`; save.textContent = savedHas(place.id) ? '★' : '☆'; save.setAttribute('aria-label', `${savedHas(place.id) ? 'Remover' : 'Salvar'} ${place.name}`); save.setAttribute('aria-pressed', String(savedHas(place.id))); save.addEventListener('click', () => toggleSaved(place));
      row.append(button, save); container.append(row);
    }
    if (markerGroup) {
      markerGroup.clearLayers();
      list.forEach(place => {
        const popup = document.createElement('div'); const name = document.createElement('strong'); name.textContent = place.name;
        const detail = document.createElement('button'); detail.type = 'button'; detail.textContent = 'Ver lugar e opções'; detail.addEventListener('click', () => selectPlace(place, false)); popup.append(name, document.createElement('br'), detail);
        const icon = L.divIcon({ className: `map-pin ${place.type}`, html: `<span><b>${place.type === 'hotel' ? 'H' : place.type === 'bairro' ? 'B' : '•'}</b></span>`, iconSize: [30, 36], iconAnchor: [15, 36] });
        const marker = L.marker([place.lat, place.lng], { icon, title: place.name, alt: place.name }).bindPopup(popup).on('click', () => selectPlace(place, false)).addTo(markerGroup);
        marker.getElement().setAttribute('aria-label', place.name);
      });
    }
  }
  function fitMap() { const list = filteredPlaces(); if (map && list.length) map.fitBounds(list.map(p => [p.lat, p.lng]), { padding: [35, 35], maxZoom: 14 }); }
  function initMap() {
    if (map) { map.invalidateSize(); return; }
    if (!window.L) { $('map-message').textContent = 'Não foi possível abrir o mapa. A lista, os links e as consultas continuam disponíveis.'; $('map-message').hidden = false; return; }
    map = L.map('map', { scrollWheelZoom: false }).setView([-34.596, -58.403], 13);
    let tileErrors = 0;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
    tiles.on('tileerror', () => { if (++tileErrors >= 3) { $('map-message').textContent = 'O mapa está com dificuldade para carregar. Use a lista ou abra o lugar no Google Maps.'; $('map-message').hidden = false; } });
    tiles.on('load', () => { if (tileErrors === 0) $('map-message').hidden = true; });
    tiles.addTo(map); markerGroup = L.layerGroup().addTo(map); $('map').dataset.ready = 'true';
    map.on('zoomend', () => { $('map').dataset.zoom = String(map.getZoom()); });
    renderPlaces();
  }
  async function loadHotels() {
    if (hotelsLoaded) return;
    if (hotelPromise) return hotelPromise;
    hotelError = false; renderPlaces();
    hotelPromise = (async () => {
      try {
        const response = await fetch('assets/hotels.json', { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error('hotel data unavailable');
        const data = await response.json();
        if (!Array.isArray(data.places) || !data.places.length) throw new Error('hotel data empty');
        for (const p of data.places) if (typeof p.id === 'string' && typeof p.name === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -34.7 && p.lat <= -34.5 && p.lng >= -58.5 && p.lng <= -58.3) places.push({ ...p, type: 'hotel' });
        hotelsLoaded = true;
      } catch { hotelError = true; }
      finally { hotelPromise = null; renderPlaces(); }
    })();
    return hotelPromise;
  }
  const tabs = [...document.querySelectorAll('.tab')];
  function showTab(id, push = true, focus = false) {
    if (!tabs.some(tab => tab.dataset.t === id)) id = 'geral';
    document.dispatchEvent(new CustomEvent('atlas:section', { detail: { section: id } }));
    tabs.forEach(tab => { const active = tab.dataset.t === id; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; const panel = $(tab.dataset.t); panel.hidden = !active; panel.classList.toggle('active', active); if (active && focus) tab.focus(); });
    if (push && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    if (id === 'onde') requestAnimationFrame(() => { initMap(); loadHotels(); });
  }
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => showTab(tab.dataset.t)); tab.addEventListener('keydown', event => { let next; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1; if (next !== undefined) { event.preventDefault(); showTab(tabs[next].dataset.t, true, true); } }); });
  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => { showTab(button.dataset.go); $('main').scrollIntoView({ behavior: 'smooth', block: 'start' }); $(button.dataset.go).focus({ preventScroll: true }); }));
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1), false));
  window.addEventListener('popstate', () => showTab(location.hash.slice(1), false));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); }); renderPlaces(); if (filter === 'hotel') loadHotels(); }));
  $('place-search').addEventListener('input', renderPlaces); $('fit-map').addEventListener('click', fitMap);
  const budgetNames = ['Passagens aéreas', 'Hospedagem', 'Alimentação', 'Passeios', 'Transporte local', 'Seguro viagem'];
  budgetNames.forEach((name, i) => { const label = document.createElement('label'); label.innerHTML = `<span>${name}</span><input type="number" id="budget-${i}" min="0" max="10000000" step="1" inputmode="numeric" value="${state.budget[i]}" aria-label="${name} em reais">`; const input = label.querySelector('input'); input.addEventListener('input', () => { if (!input.validity.valid || input.value === '') return; state.budget[i] = Number(input.value); persist(); renderBudget(); }); $('budget-inputs').append(label); });
  function nights() { return Math.round((Date.parse(`${state.checkout}T00:00:00Z`) - Date.parse(`${state.checkin}T00:00:00Z`)) / 86400000); }
  function renderBudget() {
    const total = state.budget.reduce((a, b) => a + b, 0); const count = state.adults + state.ages.length; const days = nights();
    $('budget-total').textContent = $('hero-budget').textContent = money(total);
    $('budget-average').textContent = `${money(total / count)} por pessoa · ${days} noites${days > 0 ? ` · ${money(state.budget.slice(2).reduce((a, b) => a + b, 0) / days)} por dia para gastos locais do grupo` : ''}`;
    $('budget-bars').innerHTML = budgetNames.map((name, i) => `<div class="budget-bar-row"><div class="bar-label"><span>${name}</span><span>${money(state.budget[i])} · ${total ? Math.round(state.budget[i] / total * 100) : 0}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${total ? state.budget[i] / total * 100 : 0}%"></div></div></div>`).join('');
    $('flight-total').textContent = money(state.budget[0]); $('flight-per-person').textContent = `${money(state.budget[0] / count)} por pessoa, em média`;
  }
  $('reset-budget').addEventListener('click', () => { state.budget = [...defaults.budget]; state.budget.forEach((value, i) => { $(`budget-${i}`).value = value; }); persist(); renderBudget(); toast('Estimativas iniciais restauradas.'); });
  for (const [id, key] of [['checkin', 'checkin'], ['checkout', 'checkout'], ['stay-area', 'area'], ['rooms', 'rooms'], ['adults', 'adults'], ['flight-origin', 'origin']]) $(id).value = state[key];
  $('children').value = state.ages.length;
  function renderAges() { $('child-ages').innerHTML = state.ages.map((age, index) => `<label>Idade da criança ${index + 1}<select data-age="${index}">${Array.from({ length: 18 }, (_, n) => `<option value="${n}"${n === age ? ' selected' : ''}>${n} ${n === 1 ? 'ano' : 'anos'}</option>`).join('')}</select></label>`).join(''); $('child-ages').querySelectorAll('select').forEach(select => select.addEventListener('change', () => { state.ages[Number(select.dataset.age)] = Number(select.value); updateTrip(); })); }
  function updateTrip() {
    const start = $('checkin').value; const end = $('checkout').value; const adults = Number($('adults').value);
    const days = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
    const valid = start && end && Number.isFinite(days) && days > 0 && days <= 365 && Number.isInteger(adults) && adults >= 1 && adults <= 12;
    $('stay-error').hidden = Boolean(valid);
    if (!valid) { $('stay-error').textContent = 'Escolha uma saída depois da entrada (até 365 noites) e de 1 a 12 adultos.'; $('stay-summary').textContent = 'Revise as datas e os viajantes para pesquisar.'; $('google-hotels').removeAttribute('href'); $('flight-search').removeAttribute('href'); return false; }
    Object.assign(state, { checkin: start, checkout: end, adults, area: $('stay-area').value, rooms: Number($('rooms').value), origin: $('flight-origin').value });
    const date = new Date(`${start}T12:00:00Z`); const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(date);
    $('trip-month').innerHTML = `${esc(month[0].toUpperCase() + month.slice(1))} <span>${date.getUTCFullYear()}</span>`;
    $('hero-nights').textContent = days; $('stay-summary').textContent = `${days} ${days === 1 ? 'noite' : 'noites'} · ${adults} ${adults === 1 ? 'adulto' : 'adultos'}${state.ages.length ? ` + ${state.ages.length} ${state.ages.length === 1 ? 'criança' : 'crianças'}` : ''} · ${state.rooms} ${state.rooms === 1 ? 'quarto' : 'quartos'}`;
    $('flight-travelers').textContent = `${adults} adultos${state.ages.length ? ` e ${state.ages.length} criança(s)` : ''}.`;
    $('flight-origin-code').innerHTML = `${esc(state.origin)}<small>Brasil</small>`;
    $('google-hotels').href = 'https://www.google.com/travel/hotels?' + new URLSearchParams({ q: `hotéis em ${state.area}, Buenos Aires, Argentina de ${start} a ${end}, ${adults} adultos${state.ages.length ? ` e crianças de ${state.ages.join(', ')} anos` : ''}, ${state.rooms} quartos` });
    $('flight-search').href = 'https://www.google.com/travel/flights?' + new URLSearchParams({ q: `Voos ida e volta de ${state.origin} para Buenos Aires de ${start} a ${end} para ${adults} adultos${state.ages.length ? ` e ${state.ages.length} crianças de ${state.ages.join(', ')} anos` : ''}` });
    persist(); renderBudget(); return true;
  }
  function bookingUrl(search = null) { const params = new URLSearchParams({ ss: search || `${state.area === 'Buenos Aires' ? 'Buenos Aires' : `${state.area}, Buenos Aires`}, Argentina`, checkin: state.checkin, checkout: state.checkout, group_adults: state.adults, group_children: state.ages.length, no_rooms: state.rooms }); state.ages.forEach(age => params.append('age', age)); return 'https://www.booking.com/searchresults.pt-br.html?' + params; }
  ['checkin', 'checkout', 'stay-area', 'rooms', 'adults', 'flight-origin'].forEach(id => $(id).addEventListener('change', updateTrip));
  $('children').addEventListener('change', () => { state.ages = Array.from({ length: Number($('children').value) }, (_, i) => state.ages[i] ?? 10); renderAges(); updateTrip(); });
  $('stay-form').addEventListener('submit', event => { event.preventDefault(); if ($('stay-form').reportValidity() && updateTrip()) { measure('stay_search', normalize(state.area).replace(/ /g, '-')); window.open(bookingUrl(), '_blank', 'noopener,noreferrer'); } });
  function renderSaved() {
    $('saved-count').textContent = `${state.saved.length} ${state.saved.length === 1 ? 'lugar' : 'lugares'}`; $('saved-list').replaceChildren();
    if (!state.saved.length) $('saved-list').innerHTML = '<p class="empty">Seu roteiro está em branco. Explore o mapa e salve os lugares que quer conhecer.</p>';
    state.saved.forEach((place, index) => {
      const row = document.createElement('div'); row.className = 'saved-item'; row.innerHTML = `<span class="step-number">${String(index + 1).padStart(2, '0')}</span><div class="saved-name"><strong>${esc(place.name)}</strong><small>${esc(categories[place.type] || 'Lugar')}</small></div>`;
      for (const [label, char, direction] of [['Mover para cima', '↑', -1], ['Mover para baixo', '↓', 1], ['Remover', '×', 0]]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'mini-button'; button.textContent = char; button.setAttribute('aria-label', `${label}: ${place.name}`); button.disabled = direction === -1 && index === 0 || direction === 1 && index === state.saved.length - 1;
        button.addEventListener('click', () => { if (!direction) state.saved.splice(index, 1); else [state.saved[index], state.saved[index + direction]] = [state.saved[index + direction], state.saved[index]]; persist(); renderSaved(); renderPlaces(); if (selected) selectPlace(selected, false, false); }); row.append(button);
      }
      $('saved-list').append(row);
    });
    const route = $('route-link'); route.hidden = state.saved.length < 2;
    if (!route.hidden) { const points = state.saved.slice(0, 5).map(p => `${p.lat},${p.lng}`); const params = new URLSearchParams({ api: '1', origin: points[0], destination: points.at(-1), travelmode: 'walking' }); if (points.length > 2) params.set('waypoints', points.slice(1, -1).join('|')); route.href = 'https://www.google.com/maps/dir/?' + params; }
  }
  const tasks = [['Definir datas e viajantes', 'Confirme o período e quem vai viajar.'], ['Conferir documentos', 'Confira as exigências oficiais para adultos e menores.'], ['Pesquisar e comprar passagens', 'Compare preço total, bagagem e aeroportos.'], ['Escolher e reservar hospedagem', 'Confira quartos, localização e cancelamento.'], ['Organizar seguro e dinheiro', 'Compare cobertura, câmbio e meios de pagamento.'], ['Montar o roteiro', 'Agrupe passeios próximos e inclua pausas.'], ['Revisar antes do embarque', 'Confira reservas, documentos e previsão do tempo.']];
  function updateChecklist() { $('checklist-count').textContent = `${state.completed.length} de ${tasks.length}`; $('checklist-progress').value = state.completed.length; }
  tasks.forEach(([title, note], index) => { const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" data-task="${index}"${state.completed.includes(index) ? ' checked' : ''}><span>${title}<small>${note}</small></span>`; label.querySelector('input').addEventListener('change', event => { state.completed = [...new Set(event.target.checked ? [...state.completed, index] : state.completed.filter(i => i !== index))]; persist(); updateChecklist(); }); $('checklist').append(label); });
  $('print-plan').addEventListener('click', () => window.print());
  renderAges(); updateTrip(); renderSaved(); updateChecklist(); renderPlaces(); showTab(location.hash.slice(1) || 'geral', false);
})();
