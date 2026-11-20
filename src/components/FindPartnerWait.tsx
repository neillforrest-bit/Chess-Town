'use client';
import {useEffect,useState} from 'react';
import styles from './FindOurFilm.module.css';
export default function FindPartnerWait({name,waitKey,reason,connected}:{name:string;waitKey:string;reason:string;connected:boolean}){
 const [since,setSince]=useState(Date.now()),[now,setNow]=useState(Date.now());
 useEffect(()=>{const key='cs-find-wait:'+waitKey;let start=Date.now();try{const saved=Number(sessionStorage.getItem(key));if(saved>0&&saved<=start)start=saved;else sessionStorage.setItem(key,String(start));}catch{}setSince(start);setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[waitKey]);
 const seconds=Math.max(0,Math.floor((now-since)/1000)),elapsed=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 return <div className={styles.partnerWait} role="status" aria-live="off" data-wait-key={waitKey}><span className={connected?styles.thinkingDot:styles.offlineDot} aria-hidden="true"/><div><b>{connected?(reason==='joining the room'?'Waiting for '+name+' to join':name+' is thinking...'):'Reconnecting to the room...'}</b><small>{connected?reason:'Last seen: '+name+' was '+reason} · waiting {elapsed}</small></div></div>;
}
