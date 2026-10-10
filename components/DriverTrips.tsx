"use client";
import {useEffect,useRef,useState} from "react";
import {motion,AnimatePresence} from "framer-motion";
import {TRIVIA} from "../lib/data";
const P="#ff2bd6",G="#34d399",Y="#facc15";
const REQ=[
{rider:"Testa",from:"Covent Garden",to:"Heathrow T5",mi:14.2,fare:44,min:38,saved:9,trivia:true,step:false,tip:5},
{rider:"Testb",from:"King's Cross",to:"Soho Square",mi:2.1,fare:11.2,min:14,saved:4,trivia:false,step:true,tip:0},
{rider:"Testa",from:"Shoreditch",to:"Canary Wharf",mi:5.4,fare:21,min:22,saved:6,trivia:true,step:false,tip:2}];
type Ph="idle"|"offer"|"pickup"|"arrived"|"trip"|"done";
export default function DriverTrips({on,setOn,addEarn,addXp,streak}:{on:boolean;setOn:(b:boolean)=>void;addEarn:(n:number)=>void;addXp:(n:number)=>void;streak:number}){
 const [ph,setPh]=useState<Ph>("idle");const [n,setN]=useState(0);const [cd,setCd]=useState(15);const [pg,setPg]=useState(0);const [ok,setOk]=useState(0);const [qn,setQn]=useState(0);const [last,setLast]=useState("");const [cheer,setCheer]=useState(0);const [bonus,setBonus]=useState<string[]>([]);const [free,setFree]=useState(false);const [log,setLog]=useState({trips:0,xp:0,money:0});
 const r=REQ[n%REQ.length];const t0=useRef(0);const okR=useRef(0);
 const vib=(p:number|number[])=>{try{navigator.vibrate?.(p)}catch{}};
 // idle -> offer
 useEffect(()=>{if(on&&ph==="idle"){const t=setTimeout(()=>{setPh("offer");setCd(15);t0.current=Date.now();vib([40,60,40,60,120])},2200);return()=>clearTimeout(t)}},[on,ph]);
 // countdown
 useEffect(()=>{if(ph!=="offer")return;const i=setInterval(()=>{const c=15-Math.floor((Date.now()-t0.current)/1000);setCd(c);if(c<=0){setPh("idle");setN(x=>x+1)}},250);return()=>clearInterval(i)},[ph]);
 // pickup drive
 useEffect(()=>{if(ph!=="pickup")return;setPg(0);const s=Date.now();const i=setInterval(()=>{const p=Math.min(1,(Date.now()-s)/6000);setPg(p);if(p>=1){clearInterval(i);setPh("arrived");vib([60,40,60])}},100);return()=>clearInterval(i)},[ph]);
 // trip
 useEffect(()=>{if(ph!=="trip")return;setPg(0);setOk(0);okR.current=0;setQn(0);setLast("");setBonus([]);setFree(false);const s=Date.now();let q=0;
  const i=setInterval(()=>{const p=Math.min(1,(Date.now()-s)/30000);setPg(p);if(p>=1){clearInterval(i);clearInterval(qi);finish()}},100);
  const qi=setInterval(()=>{if(!r.trivia)return;const x=TRIVIA[q%TRIVIA.length];const right=Math.random()<.82;q++;setQn(q);if(right){okR.current+=1;setOk(okR.current);addXp(2);vib(15);setLast(`✔ Rider got "${x.q.slice(0,42)}..." right`);if(okR.current===8){setFree(true);setBonus(b=>[...b,"🎁 Free next trip earned: +£3 Trivia Host bonus"]);vib([40,40,40,40,200])}}else setLast(`✘ Missed: answer was ${x.o[x.a]}`)},2200);
  return()=>{clearInterval(i);clearInterval(qi)}},[ph]);
 const finish=()=>{const quick=0;const money=r.fare+r.tip+(okR.current>=8?3:0);const xp=40+r.saved*3+okR.current*2+(r.step?20:0);addEarn(money);addXp(xp);setLog(l=>({trips:l.trips+1,xp:l.xp+xp,money:l.money+money}));setPh("done");vib([30,30,200])};
 const accept=()=>{const quick=Date.now()-t0.current<5000;if(quick){addXp(10);setBonus(["⚡ Quick Draw +10 XP"])}else setBonus([]);vib(40);setPh("pickup")};
 const next=()=>{setN(x=>x+1);setPh("idle")};
 const Chip=({c,children}:any)=><span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{background:c+"22",color:c,border:`1px solid ${c}66`}}>{children}</span>;
 return <div className="space-y-3">
  <div className="flex items-center justify-between text-[11px] text-neutral-400"><span>Session: {log.trips} trips · £{log.money.toFixed(0)} · {log.xp} XP</span><span>🔥 {streak} day streak</span></div>
  {!on&&<div className="rounded-3xl p-6 text-center" style={{background:"linear-gradient(135deg,#1a0a18,#0b0d12)",border:`1px solid ${P}55`}}><div className="text-5xl">📡</div><div className="font-black text-xl mt-2">Ready to roll?</div><div className="text-xs text-neutral-400 mb-3">Go online to start receiving trip requests</div><button onClick={()=>setOn(true)} className="rounded-full px-8 py-3 font-black text-black" style={{background:G,boxShadow:`0 0 24px ${G}88`}}>GO ONLINE</button></div>}
  {on&&ph==="idle"&&<div className="rounded-3xl p-6 text-center relative overflow-hidden" style={{background:"#0b0d12",border:`1px solid ${G}44`}}><div className="relative mx-auto w-36 h-36">{[0,1,2].map(i=><motion.div key={i} className="absolute inset-0 rounded-full border-2" style={{borderColor:G}} animate={{scale:[.3,1.4],opacity:[.8,0]}} transition={{duration:2.4,repeat:Infinity,delay:i*.8}}/>)}<div className="absolute inset-0 flex items-center justify-center text-4xl">🚖</div></div><div className="font-black mt-2">Scanning for riders...</div><div className="text-xs text-neutral-400">Soho and King's Cross are heating up. Stay close.</div></div>}
  <AnimatePresence mode="wait">
  {ph==="offer"&&<motion.div key="offer" initial={{y:80,scale:.92,opacity:0}} animate={{y:0,scale:1,opacity:1}} exit={{opacity:0}} transition={{type:"spring",damping:12}} className="rounded-3xl p-4 relative" style={{background:"linear-gradient(160deg,#2a0a26,#0b0d12)",border:`2px solid ${P}`,boxShadow:`0 0 40px ${P}88`}}>
   <div className="flex items-center justify-between"><div><div className="text-[10px] tracking-[.2em]" style={{color:P}}>NEW TRIP REQUEST</div><div className="font-black text-lg">{r.rider} · ★ 4.9</div></div>
    <svg width="54" height="54"><circle cx="27" cy="27" r="23" stroke="#222" strokeWidth="5" fill="none"/><circle cx="27" cy="27" r="23" stroke={cd<=5?"#ef4444":Y} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={145} strokeDashoffset={145*(1-Math.max(0,cd)/15)} transform="rotate(-90 27 27)"/><text x="27" y="32" textAnchor="middle" fill="#fff" fontWeight="900" fontSize="15">{Math.max(0,cd)}</text></svg></div>
   <div className="mt-2 text-sm"><div>🟢 {r.from}</div><div>🩷 {r.to}</div></div>
   <div className="mt-2 flex flex-wrap gap-1.5"><Chip c={Y}>£{r.fare.toFixed(2)} fixed fare</Chip><Chip c={G}>{r.mi} mi · {r.min} min</Chip><Chip c={G}>🚌 saves {r.saved} min</Chip>{r.trivia&&<Chip c={P}>🧠 Rider chose TRIVIA</Chip>}{r.step&&<Chip c="#60a5fa">♿ Step-free: ramp ready</Chip>}{r.tip>0&&<Chip c={Y}>likely tip £{r.tip}</Chip>}</div>
   {r.trivia&&<div className="mt-2 text-[11px] text-pink-200">Rider is playing for a free next trip. The app reads questions out loud, so your eyes stay on the road. Host bonus +£3 if they hit 8.</div>}
   <div className="mt-3 flex gap-2"><button onClick={()=>{setPh("idle");setN(x=>x+1)}} className="rounded-2xl px-4 py-3 bg-white/10 font-bold">Skip</button><button onClick={accept} className="flex-1 rounded-2xl py-3 font-black text-black text-lg" style={{background:G,boxShadow:`0 0 24px ${G}88`}}>ACCEPT £{r.fare.toFixed(0)}</button></div></motion.div>}
  {(ph==="pickup"||ph==="arrived")&&<motion.div key="pk" initial={{opacity:0}} animate={{opacity:1}} className="rounded-3xl p-4" style={{background:"#0b0d12",border:`1px solid ${G}66`}}>
   {bonus[0]&&<div className="mb-2 text-sm font-black" style={{color:Y}}>{bonus[0]}</div>}
   <div className="font-black text-lg">{ph==="pickup"?`Heading to ${r.rider}`:"You have arrived"}</div><div className="text-xs text-neutral-400">{r.from}</div>
   <div className="relative mt-4 h-10"><div className="absolute top-4 left-0 right-0 h-1 rounded bg-white/10"/><div className="absolute top-4 left-0 h-1 rounded" style={{width:`${pg*100}%`,background:G,boxShadow:`0 0 10px ${G}`}}/><div className="absolute text-2xl" style={{left:`calc(${pg*100}% - 14px)`,top:0}}>🚖</div><div className="absolute right-0 top-0 text-xl">📍</div></div>
   <div className="text-xs text-neutral-400">{ph==="pickup"?`${Math.ceil((1-pg)*3)} min away`:"Rider notified. Ramp ready."}</div>
   {ph==="arrived"&&<button onClick={()=>{setPh("trip");vib(60)}} className="mt-3 w-full rounded-2xl py-3 font-black text-black" style={{background:P}}>{r.rider} on board. START TRIP</button>}</motion.div>}
  {ph==="trip"&&<motion.div key="trip" initial={{opacity:0}} animate={{opacity:1}} className="rounded-3xl p-4 space-y-3" style={{background:"#07080c",border:`1px solid ${P}66`}}>
   <div className="flex items-center justify-between"><div className="font-black">On trip to {r.to}</div><Chip c={G}>🔒 EYES-UP MODE</Chip></div>
   <div className="relative h-10"><div className="absolute top-4 left-0 right-0 h-1 rounded bg-white/10"/><div className="absolute top-4 left-0 h-1 rounded" style={{width:`${pg*100}%`,background:P,boxShadow:`0 0 10px ${P}`}}/><div className="absolute text-2xl" style={{left:`calc(${pg*100}% - 14px)`,top:0}}>🚖</div><div className="absolute right-0 top-0 text-xl">🏁</div></div>
   <div className="text-[11px] text-neutral-400">🚌 Bus-lane savings so far: <b style={{color:G}}>{Math.round(r.saved*pg)} / {r.saved} min</b> · meter-free fare £{r.fare.toFixed(2)}</div>
   {r.trivia?<div className="rounded-2xl p-3" style={{background:"#150a14",border:`1px solid ${P}55`}}>
    <div className="flex items-center justify-between text-[11px]"><span style={{color:P}} className="tracking-widest">🧠 RIDER TRIVIA · LIVE</span><span>Q{qn}</span></div>
    <div className="flex items-end gap-0.5 h-6 my-1">{Array.from({length:16}).map((_,i)=><motion.span key={i} className="w-1.5 rounded" style={{background:P}} animate={{height:[4,22,6,16]}} transition={{duration:.9,repeat:Infinity,delay:i*.07}}/>)}<span className="ml-2 text-[11px] text-neutral-400">app is reading aloud</span></div>
    <div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full" style={{width:`${Math.min(100,ok/8*100)}%`,background:`linear-gradient(90deg,${P},${Y})`}}/></div><b>{ok}/8</b></div>
    <div className="text-[11px] mt-1 text-neutral-300">{last||"First question coming..."}</div>
    <AnimatePresence>{free&&<motion.div initial={{scale:.5,opacity:0}} animate={{scale:1,opacity:1}} className="mt-2 rounded-xl p-2 text-center font-black text-black" style={{background:`linear-gradient(90deg,${P},${Y})`}}>🎁 FREE NEXT TRIP UNLOCKED · +£3 host bonus</motion.div>}</AnimatePresence>
    <button onClick={()=>{setCheer(c=>c+1);addXp(1);vib(20)}} className="mt-2 w-full rounded-xl py-2 text-sm font-bold bg-white/10">👏 Cheer your rider on {cheer>0&&`(${cheer})`}</button></div>
   :<div className="rounded-2xl p-3 text-sm bg-white/5">🤫 Rider chose a quiet ride. No chat unless they start it.</div>}
  </motion.div>}
  {ph==="done"&&<motion.div key="done" initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",damping:11}} className="rounded-3xl p-5 text-center" style={{background:"linear-gradient(160deg,#1f0a1c,#0b0d12)",border:`2px solid ${Y}`,boxShadow:`0 0 40px ${Y}55`}}>
   {["💖","🪙","✨","🪙","🌟"].map((e,i)=><motion.span key={i} className="absolute text-xl" style={{left:`${15+i*17}%`}} initial={{y:0,opacity:1}} animate={{y:-80,opacity:0}} transition={{duration:1.6,delay:i*.1}}>{e}</motion.span>)}
   <div className="text-5xl">🏁</div><div className="font-black text-xl mt-1">Trip complete</div>
   <div className="text-4xl font-black mt-1" style={{color:Y}}>+£{(r.fare+r.tip+(ok>=8?3:0)).toFixed(2)}</div>
   <div className="text-xs text-neutral-300 mt-1">fare £{r.fare.toFixed(2)}{r.tip?` · tip £${r.tip}`:""}{ok>=8?" · host bonus £3":""} · no commission</div>
   <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div className="rounded-xl bg-white/5 p-2"><b style={{color:G}}>{r.saved} min</b><div className="text-neutral-400">saved by bus lanes</div></div>{r.trivia&&<div className="rounded-xl bg-white/5 p-2"><b style={{color:P}}>{ok}/8</b><div className="text-neutral-400">rider trivia</div></div>}<div className="rounded-xl bg-white/5 p-2"><b style={{color:Y}}>+{40+r.saved*3+ok*2+(r.step?20:0)} XP</b><div className="text-neutral-400">earned</div></div></div>
   {ok>=8&&<div className="mt-2 text-sm font-black" style={{color:P}}>🎁 {r.rider} won a free next trip. You hosted a legend.</div>}
   <div className="mt-2 text-[11px] text-neutral-400">Kudos from {r.rider} lands on Home when they send it.</div>
   <button onClick={next} className="mt-3 w-full rounded-2xl py-3 font-black text-black" style={{background:G}}>Next request →</button></motion.div>}
  </AnimatePresence>
  {on&&ph!=="offer"&&ph!=="trip"&&<button onClick={()=>{setOn(false);setPh("idle")}} className="w-full text-xs text-neutral-500 py-2">Go offline</button>}
 </div>}
