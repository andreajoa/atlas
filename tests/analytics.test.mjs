import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../server/sqlite.mjs';
import { handleApi, getSummary, cleanup, issueToken, authorized } from '../server/analytics.mjs';
const ORIGIN='https://atlas.example';
function fixture(t, extra={}) { const env={DB:openDatabase(),AUTH_SECRET:'test-secret-with-more-than-32-characters',ADMIN_PASSWORD:'test-password-with-more-than-12-characters',SITE_ORIGINS:ORIGIN,MAX_RECORDS_PER_DAY:'5000',...extra};t.after(()=>env.DB.close());return env; }
function payload(extra={}) { const now=Date.now();return {consent:true,visitorId:randomUUID(),sessionId:randomUUID(),startedAt:now-60000,page:'/',language:'pt-BR',traffic:{referrer:'https://www.google.com/search?q=private',source:'',medium:'',campaign:''},events:[{id:randomUUID(),name:'page_view',page:'/',section:'geral',target:'/',at:now}],engagement:[{id:randomUUID(),page:'/',section:'geral',at:now-60000,activeMs:20000,maxScroll:65}],...extra}; }
function request(path,body,extra={}) {const req=new Request(ORIGIN+path,{method:body?'POST':'GET',headers:{Origin:ORIGIN,'User-Agent':'Mozilla/5.0 Chrome/135.0.0.0','Content-Type':'application/json',...extra.headers},...(body?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});if(extra.cf)Object.defineProperty(req,'cf',{value:extra.cf});return req;}
async function send(env,path,body,extra={}){const res=await handleApi(request(path,body,extra),env);return {status:res.status,data:await res.json(),headers:res.headers};}
test('only consented, known, bounded events are stored; no personal form fields',async t=>{
 const env=fixture(t),body=payload();
 for(const bad of [{...body,consent:false},{...body,sessionId:'invalid'},{...body,page:'/dashboard'},{...body,events:[{...body.events[0],name:'record_keystrokes'}]},{...body,events:[{...body.events[0],target:"'; DROP TABLE sessions;--"}]},{...body,engagement:[{...body.engagement[0],section:'secret'}]}])assert.equal((await send(env,'/api/collect',bad)).status,400);
 assert.equal((await getSummary(env,7)).totals.visits,0);
 const res=await send(env,'/api/collect',{...body,email:'private@example.com',gender:'woman',neighborhood:'private',budget:42000},{cf:{country:'BR',region:'São Paulo',city:'Campinas'}});assert.equal(res.status,202);
 const stored=await env.DB.prepare('SELECT * FROM sessions').first();assert.equal(stored.referrer,'www.google.com');assert.equal(stored.source,'Busca');assert.equal(stored.city,'Campinas');assert.equal(stored.country,'BR');assert.equal(stored.browser,'Chrome');assert.equal(stored.visitor_id,body.visitorId);
 assert.equal(JSON.stringify(stored).includes('private'),false);assert.equal('gender' in stored,false);assert.equal('neighborhood' in stored,false);
});
test('duplicate events and cumulative heartbeats cannot double metrics',async t=>{
 const env=fixture(t),body=payload();await send(env,'/api/collect',body);await send(env,'/api/collect',body);
 let summary=await getSummary(env,7);assert.equal(summary.totals.visits,1);assert.equal(summary.totals.visitors,1);assert.equal(summary.totals.pageViews,1);assert.equal(summary.totals.avgActiveMs,20000);
 body.engagement[0].activeMs=30000;await send(env,'/api/collect',body);summary=await getSummary(env,7);assert.equal(summary.totals.avgActiveMs,30000);
 const second=payload({visitorId:body.visitorId,events:[{...body.events[0],id:randomUUID(),name:'stay_search',target:'recoleta'}]});await send(env,'/api/collect',second);summary=await getSummary(env,7);assert.equal(summary.totals.visits,2);assert.equal(summary.totals.visitors,1);assert.equal(summary.totals.returns,1);assert.equal(summary.totals.hotelSearches,1);
});
test('a different visitor cannot modify an existing session or its engagement',async t=>{
 const env=fixture(t),body=payload();await send(env,'/api/collect',body);const poisoned=payload({sessionId:body.sessionId,engagement:[{...body.engagement[0],activeMs:50000}]});await send(env,'/api/collect',poisoned);const summary=await getSummary(env,7);assert.equal(summary.totals.pageViews,1);assert.equal(summary.totals.avgActiveMs,20000);
});
test('bot traffic, invalid origins, oversized and malformed bodies are rejected',async t=>{
 const env=fixture(t);assert.equal((await send(env,'/api/collect',payload(),{headers:{Origin:'https://attacker.example'}})).status,403);
 assert.equal((await send(env,'/api/collect',payload(),{headers:{'User-Agent':'Googlebot'}})).data.ignored,true);
 assert.equal((await send(env,'/api/collect','{')).status,400);assert.equal((await send(env,'/api/collect','x'.repeat(16001))).status,400);
 assert.equal((await send(env,'/api/collect',payload(),{headers:{'Content-Type':'text/plain'}})).status,400);
 assert.equal((await send(env,'/api/collect',payload(),{headers:{Origin:''}})).status,403);
 assert.equal((await getSummary(env,7)).totals.visits,0);
 const cors=await handleApi(new Request(ORIGIN+'/api/collect',{method:'OPTIONS',headers:{Origin:ORIGIN}}),env);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),ORIGIN);
});
test('authentication protects all summaries and rejects expired or changed signatures',async t=>{
 const env=fixture(t);assert.equal((await send(env,'/api/dashboard?days=7')).status,401);
 const login=await send(env,'/api/login',{password:env.ADMIN_PASSWORD});assert.equal(login.status,200);assert.ok(login.data.token);
 const summary=await send(env,'/api/dashboard?days=30',null,{headers:{Authorization:'Bearer '+login.data.token}});assert.equal(summary.status,200);assert.equal(summary.data.days,30);assert.equal(summary.headers.get('Cache-Control'),'no-store');assert.equal(summary.headers.get('X-Robots-Tag'),'noindex, nofollow');
 assert.equal(await authorized(new Request(ORIGIN,{headers:{Authorization:'Bearer '+login.data.token+'x'}}),env),false);
 const old=await issueToken(env.AUTH_SECRET,Date.now()-5*3600000);assert.equal(await authorized(new Request(ORIGIN,{headers:{Authorization:'Bearer '+old}}),env),false);
 for(let i=0;i<5;i++)assert.equal((await send(env,'/api/login',{password:'incorrect-password'},{headers:{'cf-connecting-ip':'203.0.113.1'}})).status,401);
 assert.equal((await send(env,'/api/login',{password:env.ADMIN_PASSWORD},{headers:{'cf-connecting-ip':'203.0.113.1'}})).status,429);
 const bucket=await env.DB.prepare('SELECT bucket FROM auth_attempts').first();assert.equal(bucket.bucket.includes('203.0.113.1'),false);
});
test('collection stops at the configured daily limit without consuming more quota',async t=>{
 const env=fixture(t,{MAX_RECORDS_PER_DAY:'3'});const body=payload();assert.equal((await send(env,'/api/collect',body)).status,202);assert.equal((await send(env,'/api/collect',payload())).status,429);
 assert.equal((await getSummary(env,7)).measurement.usedToday,2);
 const small=fixture(t,{MAX_RECORDS_PER_DAY:'1'});assert.equal((await send(small,'/api/collect',payload())).status,429);assert.equal((await getSummary(small,7)).measurement.usedToday,0);
});
test('forget removes only that random visitor and cascades to events and engagement',async t=>{
 const env=fixture(t);const a=payload(),b=payload();await send(env,'/api/collect',a);await send(env,'/api/collect',b);
 assert.equal((await send(env,'/api/forget',{visitorId:'invalid'})).status,400);
 assert.equal((await send(env,'/api/forget',{visitorId:a.visitorId})).status,200);const summary=await getSummary(env,7);assert.equal(summary.totals.visits,1);assert.equal(summary.totals.pageViews,1);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM engagement').first()).n,1);
});
test('retention removes expired measurements and empty summaries return actual zeros',async t=>{
 const env=fixture(t);const body=payload();await send(env,'/api/collect',body);await env.DB.prepare('UPDATE sessions SET last_seen = ?, started_at = ?').bind(Date.now()-91*86400000,Date.now()-91*86400000).run();await cleanup(env);
 const summary=await getSummary(env,90);assert.equal(summary.totals.visits,0);assert.equal(summary.totals.pageViews,0);assert.equal(summary.totals.avgActiveMs,0);assert.deepEqual(summary.pages,[]);assert.equal(summary.measurement.gender,false);assert.equal(summary.measurement.neighborhood,false);
 const unconfigured=await handleApi(request('/api/status'),{});assert.equal((await unconfigured.json()).collectionReady,false);assert.equal((await handleApi(request('/api/collect',body),{})).status,503);
});
