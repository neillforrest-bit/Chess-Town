'use client';
import {useEffect,useState} from 'react';
import {readSeat} from './client';
import {playerHeaders} from './player';
export type ReviewMeta={rt?:number|null;mc?:number|null;imdb?:number|null;awards?:string;error?:string;note?:string;loading?:boolean};
type Entry={value:ReviewMeta;listeners:Set<(m:ReviewMeta)=>void>;request?:Promise<void>};
const entries=new Map<string,Entry>();
function entry(code:string,id:number){const key=code+':'+id;let e=entries.get(key);if(!e){e={value:{loading:true},listeners:new Set()};entries.set(key,e);}return e;}
function emit(e:Entry,value:ReviewMeta){e.value=value;e.listeners.forEach(f=>f(value));}
function load(code:string,id:number,force=false){const e=entry(code,id);if(e.request||(!force&&!e.value.loading&&!e.value.error))return e.request;
 emit(e,{...e.value,error:undefined,loading:true});
 // Keep the request alive across card changes. Every mounted view hears its result.
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
 e.request=(async()=>{try{const r=await fetch('/api/find-meta',{method:'POST',headers:{'content-type':'application/json','x-find-seat':readSeat(code)?.token||'',...playerHeaders()},cache:'no-store',signal:controller.signal,body:JSON.stringify({code,id})});const d=await r.json();if(!r.ok||d.error)throw Error(d.error||'Review source unavailable.');emit(e,{...d,loading:false});}catch(err){emit(e,{loading:false,error:err instanceof Error&&err.name!=='AbortError'?err.message:'Review lookup timed out. Retry in Reviews; no score was guessed.'});}finally{clearTimeout(timer);e.request=undefined;}})();return e.request;
}
export function useFilmReviews(code:string,id:number){const [meta,setMeta]=useState<ReviewMeta>(()=>entry(code,id).value);useEffect(()=>{const e=entry(code,id);setMeta(e.value);e.listeners.add(setMeta);void load(code,id);return()=>{e.listeners.delete(setMeta);};},[code,id]);return {meta,retry:()=>load(code,id,true)};}
