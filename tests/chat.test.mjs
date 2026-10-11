import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createChatHandler} from '../supabase/functions/chat/handler.mjs';
function setup({status=200,tokenError=false,saveError=false,key=true}={}){
 const inserted=[];
 const db={auth:{getUser:async()=>tokenError?{error:{}}:{data:{user:{id:'verified-user'}}}},from(table){return{select(){return this},eq(){return this},order(){return this},limit:async()=>({data:table==='scraped_content'?[{content:'CAPACITI is a skills programme.'}]:[]}),insert:async rows=>{inserted.push(...rows);return{error:saveError?{}:null}}}}};
 const handler=createChatHandler({env:n=>n==='GROQ_API_KEY'?(key?'test-only':undefined):n==='SUPABASE_ANON_KEY'?'anon':'test',createClient:()=>db,fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:'A digital skills programme.'}}]}),{status})});
 const request=(body={message:'What is CAPACITI?'},token='anon')=>handler(new Request('https://local/chat',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify(body)}));
 return{request,inserted,handler};
}
test('anonymous chat responds without saving history',async()=>{const s=setup();assert.equal((await s.request()).status,200);assert.equal(s.inserted.length,0)});
test('verified identity ignores spoofed userId and saves exactly two messages',async()=>{const s=setup();assert.equal((await s.request({message:'Hello',userId:'someone-else'},'session-token')).status,200);assert.equal(s.inserted.length,2);assert.ok(s.inserted.every(m=>m.user_id==='verified-user'))});
test('invalid sessions rejected before AI',async()=>{const s=setup({tokenError:true});assert.equal((await s.request({message:'Hello'},'bad')).status,401);assert.equal(s.inserted.length,0)});
test('input validation and free quota errors',async()=>{assert.equal((await setup().request({message:{x:1}})).status,400);assert.equal((await setup().request({message:'x'.repeat(2001)})).status,400);assert.equal((await setup({status:429}).request()).status,429)});
test('missing key returns configuration error',async()=>{assert.equal((await setup({key:false}).request()).status,503)});
test('history save failure does not lose valid answer',async()=>{const s=setup({saveError:true});const r=await s.request({message:'Hello'},'session');assert.equal(r.status,200);assert.equal((await r.json()).historySaved,false)});
test('local rate guard limits repeated calls',async()=>{const s=setup();for(let i=0;i<10;i++)assert.equal((await s.request()).status,200);assert.equal((await s.request()).status,429)});
