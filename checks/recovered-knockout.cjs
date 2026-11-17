const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('assert/strict');
const Module=require('module'),old=Module._resolveFilename;Module._resolveFilename=function(p,...a){return old.call(this,p.startsWith('@/')?path.resolve(__dirname,'../src',p.slice(2)):p,...a)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const G=require('../src/lib/game.ts'),B=require('../src/lib/b8.ts');
for(const n of [2,4,6,8])for(let trial=0;trial<20;trial++){
 let s=G.newState('QA'+trial);s.players.A={...s.players.A,name:'A',joined:true};s.players.B={...s.players.B,name:'B',joined:true};s.hr={wilds:false,sealed:true};
 const ids=G.MOVIES.slice(40,40+n).map(m=>m.id);s.draft.picks={A:ids.slice(0,n/2),B:ids.slice(n/2)};s.hit={grid:ids,endsAt:0,owner:Object.fromEntries(ids.map((id,i)=>[id,i<n/2?'A':'B'])),weap:{A:{veto:null,shields:[],done:true},B:{veto:null,shields:[],done:true}},shieldsAllowed:{A:1,B:1},tok:{A:{},B:{}},budget:{A:100,B:100},res:{dead:[],blocked:[],mocked:null,shield:{},cut:[],until:0}};
 let now=1000;B.buildBracket(s,now);const eliminated=new Set();let bouts=0;let guard=0;
 while(s.phase==='bracket'&&guard++<100){now+=1000000;if(s.b8.show){s.b8.ack={A:true,B:true};B.tick8(s,now);continue;}const m=s.b8.matches[s.b8.cur];assert(m.a&&m.b);assert(!eliminated.has(m.a)&&!eliminated.has(m.b));const win=trial%2?m.b:m.a,lose=trial%2?m.a:m.b;B.finish(s,m,win,'QA deciding bout',now);eliminated.add(lose);bouts++;B.tick8(s,now+B.R.NEXT_MS+1);}
 assert.equal(s.phase,'done');assert.equal(bouts,n-1);assert(!eliminated.has(s.winner));assert.equal(s.fin.verdict.winner,s.winner);assert.equal(s.fin.judging,false);assert.equal(s.reroll.stage,'off');assert.equal(s.fin.verdict.lines.length,0);
 let t=G.reduce(s,{t:'fwatch',pid:'A',id:s.fin.b});assert.equal(t.fin.watch.A,undefined);t=G.reduce(s,{t:'fwatch',pid:'A',id:s.winner});assert.equal(t.tonight,null);t=G.reduce(t,{t:'fwatch',pid:'B',id:s.winner});assert.equal(t.tonight,s.winner);
}
assert(B.R.NEXT_MS<=1500&&B.R.SHOW_MATCH<=2500);console.log('PASS80 knockouts2/4/6/8 titles, n-1bouts, no loser return, immediate deterministic final, both champion confirmations, shorter waits');
