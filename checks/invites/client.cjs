const fs=require('fs'),assert=require('assert'),ts=require('/home/sandbox/ct-fit/node_modules/typescript');global.crypto=require('crypto').webcrypto;
fs.writeFileSync('/tmp/invite234-client.js',ts.transpileModule(fs.readFileSync('/home/sandbox/ct-fit/src/lib/durable-invites.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const {inviteIdentity,hasHostIdentity,createInviteStore,inviteWriter,recoverInviteJournal}=require('/tmp/invite234-client');
const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const host=inviteIdentity('haywire','qa-room','host',storage),guest=inviteIdentity('haywire','qa-room','guest',storage);assert.equal(host.length,64);assert.notEqual(host,guest);assert(hasHostIdentity('haywire','qa-room',storage));assert.equal(inviteIdentity('haywire','qa-room','host',storage),host);assert(!hasHostIdentity('logic','qa-room',storage));
(async()=>{
 const sent=[];let revision=0;const store=createInviteStore({url:'https://preview.invalid',key:'public-test-key',fetcher:async(url,o)=>{const body=JSON.parse(o.body);sent.push({url,body});if(body.p_expected!==revision)return new Response(JSON.stringify({status:'conflict',revision}));revision++;await new Promise(r=>setTimeout(r,3));return new Response(JSON.stringify({status:'saved',revision,expiresAt:'future'}));}});
 let errors=[],saves=[];const writer=inviteWriter(store,'logic','qa-room',host,0,e=>errors.push(e),e=>saves.push(e));const snap={round:1};writer.save(snap,'waiting');snap.round=99;writer.save({round:2},'playing');await writer.flush();assert.equal(sent[0].body.p_snapshot.round,1);assert.deepEqual(sent.map(s=>s.body.p_expected),[0,1]);assert.equal(errors.length,0);assert.equal(saves.length,2);
 revision=10;writer.save({round:3},'playing');await writer.flush();assert(writer.stopped);writer.save({round:4},'playing');await writer.flush();assert.equal(sent.length,3);assert(errors[0].includes('another host tab'));
 await assert.rejects(createInviteStore({url:'',key:''}).summary('logic','qa-room'),/unavailable/);
 const failing=createInviteStore({url:'https://preview.invalid',key:'public-test-key',fetcher:async()=>{throw Error('offline')}});await assert.rejects(failing.summary('logic','qa-room'),/did not answer/);
 // Abrupt reload before the request begins: synchronous journal is recoverable.
 const key='gt-durable-invite-v1:journal:logic:journal-room';values.clear();let calls=[],remote={revision:7,snapshot:{round:0}};
 let unblock;const delayed={save:async(game,room,secret,expected,snapshot,phase)=>{calls.push({expected,snapshot,phase});await new Promise(r=>unblock=r);remote={revision:8,snapshot};return {status:'saved',...remote,expiresAt:'future'};}};
 const pending=inviteWriter(delayed,'logic','journal-room',host,7,()=>{},()=>{},storage);pending.save({round:1},'playing');
 assert.equal(recoverInviteJournal('logic','journal-room',remote,storage).snapshot.round,1);await Promise.resolve();
 // A second queued state must survive the first acknowledgement, with advanced base.
 pending.save({round:2},'playing');unblock();await new Promise(r=>setTimeout(r,0));assert.equal(JSON.parse(values.get(key)).baseRevision,8);
 // Remote saved, acknowledgement lost: same writer sequence proves safe lineage.
 assert.equal(recoverInviteJournal('logic','journal-room',remote,storage).snapshot.round,2);
 // Another tab's newer write always wins over an interrupted local state.
 const foreign={revision:9,snapshot:{round:99,__inviteWrite:{writer:'different-writer',sequence:1}}};assert.equal(recoverInviteJournal('logic','journal-room',foreign,storage),null);assert(!values.has(key));
 unblock();await pending.flush();
 // Full acknowledgement clears the journal; stale same-writer sequence cannot win.
 const complete=inviteWriter({save:async(g,r,s,rev,snap)=>({status:'saved',revision:rev+1,snapshot:snap,expiresAt:'future'})},'logic','journal-room',host,10,()=>{},()=>{},storage);complete.save({round:3},'playing');await complete.flush();assert(!values.has(key));
 values.set(key,JSON.stringify({baseRevision:9,phase:'playing',snapshot:{round:2,__inviteWrite:{writer:'one',sequence:2}}}));assert.equal(recoverInviteJournal('logic','journal-room',{revision:11,snapshot:{round:3,__inviteWrite:{writer:'one',sequence:3}}},storage),null);
 console.log('PASS independent host/guest identity,same-browser return,snapshot freeze,serialized revisions,conflict stop,no silent fake save,offline error,write-ahead reload,queued acknowledgements,lost acknowledgement,foreign writer rejection,journal cleanup');
})().catch(e=>{console.error(e);process.exit(1)});
