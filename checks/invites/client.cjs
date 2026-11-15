const fs=require('fs'),assert=require('assert'),ts=require('/home/sandbox/ct-fit/node_modules/typescript');global.crypto=require('crypto').webcrypto;
fs.writeFileSync('/tmp/invite234-client.js',ts.transpileModule(fs.readFileSync('/home/sandbox/ct-fit/src/lib/durable-invites.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const {inviteIdentity,hasHostIdentity,createInviteStore,inviteWriter}=require('/tmp/invite234-client');
const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const host=inviteIdentity('haywire','qa-room','host',storage),guest=inviteIdentity('haywire','qa-room','guest',storage);assert.equal(host.length,64);assert.notEqual(host,guest);assert(hasHostIdentity('haywire','qa-room',storage));assert.equal(inviteIdentity('haywire','qa-room','host',storage),host);assert(!hasHostIdentity('logic','qa-room',storage));
(async()=>{
 const sent=[];let revision=0;const store=createInviteStore({url:'https://preview.invalid',key:'public-test-key',fetcher:async(url,o)=>{const body=JSON.parse(o.body);sent.push({url,body});if(body.p_expected!==revision)return new Response(JSON.stringify({status:'conflict',revision}));revision++;await new Promise(r=>setTimeout(r,3));return new Response(JSON.stringify({status:'saved',revision,expiresAt:'future'}));}});
 let errors=[],saves=[];const writer=inviteWriter(store,'logic','qa-room',host,0,e=>errors.push(e),e=>saves.push(e));const snap={round:1};writer.save(snap,'waiting');snap.round=99;writer.save({round:2},'playing');await writer.flush();assert.equal(sent[0].body.p_snapshot.round,1);assert.deepEqual(sent.map(s=>s.body.p_expected),[0,1]);assert.equal(errors.length,0);assert.equal(saves.length,2);
 revision=10;writer.save({round:3},'playing');await writer.flush();assert(writer.stopped);writer.save({round:4},'playing');await writer.flush();assert.equal(sent.length,3);assert(errors[0].includes('another host tab'));
 await assert.rejects(createInviteStore({url:'',key:''}).summary('logic','qa-room'),/unavailable/);
 const failing=createInviteStore({url:'https://preview.invalid',key:'public-test-key',fetcher:async()=>{throw Error('offline')}});await assert.rejects(failing.summary('logic','qa-room'),/did not answer/);
 console.log('PASS independent host/guest identity,same-browser return,snapshot freeze,serialized revisions,conflict stop,no silent fake save,offline error');
})().catch(e=>{console.error(e);process.exit(1)});
