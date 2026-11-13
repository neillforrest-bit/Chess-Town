'use client';
import { useCallback, useEffect, useState } from 'react';
import {identityRequest} from './identity-request';
const randomSecret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
export type Player={id:string;username:string;token:string};
const KEY='gametown-player-v1';
export function readPlayer():Player|null{try{const p=JSON.parse(localStorage.getItem(KEY)||'null');return p?.id&&p?.username&&/^[a-f0-9]{64}$/.test(p.token)?p:null;}catch{return null;}}
export function playerHeaders(){return {'x-find-player':readPlayer()?.token||''};}
export function usePlayer(){const [player,setPlayer]=useState<Player|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const retry=useCallback(()=>{setError('');setLoading(true);const p=readPlayer();if(!p){setLoading(false);return;}setPlayer(p);identityRequest({headers:{'x-find-player':p.token}}).then(d=>{const next={...p,id:d.id,username:d.username};localStorage.setItem(KEY,JSON.stringify(next));setPlayer(next);}).catch(e=>setError(e.message||'Could not verify your remembered player.')).finally(()=>setLoading(false));},[]);useEffect(()=>{retry();},[retry]);
 const claim=async(username:string)=>{if(busy)return null;setBusy(true);setError('');try{let token=localStorage.getItem('gametown-player-pending');if(!token){token=randomSecret();localStorage.setItem('gametown-player-pending',token);}const d=await identityRequest({method:'POST',headers:{'content-type':'application/json','x-find-player':token},body:JSON.stringify({username})});const p={id:d.id,username:d.username,token};localStorage.setItem(KEY,JSON.stringify(p));localStorage.removeItem('gametown-player-pending');setPlayer(p);return p;}catch(e){setError(e instanceof Error?e.message:'Could not save a username on this device.');return null;}finally{setBusy(false);}};
 return{player,loading,error,busy,claim,retry};
}
