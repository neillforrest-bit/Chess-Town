export type V={x:number;z:number};
export type Shot={points:{x:number;y:number;z:number;warp?:boolean}[];end:V;sunk:boolean;water:boolean;tunnel:boolean;hits:number;seconds:number};
export const JOURNEY=[
 {name:"Smuggler's Ridge",par:4,tag:'SUN-WARMED TIMBER',story:'The first pirate on the jetty. The secret shortcut you remember all year.',tip:'The skull tunnel is worth a curious angle. Let the bank do some work.',sky:['#6faec4','#c9d5ca','#f6d1a0'],water:'#278f9f',grass:'#668c54',theme:'harbour'},
 {name:'Lantern Lagoon',par:4,tag:'AFTER THE LAST ICE CREAM',story:'Lanterns come on across the water. Nobody is quite ready to go home.',tip:'A wide lagoon guards the right bank. Work left, then read the double ridge.',sky:['#27294e','#876782','#f1b68a'],water:'#395b89',grass:'#517f73',theme:'lantern'},
 {name:'Treasure at Sundown',par:5,tag:'ONE MORE GO. TOGETHER.',story:'A golden fort, a hidden chest, and the kind of finish you tell stories about.',tip:'Three rocky sentries and a late dip. Pace matters more than power.',sky:['#b27e85','#edbe9a','#ffe0a2'],water:'#467f87',grass:'#7b9256',theme:'fort'}
] as const;
export function createCourse(index=0){
 const level=Math.max(0,Math.min(2,index)),info=JOURNEY[level];
 const TEE:V={x:level===1?.6:level===2?-.6:0,z:12.5},CUP:V={x:level===1?1:level===2?-1.15:-.5,z:-12.3};
 const center=(z:number)=>level===0?Math.sin((z+2)*.2):level===1?.8*Math.sin((z-2)*.25):1.15*Math.sin((z+6)*.18);
 const height=(x:number,z:number)=>level===0?.65+.46*Math.sin((z+3)*.28)+.38*Math.exp(-((z-4)**2)/13)*Math.sin(x*.65)+.20*Math.sin(x*.7+z*.14)+.012*(12-z):level===1?.73+.34*Math.sin(z*.39)+.23*Math.sin(x*.7-z*.15)+.17*Math.exp(-((z+5)**2)/12)+.012*(12-z):.79+.43*Math.sin((z+1)*.32)+.30*Math.sin(x*.7+z*.17)+.23*Math.exp(-((z-7)**2)/9)+.01*(12-z);
 const gradient=(x:number,z:number)=>{const d=.015;return{x:(height(x+d,z)-height(x-d,z))/(2*d),z:(height(x,z+d)-height(x,z-d))/(2*d)}};
 const ROCKS=level===0?[{x:1.5,z:5,r:.7},{x:-1.6,z:-3.7,r:.65},{x:2.1,z:-10.3,r:.55}]:level===1?[{x:-1.8,z:6,r:.62},{x:1.4,z:-2.7,r:.7},{x:-1.5,z:-10,r:.7}]:[{x:1.2,z:7,r:.9},{x:-1.6,z:1,r:.8},{x:.8,z:-8.5,r:.8}];
 const POND=level===0?{x:1.8,z:-6.4,r:1.18}:level===1?{x:1.8,z:1.5,r:1.55}:{x:-1.8,z:-5,r:1.05};
 const ENTRY=level===0?{x:-1.75,z:1.4}:level===1?{x:-1.7,z:3.5}:{x:1.8,z:2},EXIT=level===0?{x:.1,z:-4.4}:level===1?{x:-.8,z:-5.8}:{x:0,z:-6.5};
type Shot={points:{x:number;y:number;z:number;warp?:boolean}[];end:V;sunk:boolean;water:boolean;tunnel:boolean;hits:number;seconds:number};
function roll(start:V,angle:number,power:number,challenge:{cupRadius:number;captureSpeed:number}={cupRadius:.28,captureSpeed:3}):Shot|null{
 if(!Number.isFinite(angle)||!Number.isFinite(power)||power<1||power>100||!Number.isFinite(start.x)||!Number.isFinite(start.z))return null;
 let x=start.x,z=start.z,vx=Math.sin(angle*Math.PI/180)*(1+power*.145),vz=-Math.cos(angle*Math.PI/180)*(1+power*.145),sunk=false,water=false,tunnel=false,hits=0,still=0,cooldown=0;
 const dt=1/120,points:Shot['points']=[{x,y:height(x,z)+.13,z}];let step=0;
 for(;step<2400;step++){
  const g=gradient(x,z),norm=1+g.x*g.x+g.z*g.z,speed=Math.hypot(vx,vz),slope=Math.hypot(g.x,g.z);
  if(speed<.07&&slope<.095){still++;if(still>15)break;vx=0;vz=0;}else{still=0;const friction=.64;vx+=(-9.81*g.x/norm-(speed>.02?friction*vx/speed:0)-vx*.12)*dt;vz+=(-9.81*g.z/norm-(speed>.02?friction*vz/speed:0)-vz*.12)*dt;}
  x+=vx*dt;z+=vz*dt;
  const left=center(z)-3.05,right=center(z)+3.05;
  if(x<left){x=left;vx=Math.abs(vx)*.68;hits++;}if(x>right){x=right;vx=-Math.abs(vx)*.68;hits++;}
  if(z>14){z=14;vz=-Math.abs(vz)*.68;hits++;}if(z< -14){z=-14;vz=Math.abs(vz)*.68;hits++;}
  for(const r of ROCKS){let dx=x-r.x,dz=z-r.z,d=Math.hypot(dx,dz);if(d<r.r+.13){dx/=d||1;dz/=d||1;x=r.x+dx*(r.r+.135);z=r.z+dz*(r.r+.135);const dot=vx*dx+vz*dz;if(dot<0){vx-=1.75*dot*dx;vz-=1.75*dot*dz;}hits++;}}
  if(cooldown)cooldown--;if(!cooldown&&Math.hypot(x-ENTRY.x,z-ENTRY.z)<.4){points.push({x,y:height(x,z)+.13,z});x=EXIT.x;z=EXIT.z;points.push({x,y:height(x,z)+.13,z,warp:true});tunnel=true;cooldown=400;vx*=.55;vz=-Math.max(1,Math.abs(vz)*.6);}
  if(Math.hypot(x-POND.x,z-POND.z)<POND.r-.08){water=true;points.push({x,y:.25,z});x=start.x;z=start.z;break;}
  if(Math.hypot(x-CUP.x,z-CUP.z)<challenge.cupRadius&&Math.hypot(vx,vz)<challenge.captureSpeed){sunk=true;x=CUP.x;z=CUP.z;points.push({x,y:height(x,z)-.08,z});break;}
  if(step%4===0)points.push({x,y:height(x,z)+.13,z});
 }
 points.push({x,y:height(x,z)+.13,z});return {points,end:{x,z},sunk,water,tunnel,hits,seconds:step*dt};
}

return {level,info,TEE,CUP,center,height,gradient,ROCKS,POND,ENTRY,EXIT,roll};
}
export type Course=ReturnType<typeof createCourse>;
export const {TEE,CUP,center,height,gradient,ROCKS,POND,ENTRY,EXIT,roll}=createCourse(0);
