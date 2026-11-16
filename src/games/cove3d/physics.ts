export type V={x:number;z:number};
export const TEE:V={x:0,z:12.5};export const CUP:V={x:-.5,z:-12.3};
export const center=(z:number)=>1.0*Math.sin((z+2)*.2);
export function height(x:number,z:number){return .65+.46*Math.sin((z+3)*.28)+.38*Math.exp(-((z-4)**2)/13)*Math.sin(x*.65)+.20*Math.sin(x*.7+z*.14)+.012*(12-z);}
export function gradient(x:number,z:number){const d=.015;return {x:(height(x+d,z)-height(x-d,z))/(2*d),z:(height(x,z+d)-height(x,z-d))/(2*d)};}
export const ROCKS=[{x:1.5,z:5,r:.7},{x:-1.6,z:-3.7,r:.65},{x:2.1,z:-10.3,r:.55}];
export const POND={x:1.8,z:-6.4,r:1.18};export const ENTRY={x:-1.75,z:1.4},EXIT={x:.1,z:-4.4};
export type Shot={points:{x:number;y:number;z:number;warp?:boolean}[];end:V;sunk:boolean;water:boolean;tunnel:boolean;hits:number;seconds:number};
export function roll(start:V,angle:number,power:number,challenge:{cupRadius:number;captureSpeed:number}={cupRadius:.28,captureSpeed:3}):Shot|null{
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
