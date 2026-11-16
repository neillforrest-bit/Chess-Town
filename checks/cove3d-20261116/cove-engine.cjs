const fs=require('fs'),ts=require(require('path').join(process.cwd(),'node_modules/typescript'));fs.writeFileSync('/tmp/cove-physics.cjs',ts.transpileModule(fs.readFileSync(require('path').join(process.cwd(),'src/games/cove3d/physics.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText);
const {roll,height,gradient,TEE,CUP,center}=require('/tmp/cove-physics.cjs'),assert=require('assert');
console.log('terrain heights',[-12,-8,-4,0,4,8,12].map(z=>[z,height(0,z)]));
for(let a=-180;a<180;a+=15)for(let p=1;p<=100;p+=9){const t=roll(TEE,a,p);assert(t.points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z)));assert(Math.abs(t.end.z)<=14.01);assert(Math.abs(t.end.x-center(t.end.z))<=3.06);}
assert.equal(roll(TEE,NaN,50),null);assert.equal(roll(TEE,0,200),null);
let beam=[{p:TEE,path:[],cost:0}],won;
for(let depth=0;depth<7&&!won;depth++){
 let next=[],seen=new Set();for(const b of beam){const desired=Math.atan2(CUP.x-b.p.x,-(CUP.z-b.p.z))*180/Math.PI;const angles=[...Array.from({length:36},(_,i)=>i*10-180),desired,desired+3,desired-3];for(const a of angles){for(let p=4;p<=100;p+=4){const t=roll(b.p,a,p);if(t.water)continue;const path=[...b.path,{angle:Math.round(a),power:p}];if(t.sunk){won=path;break;}const k=Math.round(t.end.x*3)+','+Math.round(t.end.z*3);if(seen.has(k))continue;seen.add(k);next.push({p:t.end,path,cost:Math.hypot(t.end.x-CUP.x,t.end.z-CUP.z)+(t.end.z>8?2:0)});}if(won)break;}if(won)break;}
 next.sort((a,b)=>a.cost-b.cost);beam=next.slice(0,24);console.log('beam',depth,beam[0]?.cost);
}
console.log('PATH',won);assert(won);fs.writeFileSync('/tmp/cove-solution.json',JSON.stringify(won));let p=TEE;for(const s of won){const t=roll(p,s.angle,s.power);console.log('shot',s,'end',t.end,'tunnel',t.tunnel,'sunk',t.sunk,'time',t.seconds);p=t.end;}
