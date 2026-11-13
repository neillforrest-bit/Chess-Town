'use client';
import { useEffect, useState } from 'react';
import { poster } from '@/lib/game';
import {readSeat} from '@/lib/find/client';
import {playerHeaders} from '@/lib/find/player';
import type { FindMovie } from '@/lib/find/types';
import styles from './FindOurFilm.module.css';
type Meta={rt?:number|null;mc?:number|null;imdb?:number|null;awards?:string;error?:string};
const cache=new Map<number,Meta>();
export default function FindFilmCard({movie,save,saved,onDetails}:{movie:FindMovie;save?:()=>void;saved?:boolean;onDetails?:(open:boolean)=>void}){
 const [meta,setMeta]=useState<Meta>({}),[details,setDetails]=useState(false),[tab,setTab]=useState<'story'|'scores'|'awards'>('story'),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;setMeta(cache.get(movie.id)||{});const code=typeof location==='undefined'?'':location.pathname.split('/').pop()||'',seat=readSeat(code);if(!cache.has(movie.id))fetch('/api/find-meta',{method:'POST',headers:{'content-type':'application/json','x-find-seat':seat?.token||'',...playerHeaders()},signal:AbortSignal.timeout(12000),body:JSON.stringify({code,id:movie.id})}).then(r=>r.json()).then(d=>{if(!d.error)cache.set(movie.id,d);if(active)setMeta(d);}).catch(()=>{});return()=>{active=false;};},[movie.id,movie.t,movie.y]);
 useEffect(()=>{onDetails?.(details);return()=>onDetails?.(false);},[details,onDetails]);
 const chunks=(text:string,size=360)=>{const words=text.split(/\s+/),pages:string[]=[];let line='';for(const word of words){if(line.length+word.length>size&&line){pages.push(line);line='';}line+=(line?' ':'')+word;}if(line)pages.push(line);return pages.length?pages:['Unavailable'];};
 const paragraphs=tab==='story'?[...chunks(movie.o),...(movie.c?.length?chunks('Cast: '+movie.c.join(', ')):['Cast: Unavailable'])]:tab==='awards'?chunks(meta.awards||movie.aw||'No award information available. This does not mean the film won no awards.'):[];
 const rt=meta.rt??movie.rt,mc=meta.mc??movie.mc,imdb=meta.imdb??movie.imdb;
 const scores=<div className={styles.scores} aria-label="Movie review scores">{[['Rotten Tomatoes',rt==null?'Unavailable':rt+'%'],['Metacritic',mc==null?'Unavailable':mc+'/100'],['IMDb',imdb==null?'Unavailable':imdb.toFixed(1)+'/10'],['TMDB',movie.r?movie.r.toFixed(1)+'/10':'Unavailable']].map(([k,v])=><div key={k}><b className={v==='Unavailable'?styles.unavailable:undefined}>{v}</b><small>{k}</small></div>)}</div>;
 return <><article className={styles.card} aria-label={movie.t}>
 <div className={styles.cardTop}><img src={poster(movie,'w342')} alt={movie.t} draggable={false}/><div><h2>{movie.t}</h2><p>{movie.y}{movie.rn?' · '+movie.rn+' min':''}</p><p>{movie.g.join(' · ')}</p><p className={styles.cast}>{movie.c?.length?'Starring '+movie.c.slice(0,4).join(', '):'Cast information unavailable'}</p>{movie.lane==='stretch'&&<span className={styles.badge}>A stretch within your hard rules</span>}{movie.lane==='gem'&&<span className={styles.badge}>Less-seen candidate · audience score {movie.r}/10</span>}</div></div>
 {scores}<p className={styles.story}>{movie.o}</p>
 {movie.why?.length?<p className={styles.why}><b>WHY THIS CARD</b> {movie.why.join(' · ')} · {movie.source||'Existing catalogue'}</p>:<p className={styles.why}>{movie.source||'Existing catalogue'} · Fits your agreed wheel category and genre rules.</p>}
 <div className={styles.cardButtons}><button className="cs-btn" onClick={()=>{setTab('story');setPage(0);setDetails(true);}}>FULL DETAILS</button>{save&&<button className="cs-btn" aria-pressed={saved} onClick={save}>{saved?'SAVED ✓':'SAVE FOR LATER'}</button>}</div>
 </article>{details&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-label={'Details: '+movie.t}><div className={styles.sheet}><h2>{movie.t}</h2><div className={styles.tabs}>{(['story','scores','awards']as const).map(t=><button key={t} className="cs-btn" aria-pressed={tab===t} onClick={()=>{setTab(t);setPage(0);}}>{t==='story'?'SYNOPSIS':t==='scores'?'REVIEWS':'AWARDS'}</button>)}</div>{tab==='scores'?<>{scores}<p>Aggregate scores only. RT and Metacritic are critic aggregates; IMDb and TMDB are audience scores. Individual review text is unavailable.</p></>:<><p>{paragraphs[Math.min(page,paragraphs.length-1)]}</p>{paragraphs.length>1&&<div className={styles.roundNav}><button className="cs-btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button><span>{tab==='story'?'SYNOPSIS & CAST':'AWARDS'} {page+1}/{paragraphs.length}</span><button className="cs-btn" disabled={page>=paragraphs.length-1} onClick={()=>setPage(p=>p+1)}>›</button></div>}</>}<button className="cs-btn cs-btn--gold" onClick={()=>setDetails(false)}>BACK TO THE CARD</button></div></div>}</>;
}
