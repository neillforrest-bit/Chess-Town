"use client";
import dynamic from "next/dynamic";
import {useEffect,useMemo,useRef,useState} from "react";
import {motion,AnimatePresence} from "framer-motion";
import {DESTS,TIERS,DRIVERS,FALLBACK,LatLng,Dest,miles,fare,lerp,stdMinutes,cabMinutes,savedMinutes,meterEstimate,guaranteedFare,route,pointAt,TIPS,TAGLINES,PERSONA,PERKS,LEVELS,BADGES} from "../lib/data";
const TX=()=><svg width="64" height="38" viewBox="0 0 56 34" aria-label="LEVC TX black cab"><path d="M3 24 L7 12 Q9 5 18 5 L38 5 Q47 5 51 14 L55 22 L55 28 L3 28Z" fill="#111"/><rect x="12" y="9" width="13" height="9" rx="1.5" fill="#9bd0ff"/><rect x="28" y="9" width="14" height="9" rx="1.5" fill="#9bd0ff"/><rect x="21" y="1" width="12" height="4" rx="1" fill="#facc15"/><circle cx="15" cy="28" r="5.5" fill="#333" stroke="#111"/><circle cx="43" cy="28" r="5.5" fill="#333" stroke="#111"/></svg>;
const CarIcon=({c}:{c:string})=><svg width="56" height="34" viewBox="0 0 56 34" aria-hidden><path d="M4 24 L9 13 Q11 7 19 7 L37 7 Q45 7 49 14 L54 22 L54 28 L4 28Z" fill={c}/><rect x="14" y="11" width="12" height="7" rx="1.5" fill="#0b0d12"/><rect x="29" y="11" width="12" height="7" rx="1.5" fill="#0b0d12"/><circle cx="15" cy="28" r="5" fill="#222" stroke="#0b0d12" strokeWidth="2"/><circle cx="43" cy="28" r="5" fill="#222" stroke="#0b0d12" strokeWidth="2"/></svg>;
type G={xp:number;streak:number;last:string;bank:number;badges:string[];tiers:string[];rides:number};
const G0:G={xp:0,streak:0,last:"",bank:0,badges:[],tiers:[],rides:0};
const lvl=(xp:number)=>{let i=0;LEVELS.forEach((l,k)=>{if(xp>=l.xp)i=k});return i};
const today=()=>new Date().toISOString().slice(0,10);
const ACC=["Wheelchair ramp","Stroller friendly","Hearing loop","High-vis handles","Assistance dog"];
const Map=dynamic(()=>import("./Map"),{ssr:false});
const MATCH_MS=2800,PICKUP_MS=14000,TRIP_MS=16000;
export default function RideApp(){
const [state,setState]=useState(0); // 0 init,1 idle,2 destination,3 tiers,4 matching/en route,5 trip,6 arrived
const [pickup,setPickup]=useState<LatLng>(FALLBACK);
const [located,setLocated]=useState<"pending"|"ok"|"fallback">("pending");
const [dest,setDest]=useState<Dest|null>(null);
const [q,setQ]=useState("");
const [tierId,setTierId]=useState("mid");
const [fixed,setFixed]=useState(true);const [stepFree,setStepFree]=useState(false);const [acc,setAcc]=useState<string[]>([]);const [tg,setTg]=useState(0);
useEffect(()=>{const i=setInterval(()=>setTg(x=>(x+1)%TAGLINES.length),3500);return()=>clearInterval(i)},[]);
const [g,setG]=useState<G>(G0);const [reward,setReward]=useState<any>(null);const [guess,setGuess]=useState(0);const actual=useRef(0);const usedStep=useRef(false);
useEffect(()=>{try{const v=localStorage.getItem("ct_game");if(v)setG({...G0,...JSON.parse(v)})}catch{}},[]);
const [sq,setSq]=useState<Dest[]>([]);const [searching,setSearching]=useState(false);
useEffect(()=>{const t=q.trim();if(t.length<3){setSq([]);return}setSearching(true);
 const id=setTimeout(async()=>{try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=gb&viewbox=-0.55,51.72,0.35,51.25&q="+encodeURIComponent(t));const j=await r.json();
  setSq(j.filter((x:any,i:number)=>j.findIndex((y:any)=>y.display_name.split(",").slice(0,3).join()===x.display_name.split(",").slice(0,3).join())===i).map((x:any,i:number)=>({id:"geo"+i,name:String(x.display_name).split(",")[0],address:String(x.display_name).split(",").slice(1,4).join(",").trim(),coordinates:{lat:+x.lat,lng:+x.lon}})))}catch{
  // simulated fallback: pin the typed text a short hop from pickup
  let h=0;for(const c of t)h=(h*31+c.charCodeAt(0))%1000;setSq([{id:"sim",name:t,address:"Simulated location",coordinates:{lat:pickup.lat+0.004+(h%40)/4000,lng:pickup.lng+0.004+(h%27)/4000}}])}setSearching(false)},500);
 return()=>clearTimeout(id)},[q]);
const [phase,setPhase]=useState<"matching"|"enroute">("matching");
const [carPos,setCarPos]=useState<LatLng|null>(null);
const [eta,setEta]=useState(0);
const [tripPct,setTripPct]=useState(0);
const [rating,setRating]=useState(0);
const [tick,setTick]=useState(0);
const [sheetH,setSheetH]=useState(260);
const sheet=useRef<HTMLDivElement>(null);
const timers=useRef<any[]>([]);
const clear=()=>{timers.current.forEach(t=>{clearTimeout(t);clearInterval(t)});timers.current=[]};
useEffect(()=>{ // State 0
 if(!navigator.geolocation){setLocated("fallback");setState(1);return}
 navigator.geolocation.getCurrentPosition(p=>{setPickup({lat:p.coords.latitude,lng:p.coords.longitude});setLocated("ok");setState(1)},
 ()=>{setPickup(FALLBACK);setLocated("fallback");setState(1)},{timeout:6000,maximumAge:60000});
 return clear},[]);
useEffect(()=>{const el=sheet.current;if(!el)return;const ro=new ResizeObserver(()=>setSheetH(el.offsetHeight));ro.observe(el);return()=>ro.disconnect()},[]);
const tier=TIERS.find(t=>t.id===tierId)!;
const driver=DRIVERS[tierId];
const mi=dest?miles(pickup,dest.coordinates):0;
const isCab=tierId==="cab";
const price=dest?(isCab?(fixed?guaranteedFare(mi):(state===6?Math.round(actual.current*100)/100:meterEstimate(mi))):fare(tier,mi)):0;
const routes=useMemo(()=>dest?{red:route(pickup,dest.coordinates,0.32),green:route(pickup,dest.coordinates,0.04)}:null,[dest,pickup]);
const std=stdMinutes(mi),cabM=cabMinutes(mi),saved=savedMinutes(mi);
const locate=()=>{navigator.geolocation?.getCurrentPosition(p=>{setPickup({lat:p.coords.latitude,lng:p.coords.longitude});setLocated("ok");setTick(t=>t+1)},()=>{setPickup(FALLBACK);setLocated("fallback");setTick(t=>t+1)},{timeout:6000});if(!navigator.geolocation){setPickup(FALLBACK);setTick(t=>t+1)}};
const animate=(ms:number,onFrame:(p:number)=>void,done:()=>void)=>{const s=Date.now();const id=setInterval(()=>{const p=Math.min(1,(Date.now()-s)/ms);onFrame(p);if(p>=1){clearInterval(id);done()}},80);timers.current.push(id)};
const confirm=()=>{ // State 4 -> 5 -> 6
 clear();setReward(null);actual.current=meterEstimate(mi)*(0.93+Math.random()*0.14);usedStep.current=stepFree;setState(4);setPhase("matching");setCarPos(null);setTripPct(0);setRating(0);
 const start:LatLng={lat:pickup.lat+0.011,lng:pickup.lng-0.014};
 const tm=setTimeout(()=>{setPhase("enroute");setCarPos(start);
  const etaS=driver.eta_minutes*60;setEta(etaS);
  animate(PICKUP_MS,p=>{setCarPos(lerp(start,pickup,p));setEta(Math.ceil(etaS*(1-p)))},()=>{
   setState(5);setCarPos(pickup);
   animate(TRIP_MS,p=>{setCarPos(isCab&&routes?pointAt(routes.green,p):lerp(pickup,dest!.coordinates,p));setTripPct(p)},()=>setState(6))})},MATCH_MS);
 timers.current.push(tm)};
const reset=()=>{clear();setState(1);setDest(null);setCarPos(null);setQ("");setTick(t=>t+1)};
const finalMeter=Math.round(actual.current*100)/100;
useEffect(()=>{if(state!==6||reward||!dest)return;const win=isCab&&!fixed&&Math.abs(guess-finalMeter)<=0.5;
 let xp=20+Math.round(mi*4)+(isCab?10:0)+(win?25:0)+(usedStep.current?10:0);const d=new Date();const t=today();
 const y=new Date(Date.now()-864e5).toISOString().slice(0,10);let streak=g.last===t?g.streak:(g.last===y?g.streak+1:1);xp+=Math.min(15,streak*3);
 const bank=g.bank+(isCab?saved:0);const tiers=g.tiers.includes(tierId)?g.tiers:[...g.tiers,tierId];const nb:string[]=[];
 const add=(k:string,c:boolean)=>{if(c&&!g.badges.includes(k)&&!nb.includes(k))nb.push(k)};
 add("first",true);add("bus",bank>=10);add("step",usedStep.current);add("meter",win);add("owl",d.getHours()>=21||d.getHours()<5);add("tri",tiers.length>=3);
 const ng:G={xp:g.xp+xp,streak,last:t,bank,badges:[...g.badges,...nb],tiers,rides:g.rides+1};
 setReward({xp,nb,win,up:lvl(ng.xp)>lvl(g.xp),streak});setG(ng);try{localStorage.setItem("ct_game",JSON.stringify(ng))}catch{}},[state]);
const list=DESTS.filter(d=>(d.name+d.address).toLowerCase().includes(q.toLowerCase()));
const fmt=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const showDest=state>=2&&dest;
const Row=({children}:any)=><div className="flex items-center justify-between">{children}</div>;
return <div className="w-full h-full flex justify-center bg-neutral-900">
<div className="relative h-full w-full max-w-[430px] overflow-hidden bg-neutral-200" style={{height:"100dvh"}}>
 <div className="absolute inset-0 z-0"><Map pickup={pickup} dest={showDest?dest!.coordinates:null} carPos={carPos} tick={tick} pad={sheetH+30} cab={showDest&&isCab&&state>=3?routes:null}/></div>
 {state===0&&<div className="absolute inset-0 z-[60] bg-white flex flex-col items-center justify-center gap-3"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"/><p className="font-semibold">Finding your location...</p></div>}
 {state>=1&&state<=3&&<div className="absolute top-3 left-3 right-3 z-[40] flex justify-between items-start pointer-events-none">
  {state>1&&<button onClick={()=>{state===3?setState(2):(setState(1),setDest(null))}} className="pointer-events-auto bg-white w-10 h-10 rounded-full shadow-lg text-xl" aria-label="Back">←</button>}
  {located==="fallback"&&<div className="ml-auto bg-white/95 text-xs rounded-full px-3 py-2 shadow">Location unavailable - using Trafalgar Square</div>}</div>}
 {state===1||state===2||state===3?<button onClick={locate} aria-label="Locate me" className="absolute right-4 z-[45] bg-white w-12 h-12 rounded-full shadow-xl text-xl flex items-center justify-center" style={{bottom:sheetH+16}}>◎</button>:null}
 <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none"><motion.div ref={sheet} layout initial={{y:400}} animate={{y:0}} transition={{type:"spring",damping:28,stiffness:260}}
  className="pointer-events-auto w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl p-6" style={{paddingBottom:"max(24px,env(safe-area-inset-bottom))"}}>
  <div className="w-10 h-1.5 bg-neutral-300 rounded-full mx-auto -mt-3 mb-3"/>
  <AnimatePresence mode="wait"><motion.div key={state===4?"4"+phase:state} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.2}}>
  {state<=1&&<div>
   <h1 className="text-2xl font-bold mb-2">Good evening, London</h1>
   <div className="mb-2 flex items-center gap-2 text-sm bg-black text-yellow-300 rounded-xl px-3 py-2"><TX/><span key={tg} className="font-semibold">{TAGLINES[tg]}</span></div>
   <div className="mb-3 rounded-2xl bg-[#0b0d12] text-white p-3 border border-white/10"><div className="flex items-center justify-between"><div><div className="text-[10px] tracking-[.18em] uppercase text-emerald-300/80">London rank</div><div className="font-black text-lg leading-tight">{LEVELS[lvl(g.xp)].n}</div></div><div className="flex gap-3 text-center text-xs"><div><div className="text-lg font-black text-orange-400">🔥{g.streak}</div><div className="text-neutral-400">streak</div></div><div><div className="text-lg font-black text-emerald-300">{g.bank}m</div><div className="text-neutral-400">time bank</div></div></div></div>
    <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300" style={{width:`${lvl(g.xp)>=LEVELS.length-1?100:Math.round((g.xp-LEVELS[lvl(g.xp)].xp)/(LEVELS[lvl(g.xp)+1].xp-LEVELS[lvl(g.xp)].xp)*100)}%`}}/></div><div className="mt-1 flex justify-between text-[10px] text-neutral-400"><span>{g.xp} XP</span><span>{lvl(g.xp)<LEVELS.length-1?`${LEVELS[lvl(g.xp)+1].xp-g.xp} XP to ${LEVELS[lvl(g.xp)+1].n}`:"Max rank"}</span></div>
    <div className="mt-2 flex gap-1.5 flex-wrap">{Object.entries(BADGES).map(([k,b])=><span key={k} title={b.d} className={`text-base rounded-lg px-1.5 py-0.5 ${g.badges.includes(k)?"bg-white/15":"bg-white/5 grayscale opacity-30"}`}>{b.e}</span>)}</div>
    <div className="mt-2 text-[11px] text-yellow-300">🎯 Daily quest: ride a Black Cab · +10 XP bonus</div></div>
   <button disabled={state===0} onClick={()=>setState(2)} className="w-full text-left bg-neutral-100 rounded-xl px-4 py-4 text-lg text-neutral-600 active:bg-neutral-200">🔍 Where to?</button></div>}



  {state===2&&<div>
   <input autoFocus value={q} onChange={ev=>setQ(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter"&&(sq[0]||list[0])){setDest(list[0]||sq[0]);setState(3)}}} placeholder="Type any London address or place" className="w-full bg-neutral-100 rounded-xl px-4 py-3 text-lg outline-none mb-2" style={{fontSize:16}}/>
   <div className="overflow-y-auto" style={{maxHeight:"34vh"}}>
   {list.map(x=><button key={x.id} onClick={()=>{setDest(x);setState(3)}} className="w-full text-left py-3 border-b border-neutral-100 active:bg-neutral-100"><div className="font-semibold">📍 {x.name}</div><div className="text-sm text-neutral-500">{x.address}</div></button>)}
   {q.trim().length>=3&&<div className="text-[10px] tracking-wider text-neutral-400 pt-2">{searching?"SEARCHING LONDON...":"ADDRESSES"}</div>}
   {sq.map(x=><button key={x.id} onClick={()=>{setDest(x);setState(3)}} className="w-full text-left py-3 border-b border-neutral-100 active:bg-neutral-100"><div className="font-semibold">🧭 {x.name}</div><div className="text-sm text-neutral-500">{x.address}</div></button>)}
   {!list.length&&!sq.length&&!searching&&<p className="py-4 text-neutral-500">Keep typing - try a street, postcode or place</p>}</div></div>}
  {state===3&&dest&&<div>
   <Row><div><div className="text-sm text-neutral-500">To {dest.name}</div><div className="text-sm text-neutral-500">{mi.toFixed(1)} mi</div></div></Row>
   <label className="mt-2 flex items-center justify-between rounded-xl bg-yellow-50 border border-yellow-300 px-3 py-2 text-sm"><span>♿ <b>Need step-free?</b> Wheelchair, stroller or mobility aid</span><input type="checkbox" className="w-5 h-5" checked={stepFree} onChange={e=>{setStepFree(e.target.checked);if(e.target.checked){setTierId("cab");setAcc(a=>a.includes("Wheelchair ramp")?a:[...a,"Wheelchair ramp"])}}}/></label>
   <div className="mt-2 space-y-2" style={{maxHeight:"44vh",overflowY:"auto"}}>{TIERS.filter(t=>!stepFree||t.id==="cab").map(t=>{const sel=tierId===t.id,P=PERKS[t.id],c=t.id==="cab",pr=c?(fixed?guaranteedFare(mi):meterEstimate(mi)):fare(t,mi),mins=c?cabM:std,pe=PERSONA[t.id];
 return <div key={t.id} onClick={()=>setTierId(t.id)} className="rounded-2xl bg-neutral-900 text-white px-4 py-3 border-2" style={{borderColor:sel?P.accent:"transparent",opacity:sel?1:.92}}>
  <div className="flex items-center justify-between"><div className="flex items-center gap-3">{c?<TX/>:<CarIcon c={P.accent}/>}<div><div className="font-bold">{t.name} <span className="text-[10px] rounded px-1.5 py-0.5 ml-1 text-black font-bold" style={{background:P.accent}}>{c?"NEW":t.tag.toUpperCase()}</span></div><div className="text-xs text-neutral-300">{c?"LEVC TX · up to 6 · face-to-face":t.cars}</div></div></div><div className="font-bold text-lg">£{pr.toFixed(2)}</div></div>
  <div className={`${sel?"mt-2":"mt-1"} flex flex-wrap gap-1.5 text-[11px]`}><span className="rounded-full px-2 py-0.5 font-bold text-black" style={{background:P.accent}}>{c?`⏱ Saves ${saved} min`:`${mins} min trip`}</span><span className="bg-white/15 rounded-full px-2 py-0.5">{DRIVERS[t.id].eta_minutes} min away</span>{sel&&<span className="bg-white/15 rounded-full px-2 py-0.5">{t.seats} seats</span>}{sel&&P.badges.map(x=><span key={x} className="bg-white/15 rounded-full px-2 py-0.5">{x}</span>)}{sel&&<span className="bg-white/15 rounded-full px-2 py-0.5">No surge. Ever.</span>}</div>
  {sel&&<div className="mt-2 text-[11px] text-neutral-300">{pe.emoji} <b className="text-white">{DRIVERS[t.id].name}</b> · {pe.title} · ★ {DRIVERS[t.id].rating}</div>}
  {sel&&!c&&<ul className="mt-1 text-[11px] text-neutral-300 space-y-0.5">{P.perks.map(x=><li key={x}>✓ {x}</li>)}</ul>}
  {sel&&c&&<div className="mt-3 space-y-2">
     <div className="grid grid-cols-2 gap-2 text-sm"><button onClick={e=>{e.stopPropagation();setFixed(true)}} className={`rounded-xl px-2 py-2 text-left border-2 ${fixed?"border-yellow-400 bg-white/10":"border-white/20"}`}><div className="font-bold">Guaranteed App Fare</div><div className="text-[11px] text-neutral-300">£{guaranteedFare(mi).toFixed(2)} fixed. No surprises.</div></button><button onClick={e=>{e.stopPropagation();setFixed(false);setGuess(meterEstimate(mi))}} className={`rounded-xl px-2 py-2 text-left border-2 ${!fixed?"border-yellow-400 bg-white/10":"border-white/20"}`}><div className="font-bold">Run the Meter</div><div className="text-[11px] text-neutral-300">Est. £{meterEstimate(mi).toFixed(2)}, pay what it reads.</div></button></div>
     {!fixed&&<div className="rounded-xl bg-white/10 px-3 py-2 flex items-center justify-between text-sm"><div><div className="font-bold">🎯 Beat the meter</div><div className="text-[11px] text-neutral-300">Guess the final fare within 50p: +25 XP</div></div><div className="flex items-center gap-2"><button onClick={e=>{e.stopPropagation();setGuess(x=>Math.max(1,x-0.5))}} className="w-8 h-8 rounded-full bg-white/20 font-bold">-</button><b className="tabular-nums w-14 text-center">£{(guess||meterEstimate(mi)).toFixed(2)}</b><button onClick={e=>{e.stopPropagation();setGuess(x=>(x||meterEstimate(mi))+0.5)}} className="w-8 h-8 rounded-full bg-white/20 font-bold">+</button></div></div>}
     <div className="text-[11px] text-neutral-300">Accessibility filters</div><div className="flex flex-wrap gap-1.5">{ACC.map(a=><button key={a} onClick={e=>{e.stopPropagation();setAcc(x=>x.includes(a)?x.filter(y=>y!==a):[...x,a])}} className={`text-[11px] rounded-full px-2.5 py-1 border ${acc.includes(a)?"bg-yellow-400 text-black border-yellow-400 font-bold":"border-white/30"}`}>{acc.includes(a)?"✓ ":""}{a}</button>)}</div>
     <div className="text-[11px] text-neutral-300 leading-snug">Every Black Cab is wheelchair accessible: built-in ramp, hearing loop, high-vis handles. Seats 6 face-to-face with a privacy partition. Standard ride: {std} min. Black Cab: {cabM} min.</div></div>}
 </div>})}</div>
   <button onClick={confirm} className="mt-3 w-full bg-black text-white rounded-2xl py-4 text-lg font-bold active:opacity-80">{isCab?`Confirm Black Cab · ${fixed?"£"+guaranteedFare(mi).toFixed(2):"Meter"}`:"Confirm Ride"}</button></div>}
  {state===4&&phase==="matching"&&<div className="flex flex-col items-center py-6 gap-3"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"/><p className="font-semibold text-lg">Finding your driver...</p></div>}
  {state===4&&phase==="enroute"&&<div>
   <Row><div><div className="text-sm text-neutral-500">Driver arriving in</div><div className="text-3xl font-bold tabular-nums">{fmt(eta)}</div></div>
    <div className="bg-neutral-100 rounded-lg px-3 py-2 font-mono font-bold tracking-wider border-2 border-neutral-300">{driver.vehicle.plate}</div></Row>
   <div className="mt-3 flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-neutral-300 flex items-center justify-center text-xl">🧑</div>
    <div><div className="font-bold text-lg">{driver.name} <span className="text-sm font-normal">★ {driver.rating}</span></div>
    <div className="text-sm text-neutral-600">{driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model}</div><div className="text-[11px] mt-0.5 inline-block bg-neutral-900 text-white rounded px-1.5 py-0.5 mr-1">{PERSONA[tierId].emoji} {PERSONA[tierId].title}</div><div className="text-[11px] text-neutral-500">{PERSONA[tierId].fact}</div>{isCab&&<div className="text-[11px] mt-0.5 inline-block bg-yellow-400 text-black font-bold rounded px-1.5 py-0.5">🎓 Driven by an Expert · The Knowledge · {driver.years} yrs</div>}</div></div>{isCab&&<div className="mt-3 text-xs bg-yellow-50 border border-yellow-300 rounded-xl px-3 py-2">♿ Ramp ready{acc.length?` · ${acc.join(", ")}`:""}. Dave has been told you may need extra time boarding.</div>}</div>}
  {state===5&&<div>
   <div className="font-bold text-lg">Heading to destination</div><div className="text-sm text-neutral-500">{dest?.name}</div>
   <div className="mt-3 h-2 bg-neutral-200 rounded-full overflow-hidden"><div className="h-full bg-black" style={{width:`${tripPct*100}%`}}/></div>
   <div className="mt-2 text-sm text-neutral-600">{driver.name} · {driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.plate}</div>
   {isCab&&<div className="mt-3 space-y-2">
    <div className="rounded-3xl bg-[#0b0d12] text-white p-4 border border-emerald-400/40 shadow-[0_0_28px_#34d39944]"><div className="flex items-end justify-between"><div><div className="text-[10px] tracking-[.18em] uppercase text-emerald-300/80">Bus Lane Advantage</div><div className="flex items-baseline gap-1"><span className="text-5xl font-black tracking-tight text-emerald-300 tabular-nums">{Math.round(saved*tripPct)}</span><span className="text-neutral-400 text-sm">/ {saved} min saved</span></div></div><div className="text-right text-[11px] leading-tight"><div className="text-rose-400">· · · Standard {std} min</div><div className="text-emerald-300 font-bold">━━ Black Cab {cabM} min</div></div></div><div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-200" style={{width:`${Math.round(tripPct*100)}%`,transition:"width .6s"}}/></div></div>
    <div className="rounded-2xl bg-neutral-900 text-white p-3 text-sm"><div className="text-[10px] font-bold text-yellow-300 tracking-wider">🎓 LOCAL KNOWLEDGE</div><div key={Math.floor(tripPct*TIPS.length)}>{TIPS[Math.min(TIPS.length-1,Math.floor(tripPct*TIPS.length))]}</div></div>
    {!fixed&&<div className="rounded-xl bg-black text-yellow-300 font-mono px-3 py-2 flex justify-between"><span>METER</span><b>£{(actual.current*tripPct).toFixed(2)}</b></div>}</div>}</div>}
  {state===6&&<div className="h-2"/>}
  </motion.div></AnimatePresence>
 </motion.div></div>
 <AnimatePresence>{state===6&&dest&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-4">
  <motion.div initial={{y:80}} animate={{y:0}} className="bg-white rounded-3xl p-6 w-full">
   <div className="text-center"><div className="text-4xl">✅</div><h2 className="text-2xl font-bold mt-1">You have arrived</h2><div className="text-neutral-500 text-sm">{dest.name}</div></div>
   <div className="mt-4 bg-neutral-50 rounded-2xl p-4 text-sm space-y-1">
    <Row><span>{tier.name} fare{isCab?(fixed?" (guaranteed)":" (meter)"):""}</span><span>£{price.toFixed(2)}</span></Row>{isCab&&<Row><span className="text-green-700">Bus lanes saved you</span><span className="text-green-700 font-bold">{saved} min</span></Row>}
    <Row><span className="text-neutral-500">Distance</span><span className="text-neutral-500">{mi.toFixed(1)} mi</span></Row>
    <div className="border-t my-2"/><Row><span className="font-bold text-lg">Total paid</span><span className="font-bold text-lg">£{price.toFixed(2)}</span></Row></div>
   {reward&&<motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} className="mt-3 rounded-2xl bg-[#0b0d12] text-white p-3"><div className="flex items-center justify-between"><b className="text-emerald-300 text-xl">+{reward.xp} XP</b><span className="text-orange-400 font-bold">🔥 {reward.streak} day streak</span></div>{reward.up&&<div className="mt-1 text-yellow-300 font-bold">⬆ Rank up: {LEVELS[lvl(g.xp)].n}!</div>}{reward.win&&<div className="mt-1 text-sm">🎯 Beat the meter! Final fare £{price.toFixed(2)}</div>}{isCab&&<div className="mt-1 text-xs text-neutral-300">Time bank: {g.bank} min banked</div>}{reward.nb.map((k:string)=><div key={k} className="mt-1 text-sm">{BADGES[k].e} <b>Badge unlocked: {BADGES[k].n}</b> <span className="text-neutral-400">{BADGES[k].d}</span></div>)}</motion.div>}
   <div className="mt-4 text-center font-semibold">Rate {driver.name}</div>
   <div className="flex justify-center gap-1 mt-1">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} aria-label={`${n} stars`} className={`text-4xl ${n<=rating?"text-amber-400":"text-neutral-300"}`}>★</button>)}</div>
   <button onClick={reset} className="mt-4 w-full bg-black text-white rounded-2xl py-4 font-bold">{rating?"Submit & done":"Done"}</button>
  </motion.div></motion.div>}</AnimatePresence>
</div></div>}
