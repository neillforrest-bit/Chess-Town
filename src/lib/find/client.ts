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
 const [seat,setSeat]=useState<Seat|null>(null),[state,setState]=useState<FindState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[connected,setConnected]=useState(false);
 const current=useRef<FindState|null>(null);const acting=useRef(false);const fetching=useRef(false);const etag=useRef('');
 const take=useCallback((s:FindState)=>{if(s?.flow!=='find-v1')return;if(!current.current||s.v>=current.current.v){current.current=s;setState(s);}setConnected(true);setError('');},[]);
 useEffect(()=>{setSeat(readSeat(code));},[code]);
 const pull=useCallback(async()=>{const local=readSeat(code);if(!local||fetching.current)return;fetching.current=true;try{const r=await fetch('/api/find-room/'+code,{headers:{'x-find-seat':local.token,...playerHeaders(),...(etag.current?{'if-none-match':etag.current}:{})},cache:'no-store'});if(r.status===304){setConnected(true);setError('');return;}etag.current=r.headers.get('etag')||'';const d=await r.json();if(!r.ok)throw Error(d.error||'Could not reconnect');take(d);}catch(e){setConnected(false);setError(e instanceof Error?e.message:'Connection lost. Your picks remain saved.');}finally{fetching.current=false;}},[code,take]);
 useEffect(()=>{if(!seat)return;pull();const t=setInterval(()=>{if(document.visibilityState==='visible'&&current.current?.phase!=='done')pull();},2500);window.addEventListener('online',pull);window.addEventListener('focus',pull);return()=>{clearInterval(t);window.removeEventListener('online',pull);window.removeEventListener('focus',pull);};},[seat,pull]);
 const send=async(it:Action)=>{if(acting.current||!seat)return;acting.current=true;setBusy(true);try{const r=await fetch('/api/find-room/'+code,{method:'POST',headers:{'content-type':'application/json','x-find-seat':seat.token,...playerHeaders()},body:JSON.stringify({it})});const d=await r.json();if(!r.ok)throw Error(d.error||'Not saved. Please retry.');take(d);}catch(e){setError(e instanceof Error?e.message:'Not saved. Please retry.');}finally{acting.current=false;setBusy(false);}};
 return{seat,setSeat,state,send,error,busy,connected,pull};
}
