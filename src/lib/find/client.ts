'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PID } from '../game';
import type { Action, FindState } from './types';
import { playerHeaders } from './player';
export type Seat={code:string;token:string;pid:PID;name:string;invite?:string};
export const randomSecret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
export const seatKey=(code:string)=>'cs-find-seat-'+code;
export const pendingKey=(code:string)=>'cs-find-pending-'+code;
export function pendingSeat(code:string):Seat|null{try{const s=JSON.parse(localStorage.getItem(pendingKey(code))||'null');return s&&/^[A-Z2-9]{8}$/.test(s.code)&&/^[a-f0-9]{64}$/.test(s.token)&&['A','B'].includes(s.pid)?s:null;}catch{return null;}}
export function keepPending(seat:Seat,key=seat.code){const text=JSON.stringify(seat);localStorage.setItem(pendingKey(key),text);if(localStorage.getItem(pendingKey(key))!==text)throw Error('This browser cannot remember your seat. Allow browser storage before joining.');}
export function saveSeat(seat:Seat){const text=JSON.stringify(seat);localStorage.setItem(seatKey(seat.code),text);if(localStorage.getItem(seatKey(seat.code))!==text)throw Error('Your seat could not be remembered. Keep this page open and retry.');localStorage.setItem('cs-find-last',text);}
export function readSeat(code:string):Seat|null{try{const s=JSON.parse(localStorage.getItem(seatKey(code))||'null');return s?.code===code&&/^[a-f0-9]{64}$/.test(s.token)?s:null;}catch{return null;}}
export function useFind(code:string){
 const [pending,setPending]=useState('');
 const [seat,setSeat]=useState<Seat|null>(null),[state,setState]=useState<FindState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[connected,setConnected]=useState(false);
 const current=useRef<FindState|null>(null);const acting=useRef(false);const inFlight=useRef<AbortController|null>(null);const etag=useRef('');
 const take=useCallback((s:FindState)=>{if(s?.flow!=='find-v1')return;if(!current.current||s.v>=current.current.v){current.current=s;setState(s);}setConnected(true);setError('');},[]);
 useEffect(()=>{setSeat(readSeat(code));},[code]);
 const pull=useCallback(async(force=false)=>{const local=readSeat(code);if(!local)return;if(inFlight.current){if(!force)return;inFlight.current.abort();}const controller=new AbortController();inFlight.current=controller;const timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch('/api/find-room/'+code,{headers:{'x-find-seat':local.token,...playerHeaders(),'cache-control':'no-cache',...(etag.current?{'if-none-match':etag.current}:{})},cache:'no-store',signal:controller.signal});if(inFlight.current!==controller)return;if(r.status===304){setConnected(true);setError('');return;}const d=await r.json();if(inFlight.current!==controller)return;if(!r.ok)throw Error(d.error||'Could not reconnect');if(!current.current||d.v>=current.current.v)etag.current=r.headers.get('etag')||'';take(d);
 }catch(e){if(inFlight.current!==controller)return;setConnected(false);setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Connection interrupted. Your picks remain saved. Reconnecting...');}finally{clearTimeout(timer);if(inFlight.current===controller)inFlight.current=null;}},[code,take]);
 useEffect(()=>{if(!seat)return;void pull(true);const resume=()=>{if(document.visibilityState==='visible'){setConnected(false);void pull(true);}};const t=setInterval(()=>{if(document.visibilityState==='visible'&&current.current?.phase!=='done')void pull();},2500);window.addEventListener('online',resume);window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);document.addEventListener('visibilitychange',resume);return()=>{clearInterval(t);inFlight.current?.abort();inFlight.current=null;window.removeEventListener('online',resume);window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);document.removeEventListener('visibilitychange',resume);};},[seat,pull]);
 const send=async(it:Action)=>{if(acting.current||!seat)return false;acting.current=true;setBusy(true);setError('');setPending(it.t==='spin'?'Registering your spin. Tap once.': 'Saving your choice...');const actionId=randomSecret();const action=it.t==='spin'?{...it,count:current.current?.wheel.spinCount}:it;
 try{for(let attempt=0;attempt<2;attempt++){try{const r=await fetch('/api/find-room/'+code,{method:'POST',headers:{'content-type':'application/json','x-find-seat':seat.token,...playerHeaders()},signal:AbortSignal.timeout(14000),body:JSON.stringify({it:action,actionId})});const d=await r.json();if(!r.ok){if(r.status>=500&&attempt===0){await new Promise(r=>setTimeout(r,400));continue;}throw Error(d.error||'Not saved. Please retry.');}take(d);return true;}catch(e){if(attempt===0&&e instanceof Error&&(e.name==='TimeoutError'||e.name==='TypeError'||e.name==='AbortError'))continue;throw e;}}return false;}catch(e){setError(e instanceof Error?e.message:'Not saved. Please retry.');void pull();return false;}finally{acting.current=false;setBusy(false);setPending('');}};

 return{seat,setSeat,state,send,error,busy,connected,pull:()=>pull(true),pending};
}
