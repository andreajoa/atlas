'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const local = ['localhost','127.0.0.1'].includes(location.hostname);
  const endpoint = local ? location.origin : window.ATLAS_ANALYTICS?.endpoint || (/\.workers\.dev$/.test(location.hostname) ? location.origin : '');
  const TOKEN = 'atlas:dashboard-token';
  let token = ''; let summary; let busy = false;
  try { token = sessionStorage.getItem(TOKEN) || ''; } catch { /* Keep credentials only in memory. */ }
  const format = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(n) || 0);
  const duration = ms => { const seconds = Math.round((Number(ms)||0)/1000); return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds/60)}min ${seconds%60}s`; };
  const sections = {geral:'Visão geral',onde:'Mapa e hospedagem',voo:'Passagens',orc:'Orçamento',etapas:'Roteiro e etapas',artigo:'Leitura do guia'};
  const names = {page_view:'Página vista',section_view:'Seção vista',click:'Clique',stay_search:'Pesquisa de hospedagem',flight_search:'Pesquisa de voo',place_view:'Lugar explorado',favorite_add:'Lugar salvo',print:'Impressão',search:'Busca no mapa',budget_edit:'Ajuste de orçamento'};
  const pages = {'/':'Guia e planejador','/onde-ficar-buenos-aires.html':'Onde ficar em Buenos Aires','/orcamento-viagem-argentina.html':'Orçamento da viagem','/documentos-viagem-argentina.html':'Documentos para viajar','/sobre.html':'Sobre o Atlas','/privacidade.html':'Privacidade'};
  const targets = {'open:onde':'Abrir mapa','open:orc':'Abrir orçamento','open:etapas':'Abrir roteiro','tab:onde':'Aba do mapa','tab:geral':'Visão geral','tab:voo':'Aba de passagens','tab:orc':'Aba de orçamento','tab:etapas':'Aba do roteiro','stay-form':'Formulário de hospedagem','planning':'Planejamento','save-selected':'Salvar ou remover lugar','tab-onde':'Aba do mapa','tab-geral':'Visão geral','tab-voo':'Aba de passagens','tab-orc':'Aba de orçamento','tab-etapas':'Aba do roteiro','budget-0':'Passagens','budget-1':'Hospedagem','budget-2':'Alimentação','budget-3':'Passeios','budget-4':'Transporte','budget-5':'Seguro','places':'Lugares no mapa','print-plan':'Imprimir planejamento','search-selected-stay':'Consultar quartos do lugar','fit-map':'Ver todos no mapa'};
  function target(value) { return targets[value] || (value.startsWith('external:') ? 'Abrir ' + value.slice(9) : value.startsWith('guide:') ? pages[value.slice(6)] || value.slice(6) : value); }
  function message(id, text) { $(id).textContent = text; $(id).hidden = !text; }
  function logout() { token = ''; summary = null; try { sessionStorage.removeItem(TOKEN); } catch {} $('audience-panel').hidden = true; $('login-panel').hidden = false; $('logout').hidden = true; $('environment').textContent = 'Acesso protegido'; }
  async function api(path, options = {}) {
    if (!endpoint) throw new Error('A medição de produção ainda não está conectada. O painel pode ser usado no servidor local.');
    const response = await fetch(endpoint + path, { ...options, cache: 'no-store', credentials: 'omit', headers: { ...(options.body ? { 'Content-Type':'application/json' } : {}), ...(token ? { Authorization:'Bearer '+token } : {}), ...options.headers } });
    const data = await response.json();
    if (response.status === 401 && path.startsWith('/api/dashboard')) logout();
    if (!response.ok) throw new Error(data.error || 'Não foi possível consultar os dados.');
    return data;
  }
  function table(id, headers, rows) {
    const container = $(id); container.replaceChildren();
    if (!rows.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Ainda não há dados neste período.'; container.append(empty); return; }
    const element = document.createElement('table'); const head = document.createElement('thead'); const tr = document.createElement('tr');
    headers.forEach(text => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; tr.append(th); }); head.append(tr); element.append(head);
    const body = document.createElement('tbody');
    rows.forEach(row => { const line = document.createElement('tr'); row.forEach(value => { const td = document.createElement('td'); if (Array.isArray(value)) { td.textContent=value[0]; const small=document.createElement('small'); small.textContent=value[1]; td.append(small); } else td.textContent=String(value); line.append(td); }); body.append(line); });
    element.append(body); container.append(element);
  }
  function chart(data) {
    const container = $('visit-chart'); container.replaceChildren(); const byDay = new Map(data.timeline.map(d => [d.day,d.visits]));
    const now = new Date(data.generatedAt); const rows=[];
    for(let i=data.days-1;i>=0;i--) { const date=new Date(now); date.setUTCDate(date.getUTCDate()-i); const day=date.toISOString().slice(0,10); rows.push({day,n:byDay.get(day)||0}); }
    // A rolling 24-hour window can include yesterday. Keep the chart's total consistent with the report.
    for(const entry of data.timeline) if(!rows.some(row=>row.day===entry.day)) rows.unshift({day:entry.day,n:entry.visits});
    const max = Math.max(1,...rows.map(r=>r.n));
    rows.forEach((r,i) => { const bar=document.createElement('div'); bar.className='day-bar'; bar.tabIndex=0; bar.title=`${r.day}: ${r.n} visitas`; bar.setAttribute('aria-label',bar.title); const fill=document.createElement('i'); fill.style.height=(r.n/max*100)+'%'; fill.setAttribute('aria-hidden','true'); bar.append(fill); if(rows.length<=10||i===0||i===rows.length-1||i%Math.ceil(rows.length/6)===0){const label=document.createElement('span');label.textContent=r.day.slice(8)+'/'+r.day.slice(5,7);bar.append(label);}container.append(bar); });
  }
  function render(data) {
    summary=data;
    $('metric-visits').textContent=format(data.totals.visits); $('metric-visitors').textContent=format(data.totals.visitors); $('metric-time').textContent=duration(data.totals.avgActiveMs); $('metric-online').textContent=format(data.totals.online); $('metric-pageviews').textContent=format(data.totals.pageViews); $('metric-returns').textContent=format(data.totals.returns);
    $('environment').textContent=data.environment==='local'?'Dados do servidor local':'Medição em produção';
    $('updated').textContent='Atualizado em '+new Date(data.generatedAt).toLocaleString('pt-BR')+' · apenas visitas com estatísticas permitidas';
    $('empty-state').hidden=data.totals.visits>0; chart(data);
    table('pages-table',['Página','Visualizações','Visitas'],data.pages.map(r=>[pages[r.target]||r.target,format(r.views),format(r.visits)]));
    table('sections-table',['Seção','Visualizações','Visitas'],data.sections.map(r=>[sections[r.target]||r.target,format(r.views),format(r.visits)]));
    table('actions-table',['Ação / destino','Ocorrências','Visitas'],data.actions.map(r=>[[names[r.name]||r.name,target(r.target)],format(r.clicks),format(r.visits)]));
    table('sources-table',['Origem','Visitas'],data.sources.map(r=>[[r.source,[r.medium,r.campaign].filter(Boolean).join(' · ')],format(r.visits)]));
    const country = code => { try{return code==='ND'?'País indisponível':new Intl.DisplayNames(['pt-BR'],{type:'region'}).of(code);}catch{return code;} };
    table('locations-table',['Localização aproximada','Visitas'],data.locations.map(r=>[[r.city,[r.region,country(r.country)].join(' · ')],format(r.visits)]));
    table('devices-table',['Dispositivo','Visitas'],data.devices.map(r=>[[r.device,r.browser],format(r.visits)]));
    table('engagement-table',['Página / seção','Tempo ativo acumulado','Rolagem média'],data.engagement.map(r=>[[pages[r.page]||r.page,sections[r.section]||r.section],duration(r.activeMs),format(r.avgScroll)+'%']));
    const list=$('conversion-list');list.replaceChildren();
    [['Pesquisa de hotéis',data.totals.hotelSearches],['Pesquisa de voos',data.totals.flightSearches],['Salvou algum lugar',data.totals.savedTrips]].forEach(([label,n])=>{const row=document.createElement('div');const text=document.createElement('span');text.textContent=label;const count=document.createElement('strong');count.textContent=format(n);row.append(text,count);list.append(row);});
    $('quota-note').textContent=`Proteção de uso gratuito: ${format(data.measurement.usedToday)} de ${format(data.measurement.limitPerDay)} registros hoje. Ao atingir o limite, a coleta pausa até o próximo dia UTC. A navegação continua funcionando.`;
    $('login-panel').hidden=true;$('audience-panel').hidden=false;$('logout').hidden=false;
  }
  async function refresh() { if(busy)return;busy=true;$('refresh').disabled=true;message('dashboard-error','');try{render(await api('/api/dashboard?days='+$('period').value));}catch(error){message(token?'dashboard-error':'login-error',error.message);}finally{busy=false;$('refresh').disabled=false;} }
  $('login-form').addEventListener('submit',async event=>{event.preventDefault();message('login-error','');$('login-button').disabled=true;try{const result=await api('/api/login',{method:'POST',body:JSON.stringify({password:$('admin-password').value})});token=result.token;try{sessionStorage.setItem(TOKEN,token);}catch{}$('admin-password').value='';await refresh();}catch(error){message('login-error',error.message);}finally{$('login-button').disabled=false;}});
  $('logout').addEventListener('click',logout);$('refresh').addEventListener('click',refresh);$('period').addEventListener('change',refresh);
  $('export').addEventListener('click',()=>{
    if(!summary)return;
    const rows=[['Atlas Viagem','Relatório de audiência'],['Gerado em',new Date(summary.generatedAt).toISOString()],['Período (dias)',summary.days],['Ambiente',summary.environment],[],['Métrica','Valor'],...Object.entries(summary.totals),[],['Página','Visualizações','Visitas'],...summary.pages.map(r=>[pages[r.target]||r.target,r.views,r.visits]),[],['Seção','Visualizações','Visitas'],...summary.sections.map(r=>[sections[r.target]||r.target,r.views,r.visits]),[],['Ação','Destino','Ocorrências','Visitas'],...summary.actions.map(r=>[names[r.name]||r.name,target(r.target),r.clicks,r.visits]),[],['Origem','Meio','Campanha','Visitas'],...summary.sources.map(r=>[r.source,r.medium,r.campaign,r.visits]),[],['País','Região','Cidade aproximada','Visitas'],...summary.locations.map(r=>[r.country,r.region,r.city,r.visits]),[],['Dispositivo','Navegador','Visitas'],...summary.devices.map(r=>[r.device,r.browser,r.visits]),[],['Página','Seção','Tempo ativo (ms)','Rolagem média (%)'],...summary.engagement.map(r=>[r.page,r.section,r.activeMs,r.avgScroll])];
    const cell=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='atlas-audiencia-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  if(!endpoint){$('connection-note').textContent='Produção ainda não conectada. Para testar localmente, inicie npm run dev e abra /dashboard.';$('login-button').disabled=true;}
  else api('/api/status').then(status=>{$('connection-note').textContent=status.collectionReady?'Servidor disponível. Entre para ver os dados.':'Medição ainda não configurada no servidor.';if(!status.collectionReady)$('login-button').disabled=true;}).catch(()=>{$('connection-note').textContent='Servidor indisponível. Não há números simulados neste painel.';});
  if(token)void refresh();
})();
