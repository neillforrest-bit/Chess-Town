const fs=require('fs'),ts=require('typescript');
fs.writeFileSync('/tmp/golf-engine.cjs',ts.transpileModule(fs.readFileSync(require('path').join(__dirname,'../../src/games/golf/engine.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText);
const {HOLES,newGame,simulate,shoot,nextHole,total}=require('/tmp/golf-engine.cjs'),assert=require('assert');
let seed=7919;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(const [i,h] of HOLES.entries())for(let j=0;j<200;j++){const t=simulate(h,h.tee,random()*360-180,random()*100,false);assert(Number.isFinite(t.ball.x)&&Number.isFinite(t.ball.y));assert(t.ball.x>=31.9&&t.ball.x<=328.1&&t.ball.y>=31.9&&t.ball.y<=408.1,JSON.stringify({i,t}));assert(t.points.length<600);assert(new Set(t.gems).size===t.gems.length);}
let s=newGame('couch',[{id:'A',name:'Same'},{id:'B',name:'Same'}],3),now=10000;
assert.equal(shoot(s,'B',0,40,now),null);assert.equal(shoot(s,'A',NaN,40,now),null);assert.equal(shoot(s,'A',0,1000,now),null);
for(let hole=0;hole<3;hole++){let guard=0;while(s.phase==='play'&&guard++<20){const r=shoot(s,s.players[s.turn].id,90,1,now);assert(r);s=r.state;assert.equal(shoot(s,s.players[s.turn].id,90,1,now),null);now+=10000;}assert.equal(s.players[0].score[hole],8);assert.equal(s.players[1].score[hole],8);s=nextHole(s);}
assert.equal(s.phase,'end');assert.equal(total(s.players[0]),24);console.log('PASS1800 deterministic boundary shots,turn authority,nonfinite/repeated inputs,3hole2player cap+scoring,completion');
// Search legitimate playable paths: beam search through safe states, heuristic distances include portals.
const paths=[];
for(const [index,h] of HOLES.entries()){
 const waypoints=[h.cup,...h.gems,...(h.portals||[]),...h.walls.flatMap(r=>[{x:r.x-17,y:r.y-17},{x:r.x+r.w+17,y:r.y-17},{x:r.x-17,y:r.y+r.h+17},{x:r.x+r.w+17,y:r.y+r.h+17}])].filter(p=>p.x>=32&&p.x<=328&&p.y>=32&&p.y<=408);
 // A small walkable-grid potential field keeps the beam from only hugging walls nearest the cup.
 const step=10,dist=new Map(),queue=[];const key=(x,y)=>x+','+y;
 const clear=(x,y)=>x>=32&&x<=328&&y>=32&&y<=408&&!h.walls.some(r=>x>r.x-9&&x<r.x+r.w+9&&y>r.y-9&&y<r.y+r.h+9)&&!h.water.some(r=>x>r.x-3&&x<r.x+r.w+3&&y>r.y-3&&y<r.y+r.h+3);
 const push=(x,y,d)=>{const k=key(x,y);if(!clear(x,y)||(dist.has(k)&&dist.get(k)<=d))return;dist.set(k,d);queue.push({x,y,d});};
 push(Math.round(h.cup.x/step)*step,Math.round(h.cup.y/step)*step,0);
 while(queue.length){queue.sort((a,b)=>b.d-a.d);const v=queue.pop();if(v.d!==dist.get(key(v.x,v.y)))continue;for(const [dx,dy] of [[10,0],[-10,0],[0,10],[0,-10],[10,10],[10,-10],[-10,10],[-10,-10]])push(v.x+dx,v.y+dy,v.d+Math.hypot(dx,dy));if(h.portals)for(let i=0;i<2;i++)if(Math.hypot(v.x-h.portals[i].x,v.y-h.portals[i].y)<20)push(Math.round(h.portals[1-i].x/step)*step,Math.round(h.portals[1-i].y/step)*step,v.d+10);}
 const heuristic=p=>dist.get(key(Math.round(p.x/step)*step,Math.round(p.y/step)*step))??1000+Math.hypot(p.x-h.cup.x,p.y-h.cup.y);
 let beam=[{p:h.tee,path:[],cost:0}],winner=null;
 for(let depth=0;depth<7&&!winner;depth++){
  const next=[],seen=new Set();
  for(const node of beam){let angles=[];for(let a=-180;a<180;a+=20)angles.push(a);for(const p of waypoints){const a=Math.atan2(p.y-node.p.y,p.x-node.p.x)*180/Math.PI;angles.push(a,a-3,a+3);}
   for(const a of angles){for(let power=5;power<=100;power+=5){const t=simulate(h,node.p,Math.round(a),power,false,[],depth%2===0);if(t.water)continue;const path=[...node.path,{angle:Math.round(a),power}];if(t.sunk){winner=path;break;}const k=Math.round(t.ball.x/8)+','+Math.round(t.ball.y/8);if(seen.has(k))continue;seen.add(k);next.push({p:t.ball,path,cost:heuristic(t.ball)+random()*9});}if(winner)break;}if(winner)break;
  }
  next.sort((a,b)=>a.cost-b.cost);beam=next.slice(0,24);
 }
 paths.push(winner);console.log('Hole',index+1,winner?.length||'NO PATH',winner);
}
fs.writeFileSync('/tmp/golf-solved-paths.json',JSON.stringify(paths));assert(paths.every(Boolean));
