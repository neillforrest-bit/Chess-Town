export type Vec={x:number;y:number};
export type Rect={x:number;y:number;w:number;h:number};
export type Slope=Rect&{dx:number;dy:number};
export type Rail={a:Vec;b:Vec};
export type Hole={name:string;subtitle:string;par:number;biome:number;tee:Vec;cup:Vec;walls:Rect[];slopes?:Slope[];pirates?:Vec[];rails?:Rail[];water:Rect[];sand:Rect[];bumpers:Vec[];portals?:[Vec,Vec];gems:Vec[];tip:string};
const RAW:Hole[]=[
 {name:'Harbour Roll',subtitle:'The seaside course opens',par:2,biome:0,tee:{x:180,y:365},cup:{x:180,y:88},walls:[],water:[],sand:[],bumpers:[{x:95,y:220},{x:265,y:220}],gems:[{x:180,y:240}],tip:'Tap the green to aim. The striped bank slopes gently towards the flag.'},
 {name:'Dogleg at Dead Man’s Dock',subtitle:'A bank shot beats a straight line',par:3,biome:0,tee:{x:80,y:365},cup:{x:280,y:90},walls:[{x:135,y:160,w:28,h:230}],water:[],sand:[{x:220,y:200,w:95,h:65}],bumpers:[],gems:[{x:80,y:100},{x:260,y:275}],tip:'A dock blocks the direct route. Aim for the gap or bank round the far end.'},
 {name:'Pop-up Pirate Alley',subtitle:'The buccaneers have other ideas',par:3,biome:0,tee:{x:180,y:370},cup:{x:180,y:75},walls:[],water:[{x:25,y:180,w:70,h:95},{x:265,y:180,w:70,h:95}],sand:[],bumpers:[{x:145,y:260},{x:215,y:200},{x:145,y:140}],gems:[{x:235,y:310},{x:230,y:115}],tip:'The pirates pop up on odd-numbered putts. Plan a bank around them, or use their bounce.'},
 {name:'Smuggler’s Shortcut',subtitle:'Look beneath the skull rock',par:3,biome:1,tee:{x:80,y:365},cup:{x:280,y:85},walls:[],water:[{x:25,y:195,w:310,h:65}],sand:[],bumpers:[],portals:[{x:85,y:300},{x:275,y:145}],gems:[{x:85,y:300},{x:275,y:145}],tip:'A tunnel hides beneath each skull rock. Roll into the dark mouth to cross the pond.'},
 {name:'The Tilted Quarterdeck',subtitle:'Port, starboard, then mind the rail',par:3,biome:1,tee:{x:70,y:365},cup:{x:290,y:80},walls:[{x:100,y:280,w:150,h:25},{x:100,y:165,w:150,h:25}],water:[],sand:[{x:25,y:200,w:70,h:70}],bumpers:[{x:280,y:230}],gems:[{x:290,y:320},{x:65,y:130}],tip:'The quarterdeck tilts towards starboard. Use the diagonal timber for a cheeky ricochet.'},
 {name:'Cannonball Ricochet',subtitle:'Wooden angles. Real consequences.',par:4,biome:1,tee:{x:180,y:375},cup:{x:180,y:65},walls:[{x:25,y:280,w:220,h:22},{x:115,y:160,w:220,h:22}],water:[],sand:[],bumpers:[{x:285,y:230},{x:75,y:110}],gems:[{x:285,y:320},{x:65,y:220},{x:180,y:105}],tip:'Thread the right gap, then left. The arrows show two opposing slopes.'},
 {name:'Cutlass Lagoon',subtitle:'A pond with a very tempting bank',par:3,biome:2,tee:{x:80,y:365},cup:{x:280,y:80},walls:[{x:145,y:220,w:70,h:26}],water:[{x:150,y:300,w:65,h:90},{x:25,y:90,w:100,h:65}],sand:[{x:240,y:180,w:90,h:70}],bumpers:[{x:280,y:300},{x:80,y:220}],gems:[{x:280,y:345},{x:180,y:120}],tip:'Aim around the lagoon. Even a pirate can choose the safe route.'},
 {name:'The Hidden Hold',subtitle:'Not every way in is a way out',par:3,biome:2,tee:{x:180,y:375},cup:{x:180,y:70},walls:[{x:80,y:115,w:200,h:24},{x:80,y:115,w:24,h:110},{x:256,y:115,w:24,h:110}],water:[],sand:[],bumpers:[{x:130,y:295},{x:230,y:295}],portals:[{x:180,y:230},{x:180,y:175}],gems:[{x:180,y:230},{x:50,y:85}],tip:'The skull cave takes you into the hold. Escape round either end of the timber to the flag.'},
 {name:'The Captain’s Last Coin',subtitle:'One more hole before home.',par:4,biome:2,tee:{x:180,y:380},cup:{x:180,y:65},walls:[{x:75,y:225,w:210,h:22}],water:[{x:25,y:135,w:90,h:55},{x:245,y:135,w:90,h:55}],sand:[{x:120,y:290,w:120,h:45}],bumpers:[{x:180,y:165}],gems:[{x:45,y:265},{x:315,y:265},{x:180,y:110}],tip:'One last sloping bank around the dock. A soft final putt is worth more than heroics.'},
];
RAW[0].slopes=[{x:105,y:155,w:150,h:110,dx:0,dy:-.025}];
RAW[1].slopes=[{x:32,y:70,w:95,h:170,dx:0,dy:-.03}];
RAW[2].bumpers=[];RAW[2].pirates=[{x:140,y:255},{x:220,y:190},{x:145,y:120}];RAW[2].slopes=[{x:95,y:280,w:170,h:55,dx:.028,dy:0}];
RAW[3].slopes=[{x:220,y:50,w:105,h:115,dx:0,dy:-.018}];
RAW[4].walls=[{x:100,y:280,w:150,h:25}];RAW[4].rails=[{a:{x:110,y:165},b:{x:255,y:220}}];RAW[4].slopes=[{x:32,y:145,w:296,h:110,dx:.027,dy:0}];
RAW[5].slopes=[{x:250,y:200,w:75,h:145,dx:0,dy:-.032},{x:35,y:95,w:70,h:170,dx:0,dy:.026}];
RAW[6].rails=[{a:{x:215,y:145},b:{x:310,y:110}}];RAW[6].slopes=[{x:32,y:240,w:95,h:105,dx:0,dy:-.024}];RAW[6].pirates=[{x:270,y:255}];
RAW[7].slopes=[{x:110,y:260,w:140,h:65,dx:0,dy:-.03}];
RAW[8].slopes=[{x:32,y:250,w:85,h:140,dx:0,dy:-.035},{x:245,y:250,w:80,h:140,dx:0,dy:-.035}];RAW[8].pirates=[{x:180,y:165}];RAW[8].bumpers=[];
const flip=(p:Vec):Vec=>({x:p.x,y:440-p.y});
const flipRect=(r:Rect):Rect=>({...r,y:440-r.y-r.h});
export const HOLES:Hole[]=RAW.map((h,i)=>i%2===0?h:{...h,tee:flip(h.tee),cup:flip(h.cup),walls:h.walls.map(flipRect),water:h.water.map(flipRect),sand:h.sand.map(flipRect),bumpers:h.bumpers.map(flip),gems:h.gems.map(flip),portals:h.portals?[flip(h.portals[0]),flip(h.portals[1])]:undefined,pirates:h.pirates?.map(flip),rails:h.rails?.map(r=>({a:flip(r.a),b:flip(r.b)})),slopes:h.slopes?.map(r=>({...r,y:440-r.y-r.h,dy:-r.dy}))});
export type Player={id:string;name:string;color:string;score:number[];ball:Vec;strokes:number;done:boolean;gems:number[]};
export type Game={version:1;rev:number;mode:'quest'|'couch'|'online';phase:'lobby'|'play'|'between'|'end';hole:number;length:number;turn:number;players:Player[];xp:number;upgrade:'guide'|'boots'|'charm'|'';story:number;note:string;lastShotAt:number;lockedUntil:number;treasure:number;bankShots:number;pars:number};
export type Trace={points:Vec[];gems:number[];water:boolean;sunk:boolean;portals:number;wallHits:number;ball:Vec};
export const COLORS=['#ffe59b','#89ecff','#eeabff','#ffb99e'];
export function newGame(mode:Game['mode'],players:{id:string;name:string}[],length=9):Game{return {version:1,rev:0,mode,phase:mode==='online'?'lobby':'play',hole:0,length,turn:0,players:players.map((p,i)=>({...p,name:p.name.trim().slice(0,22)||`Player ${i+1}`,color:COLORS[i%4],score:[],ball:{...HOLES[0].tee},strokes:0,done:false,gems:[]})),xp:0,upgrade:'',story:0,note:'Welcome to Captain’s Cove. One more hole before home.',lastShotAt:0,lockedUntil:0,treasure:0,bankShots:0,pars:0};}
export function simulate(hole:Hole,start:Vec,angle:number,power:number,boots=false,oldGems:number[]=[],pirateUp=true):Trace{
 let {x,y}=start;const speed=Math.max(0.3,Math.min(100,power))/100*11.5;let vx=Math.cos(angle*Math.PI/180)*speed,vy=Math.sin(angle*Math.PI/180)*speed;
 const points:Vec[]=[{x,y}],gems=[...oldGems];let water=false,sunk=false,portals=0,wallHits=0,cooldown=0;
 for(let frame=0;frame<1600;frame++){
  const prev={x,y};x+=vx*.5;y+=vy*.5;
  for(const [axis,lo,hi] of [['x',32,328],['y',32,408]] as const){if(axis==='x'){if(x<lo){x=lo+(lo-x);vx=Math.abs(vx)*.82;wallHits++;}if(x>hi){x=hi-(x-hi);vx=-Math.abs(vx)*.82;wallHits++;}}else {if(y<lo){y=lo+(lo-y);vy=Math.abs(vy)*.82;wallHits++;}if(y>hi){y=hi-(y-hi);vy=-Math.abs(vy)*.82;wallHits++;}}}
  for(const r of hole.walls){const nx=Math.max(r.x,Math.min(x,r.x+r.w)),ny=Math.max(r.y,Math.min(y,r.y+r.h));let dx=x-nx,dy=y-ny,d=Math.hypot(dx,dy);if(d<7){if(d<.001){x=prev.x;y=prev.y;vx=-vx*.82;vy=-vy*.82;}else{dx/=d;dy/=d;x=nx+dx*7.1;y=ny+dy*7.1;const dot=vx*dx+vy*dy;if(dot<0){vx-=1.82*dot*dx;vy-=1.82*dot*dy;}}wallHits++;}}
  for(const r of hole.rails||[]){const dx=r.b.x-r.a.x,dy=r.b.y-r.a.y,len=dx*dx+dy*dy;const t=Math.max(0,Math.min(1,((x-r.a.x)*dx+(y-r.a.y)*dy)/len)),nx=r.a.x+t*dx,ny=r.a.y+t*dy;let ax=x-nx,ay=y-ny,d=Math.hypot(ax,ay);if(d<11){if(d<.001){ax=-dy/Math.sqrt(len);ay=dx/Math.sqrt(len);d=1;}else{ax/=d;ay/=d;}x=nx+ax*11.2;y=ny+ay*11.2;const dot=vx*ax+vy*ay;if(dot<0){vx-=1.82*dot*ax;vy-=1.82*dot*ay;}wallHits++;}}
  for(const b of [...hole.bumpers,...(pirateUp?hole.pirates||[]:[])]){let dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy);if(d<23){if(d<.001){dx=0;dy=1;d=1;}dx/=d;dy/=d;x=b.x+dx*23.2;y=b.y+dy*23.2;const dot=vx*dx+vy*dy;if(dot<0){vx-=2.05*dot*dx;vy-=2.05*dot*dy;}wallHits++;}}
  for(let i=0;i<hole.gems.length;i++)if(!gems.includes(i)&&Math.hypot(x-hole.gems[i].x,y-hole.gems[i].y)<16)gems.push(i);
  if(cooldown>0)cooldown--;if(hole.portals&&cooldown===0){for(let i=0;i<2;i++)if(Math.hypot(x-hole.portals[i].x,y-hole.portals[i].y)<15){const to=hole.portals[1-i];x=to.x;y=to.y;portals++;cooldown=50;points.push({x,y});break;}}
  if(hole.water.some(r=>x>r.x+3&&x<r.x+r.w-3&&y>r.y+3&&y<r.y+r.h-3)){water=true;points.push({x,y});x=start.x;y=start.y;break;}
  if(Math.hypot(x-hole.cup.x,y-hole.cup.y)<11&&Math.hypot(vx,vy)<5.3){sunk=true;x=hole.cup.x;y=hole.cup.y;points.push({x,y});break;}
  for(const slope of hole.slopes||[])if(x>slope.x&&x<slope.x+slope.w&&y>slope.y&&y<slope.y+slope.h){vx+=slope.dx*.5;vy+=slope.dy*.5;}
  const inSand=hole.sand.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h);const friction=inSand&&!boots?.955:.9915;vx*=friction;vy*=friction;
  if(frame%3===0)points.push({x,y});if(Math.hypot(vx,vy)<.12)break;
 }
 points.push({x,y});return {points,gems,water,sunk,portals,wallHits,ball:{x,y}};
}
export function shoot(s:Game,actor:string,angle:number,power:number,now:number):{state:Game;trace:Trace}|null{
 if(s.phase!=='play'||s.players[s.turn]?.id!==actor||now<s.lockedUntil||!Number.isFinite(angle)||!Number.isFinite(power)||power<1||power>100)return null;
 const n=structuredClone(s),p=n.players[n.turn],h=HOLES[n.hole];const trace=simulate(h,p.ball,angle,power,n.mode==='quest'&&n.upgrade==='boots',p.gems,p.strokes%2===0);const gained=trace.gems.length-p.gems.length;p.gems=trace.gems;p.ball=trace.ball;p.strokes=Math.min(8,p.strokes+(trace.water?2:1));
 n.treasure+=gained;if(trace.wallHits>0)n.bankShots++;if(n.mode==='quest')n.xp+=gained*(n.upgrade==='charm'?30:20);
 let line=trace.water?'Splash! +1 penalty. Back to your last safe lie.':trace.portals?'Straight through the smuggler’s tunnel.':trace.wallHits>0?'Off the timber! A proper seaside bank shot.':'A lovely little roll.';
 if(trace.sunk||p.strokes>=8){p.done=true;p.score.push(p.strokes);if(trace.sunk&&p.strokes<=h.par)n.pars++;if(n.mode==='quest')n.xp+=trace.sunk?Math.max(20,80+(h.par-p.strokes)*20):10;line=trace.sunk?(p.strokes===1?'HOLE IN ONE! Ring the harbour bell.':p.strokes<h.par?'BIRDIE! A putt fit for a pirate captain.':p.strokes===h.par?'PAR! A proper bit of seamanship.':'In the cup! Onwards, shipmate.'):'Eight strokes. The harbour master lends a hand (8).';}
 if(n.players.every(x=>x.done)){n.phase=n.hole+1===n.length?'end':'between';if(n.phase==='end')line=n.mode==='quest'?'Nine holes, a pocket of coins, and a story to take home.':'Round complete. Settle the friendly bragging rights.';}else{for(let i=1;i<=n.players.length;i++){const next=(n.turn+i)%n.players.length;if(!n.players[next].done){n.turn=next;break;}}}
 n.rev++;n.note=line;n.lastShotAt=now;n.lockedUntil=now+Math.min(4200,Math.max(700,trace.points.length*16));return {state:n,trace};
}
export function nextHole(s:Game):Game{if(s.phase!=='between')return s;const n=structuredClone(s);n.hole++;n.turn=0;n.phase='play';n.rev++;n.note=HOLES[n.hole].tip;n.lockedUntil=0;n.players=n.players.map(p=>({...p,ball:{...HOLES[n.hole].tee},strokes:0,done:false,gems:[]}));return n;}
export function total(p:Player){return p.score.reduce((a,b)=>a+b,0);}
