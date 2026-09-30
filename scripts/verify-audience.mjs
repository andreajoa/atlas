// Real browser -> consent -> API -> SQLite -> authenticated dashboard, using the local dev server.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/sqlite.mjs';
const session='atlas-audience-check';
const run=(...args)=>execFileSync('agent-browser',['--session',session,...args],{encoding:'utf8',timeout:60000});
const evaluate=script=>{
 const output=execFileSync('agent-browser',['--session',session,'eval','--stdin'],{input:script,encoding:'utf8',timeout:60000});
 const result=JSON.parse(output.trim());return typeof result==='string'?JSON.parse(result):result;
};
const password=JSON.parse(readFileSync(new URL('../.local/secrets.json',import.meta.url),'utf8')).ADMIN_PASSWORD;
const db=openDatabase(new URL('../.local/analytics.sqlite',import.meta.url).pathname);
let visitorId;
try{
 run('open','http://127.0.0.1:4188/?review=audience&utm_source=browser-verification&utm_medium=test');
 run('set','headers','{"User-Agent":"Mozilla/5.0 Chrome/135.0.0.0 Safari/537.36"}');
 run('open','http://127.0.0.1:4188/?review=audience&utm_source=browser-verification&utm_medium=test');
 evaluate(`(() => { localStorage.removeItem('atlas:privacy:v1');localStorage.removeItem('atlas:visitor:v1');sessionStorage.removeItem('atlas:session:v1'); return JSON.stringify({reset:true}); })()`);
 run('reload');
 const result=evaluate(`(async()=>{
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const $=id=>document.getElementById(id);
 assert(!localStorage.getItem('atlas:visitor:v1'),'No ID before consent');
 assert(!performance.getEntriesByType('resource').some(r=>r.name.includes('/api/collect')),'No measurement before consent');
 document.querySelector('[data-choice="declined"]').click();
 $('tab-orc').click();$('budget-0').value=12345;$('budget-0').dispatchEvent(new Event('input',{bubbles:true}));
 assert(!localStorage.getItem('atlas:visitor:v1'),'Essential tools work without audience ID');
 window.__measurement=[];const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);if(String(args[0]).includes('/api/collect')){const payload=JSON.parse(args[1].body);window.__measurement.push({status:response.status,keys:Object.keys(payload),containsBudget:JSON.stringify(payload).includes('12345')});}return response;};
 atlasPrivacy.open();document.querySelector('[data-choice="accepted"]').click();
 for(let i=0;i<100&&!window.__measurement.length;i++)await sleep(100);
 assert(window.__measurement[0]?.status===202,'Consented visit reaches collector');
 $('tab-onde').click();for(let i=0;i<100&&!document.querySelector('[data-place="recoleta"]');i++)await sleep(100);
 document.querySelector('[data-place="recoleta"]').click();
 if(document.getElementById('save-selected').textContent.includes('Remover'))$('save-selected').click();
 $('save-selected').click();const originalOpen=window.open;window.open=()=>null;
 $('stay-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));window.open=originalOpen;
 $('tab-orc').click();$('budget-0').dispatchEvent(new Event('change',{bubbles:true}));
 await sleep(1300);window.dispatchEvent(new Event('pagehide'));await sleep(600);
 assert(window.__measurement.every(r=>r.status===202&&!r.containsBudget),'No form values sent');
 return JSON.stringify({visitorId:JSON.parse(localStorage.getItem('atlas:visitor:v1')).id,posts:window.__measurement.length,privacy:true});
 })()`);
 visitorId=result.visitorId;
 const stored=await db.prepare('SELECT id FROM sessions WHERE visitor_id = ?').bind(visitorId).first();assert.ok(stored,'Session persisted');
 const events=(await db.prepare('SELECT name FROM events WHERE session_id = ?').bind(stored.id).all()).results.map(r=>r.name);
 for(const name of ['page_view','section_view','place_view','favorite_add','stay_search','budget_edit'])assert.ok(events.includes(name),'Stored '+name);
 run('open','http://127.0.0.1:4188/dashboard');
 // Password travels over stdin and never appears in command arguments or output.
 const dashboard=evaluate(`(async()=>{document.getElementById('admin-password').value=${JSON.stringify(password)};document.getElementById('login-form').requestSubmit();for(let i=0;i<100&&document.getElementById('audience-panel').hidden;i++)await new Promise(r=>setTimeout(r,100));if(document.getElementById('audience-panel').hidden)throw new Error('Dashboard authentication failed');return JSON.stringify({visits:Number(document.getElementById('metric-visits').textContent.replace(/\\D/g,'')),time:document.getElementById('metric-time').textContent,hasMap:document.getElementById('sections-table').innerText.includes('Mapa e hospedagem'),local:document.getElementById('environment').textContent.includes('local')});})()`);
 assert.ok(dashboard.visits>=1);assert.ok(dashboard.hasMap);assert.ok(dashboard.local);
 run('set','viewport','1440','1000');run('open','http://127.0.0.1:4188/dashboard');run('screenshot','/private/tmp/atlas-dashboard-desktop.png','--full');
 run('set','viewport','390','844');run('open','http://127.0.0.1:4188/dashboard');
 assert.ok(evaluate(`JSON.stringify({fits:document.documentElement.scrollWidth<=innerWidth})`).fits);
 run('screenshot','/private/tmp/atlas-dashboard-mobile.png','--full');
 run('open','http://127.0.0.1:4188/privacidade.html');
 const deleted=evaluate(`(async()=>{document.getElementById('forget-statistics').click();for(let i=0;i<100&&!document.getElementById('forget-status').textContent.includes('excluídos');i++)await new Promise(r=>setTimeout(r,100));return JSON.stringify({deleted:document.getElementById('forget-status').textContent.includes('excluídos'),declined:atlasPrivacy.choice()==='declined',idRemoved:!localStorage.getItem('atlas:visitor:v1')});})()`);
 assert.ok(deleted.deleted&&deleted.declined&&deleted.idRemoved);
 assert.equal(await db.prepare('SELECT id FROM sessions WHERE visitor_id = ?').bind(visitorId).first(),null);
 console.log('PASS: consent/decline, real browser events, persistence, private dashboard, mobile layout, and deletion. Test visitor removed.');
}finally{
 if(visitorId)await db.prepare('DELETE FROM sessions WHERE visitor_id = ?').bind(visitorId).run();
 db.close();run('close');
}
