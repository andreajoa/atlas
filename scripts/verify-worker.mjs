import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const base='http://127.0.0.1:4189';
const secrets=JSON.parse(readFileSync(new URL('../.local/secrets.json',import.meta.url),'utf8'));
const visitorId=randomUUID(),now=Date.now();
const body={consent:true,visitorId,sessionId:randomUUID(),startedAt:now-10000,page:'/',language:'pt-BR',traffic:{source:'worker-verification',medium:'test'},events:[{id:randomUUID(),name:'page_view',page:'/',section:'geral',target:'/',at:now}],engagement:[{id:randomUUID(),at:now-10000,page:'/',section:'geral',activeMs:5000,maxScroll:70}]};
async function api(path,body,token) {const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json','User-Agent':'Mozilla/5.0 Chrome/135.0.0.0',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json()};}
try{
 assert.equal((await api('/api/status')).data.collectionReady,true);
 assert.equal((await api('/api/dashboard')).status,401);
 assert.equal((await api('/api/collect',body)).status,202);assert.equal((await api('/api/collect',body)).status,202);
 const login=await api('/api/login',{password:secrets.ADMIN_PASSWORD});assert.equal(login.status,200);
 const report=await api('/api/dashboard?days=7',null,login.data.token);assert.equal(report.status,200);
 assert.ok(report.data.sources.some(row=>row.source==='worker-verification'&&row.visits===1));
 assert.ok(report.data.engagement.some(row=>row.activeMs>=5000));
 const page=await fetch(base+'/dashboard',{redirect:'manual'});assert.equal(page.status,200);assert.equal(page.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.equal(page.headers.get('Cache-Control'),'no-store');assert.ok((await page.text()).includes('Entrar no painel'));
 assert.equal((await api('/api/forget',{visitorId})).status,200);
 const after=await api('/api/dashboard',null,login.data.token);assert.equal(after.data.sources.some(row=>row.source==='worker-verification'),false);
 console.log('PASS: actual Worker/D1 migration, consented inserts, retries, authentication, aggregate queries, dashboard route and deletion.');
}finally{await api('/api/forget',{visitorId});}
