'use client';
import{useEffect,useRef,useState}from'react';
import{GENRE_SPIN_MS}from'@/lib/movie-tournament';
import s from'./MovieTournament.module.css';
const COL=['#804dc3','#44207a','#9466ca','#52209b'];
/** The Ticket Cup genre wheel: numbered segments, one long dramatic spin.
  * The server owns the landed index; every phone animates to the same target.
  * The wheel only ever shows genres still in play - passed or kept genres are pruned. */
export default function GenreWheel({opts,idx,at,n,now}:{opts:string[];idx:number|null;at:number;n:number;now:number}){
 const N=Math.max(opts.length,1),seg=360/N,C=150,R=140;
 const[rot,setRot]=useState(0),lastN=useRef(-1);
 const spinning=idx!==null&&now<at+GENRE_SPIN_MS;
 useEffect(()=>{setRot(0);lastN.current=-1},[N]); // wheel was pruned: reset instantly (no spin active then)
 useEffect(()=>{if(idx===null||n===lastN.current)return;lastN.current=n;const target=-((idx+0.5)*seg);setRot(r=>r+360*6+((((target-r)%360)+360)%360));try{navigator.vibrate?.([25,70,25,70,25])}catch{}},[n,idx,seg]);
 useEffect(()=>{if(!spinning)return;const tick=()=>{try{navigator.vibrate?.(6)}catch{}};const id=setInterval(tick,130);return()=>clearInterval(id)},[spinning]);
 const pts=(i:number)=>{const a0=((i*seg-90)*Math.PI)/180,a1=(((i+1)*seg-90)*Math.PI)/180;return `M${C},${C} L${C+R*Math.cos(a0)},${C+R*Math.sin(a0)} A${R},${R} 0 0 1 ${C+R*Math.cos(a1)},${C+R*Math.sin(a1)} Z`;};
 return <div className={s.gwheelWrap}><span className={spinning?s.gwheelPtrSpin:s.gwheelPtr}>▼</span>
 <svg viewBox='0 0 300 300' className={s.gwheelSvg} style={{transform:`rotate(${rot}deg)`,transition:spinning?`transform ${Math.max(500,at+GENRE_SPIN_MS-now)}ms cubic-bezier(.12,.7,.08,1)`:'none'}}>
 <circle cx={C} cy={C} r={R+6} fill='#2d0f55' stroke='#c9a6ff' strokeWidth='5'/>
 {opts.map((g,i)=><g key={g}><path d={pts(i)} fill={COL[i%4]} stroke='#2d0f55' strokeWidth='1.5'/><g transform={`rotate(${(i+0.5)*seg} ${C} ${C})`}><text x={C} y={C-R+28} textAnchor='middle' fontSize={N>12?14:20} fontWeight='800' fill='#fff3c7'>{i+1}</text></g></g>)}
 </svg><span className={s.gwheelHub}>SPIN</span></div>
}