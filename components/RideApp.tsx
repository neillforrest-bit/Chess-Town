"use client";
import dynamic from "next/dynamic";
import {useEffect,useRef,useState} from "react";
import {motion,AnimatePresence} from "framer-motion";
import {DESTS,TIERS,DRIVERS,FALLBACK,LatLng,Dest,miles,fare,lerp} from "../lib/data";
const Map=dynamic(()=>import("./Map"),{ssr:false});
const MATCH_MS=2800,PICKUP_MS=14000,TRIP_MS=16000;
export default function RideApp(){
const [state,setState]=useState(0); // 0 init,1 idle,2 destination,3 tiers,4 matching/en route,5 trip,6 arrived
const [pickup,setPickup]=useState<LatLng>(FALLBACK);
const [located,setLocated]=useState<"pending"|"ok"|"fallback">("pending");
const [dest,setDest]=useState<Dest|null>(null);
const [q,setQ]=useState("");
const [tierId,setTierId]=useState("mid");
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
const price=dest?fare(tier,mi):0;
const locate=()=>{navigator.geolocation?.getCurrentPosition(p=>{setPickup({lat:p.coords.latitude,lng:p.coords.longitude});setLocated("ok");setTick(t=>t+1)},()=>{setPickup(FALLBACK);setLocated("fallback");setTick(t=>t+1)},{timeout:6000});if(!navigator.geolocation){setPickup(FALLBACK);setTick(t=>t+1)}};
const animate=(ms:number,onFrame:(p:number)=>void,done:()=>void)=>{const s=Date.now();const id=setInterval(()=>{const p=Math.min(1,(Date.now()-s)/ms);onFrame(p);if(p>=1){clearInterval(id);done()}},80);timers.current.push(id)};
const confirm=()=>{ // State 4 -> 5 -> 6
 clear();setState(4);setPhase("matching");setCarPos(null);setTripPct(0);setRating(0);
 const start:LatLng={lat:pickup.lat+0.011,lng:pickup.lng-0.014};
 const tm=setTimeout(()=>{setPhase("enroute");setCarPos(start);
  const etaS=driver.eta_minutes*60;setEta(etaS);
  animate(PICKUP_MS,p=>{setCarPos(lerp(start,pickup,p));setEta(Math.ceil(etaS*(1-p)))},()=>{
   setState(5);setCarPos(pickup);
   animate(TRIP_MS,p=>{setCarPos(lerp(pickup,dest!.coordinates,p));setTripPct(p)},()=>setState(6))})},MATCH_MS);
 timers.current.push(tm)};
const reset=()=>{clear();setState(1);setDest(null);setCarPos(null);setQ("");setTick(t=>t+1)};
const list=DESTS.filter(d=>(d.name+d.address).toLowerCase().includes(q.toLowerCase()));
const fmt=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const showDest=state>=2&&dest;
const Row=({children}:any)=><div className="flex items-center justify-between">{children}</div>;
return <div className="w-full h-full flex justify-center bg-neutral-900">
<div className="relative h-full w-full max-w-[430px] overflow-hidden bg-neutral-200" style={{height:"100dvh"}}>
 <div className="absolute inset-0 z-0"><Map pickup={pickup} dest={showDest?dest!.coordinates:null} carPos={carPos} tick={tick} pad={sheetH+30}/></div>
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
   <h1 className="text-2xl font-bold mb-3">Good evening, London</h1>
   <button disabled={state===0} onClick={()=>setState(2)} className="w-full text-left bg-neutral-100 rounded-xl px-4 py-4 text-lg text-neutral-600 active:bg-neutral-200">🔍 Where to?</button></div>}
  {state===2&&<div>
   <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search London destinations" className="w-full bg-neutral-100 rounded-xl px-4 py-3 text-lg outline-none mb-2" style={{fontSize:16}}/>
   <div className="overflow-y-auto" style={{maxHeight:"34vh"}}>
   {list.map(d=><button key={d.id} onClick={()=>{setDest(d);setState(3)}} className="w-full text-left py-3 border-b border-neutral-100 active:bg-neutral-100">
    <div className="font-semibold">📍 {d.name}</div><div className="text-sm text-neutral-500">{d.address}</div></button>)}
   {!list.length&&<p className="py-4 text-neutral-500">No matching landmarks</p>}</div></div>}
  {state===3&&dest&&<div>
   <Row><div><div className="text-sm text-neutral-500">To {dest.name}</div><div className="text-sm text-neutral-500">{mi.toFixed(1)} mi</div></div></Row>
   <div className="mt-2 space-y-2">{TIERS.map(t=><button key={t.id} onClick={()=>setTierId(t.id)} className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 text-left ${tierId===t.id?"border-black bg-neutral-50":"border-transparent bg-neutral-100"}`}>
    <div><div className="font-bold">{t.name} <span className="text-xs font-normal text-neutral-500">{t.tag}</span></div><div className="text-xs text-neutral-500">{t.cars}</div></div>
    <div className="font-bold text-lg">£{fare(t,mi).toFixed(2)}</div></button>)}</div>
   <button onClick={confirm} className="mt-3 w-full bg-black text-white rounded-2xl py-4 text-lg font-bold active:opacity-80">Confirm Ride</button></div>}
  {state===4&&phase==="matching"&&<div className="flex flex-col items-center py-6 gap-3"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"/><p className="font-semibold text-lg">Finding your driver...</p></div>}
  {state===4&&phase==="enroute"&&<div>
   <Row><div><div className="text-sm text-neutral-500">Driver arriving in</div><div className="text-3xl font-bold tabular-nums">{fmt(eta)}</div></div>
    <div className="bg-neutral-100 rounded-lg px-3 py-2 font-mono font-bold tracking-wider border-2 border-neutral-300">{driver.vehicle.plate}</div></Row>
   <div className="mt-3 flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-neutral-300 flex items-center justify-center text-xl">🧑</div>
    <div><div className="font-bold text-lg">{driver.name} <span className="text-sm font-normal">★ {driver.rating}</span></div>
    <div className="text-sm text-neutral-600">{driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model}</div></div></div></div>}
  {state===5&&<div>
   <div className="font-bold text-lg">Heading to destination</div><div className="text-sm text-neutral-500">{dest?.name}</div>
   <div className="mt-3 h-2 bg-neutral-200 rounded-full overflow-hidden"><div className="h-full bg-black" style={{width:`${tripPct*100}%`}}/></div>
   <div className="mt-2 text-sm text-neutral-600">{driver.name} · {driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.plate}</div></div>}
  {state===6&&<div className="h-2"/>}
  </motion.div></AnimatePresence>
 </motion.div></div>
 <AnimatePresence>{state===6&&dest&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-4">
  <motion.div initial={{y:80}} animate={{y:0}} className="bg-white rounded-3xl p-6 w-full">
   <div className="text-center"><div className="text-4xl">✅</div><h2 className="text-2xl font-bold mt-1">You have arrived</h2><div className="text-neutral-500 text-sm">{dest.name}</div></div>
   <div className="mt-4 bg-neutral-50 rounded-2xl p-4 text-sm space-y-1">
    <Row><span>{tier.name} fare</span><span>£{price.toFixed(2)}</span></Row>
    <Row><span className="text-neutral-500">Distance</span><span className="text-neutral-500">{mi.toFixed(1)} mi</span></Row>
    <div className="border-t my-2"/><Row><span className="font-bold text-lg">Total paid</span><span className="font-bold text-lg">£{price.toFixed(2)}</span></Row></div>
   <div className="mt-4 text-center font-semibold">Rate {driver.name}</div>
   <div className="flex justify-center gap-1 mt-1">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} aria-label={`${n} stars`} className={`text-4xl ${n<=rating?"text-amber-400":"text-neutral-300"}`}>★</button>)}</div>
   <button onClick={reset} className="mt-4 w-full bg-black text-white rounded-2xl py-4 font-bold">{rating?"Submit & done":"Done"}</button>
  </motion.div></motion.div>}</AnimatePresence>
</div></div>}
