'use client';
import { useEffect, useState } from 'react';
import { poster } from '@/lib/game';
import type { FindMovie } from '@/lib/find/types';
import styles from './FindOurFilm.module.css';
type Meta={rt?:number|null;mc?:number|null;imdb?:number|null;awards?:string;error?:string};
const cache=new Map<number,Meta>();
export default function FindFilmCard({movie,save,saved,onDetails}:{movie:FindMovie;save?:()=>void;saved?:boolean;onDetails?:(open:boolean)=>void}){
 const [meta,setMeta]=useState<Meta>({}),[details,setDetails]=useState(false),[tab,setTab]=useState<'story'|'scores'|'awards'>('story');
 useEffect(()=>{let active=true;setMeta(cache.get(movie.id)||{});if(!cache.has(movie.id))fetch('/api/omdb',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imdb:movie.im,t:movie.t,y:movie.y,full:1})}).then(r=>r.json()).then(d=>{cache.set(movie.id,d);if(active)setMeta(d);}).catch(()=>{});return()=>{active=false;};},[movie.id,movie.t,movie.y]);
 useEffect(()=>{onDetails?.(details);return()=>onDetails?.(false);},[details,onDetails]);
 const rt=meta.rt??movie.rt,mc=meta.mc??movie.mc,imdb=meta.imdb??movie.imdb;
 const scores=<div className={styles.scores} aria-label="Movie review scores">{[['Rotten Tomatoes',rt==null?'Unavailable':rt+'%'],['Metacritic',mc==null?'Unavailable':mc+'/100'],['IMDb',imdb==null?'Unavailable':imdb.toFixed(1)+'/10'],['TMDB',movie.r?movie.r.toFixed(1)+'/10':'Unavailable']].map(([k,v])=><div key={k}><b className={v==='Unavailable'?styles.unavailable:undefined}>{v}</b><small>{k}</small></div>)}</div>;
 return <><article className={styles.card} aria-label={movie.t}>
 <div className={styles.cardTop}><img src={poster(movie,'w342')} alt={movie.t} draggable={false}/><div><h2>{movie.t}</h2><p>{movie.y}{movie.rn?' · '+movie.rn+' min':''}</p><p>{movie.g.join(' · ')}</p><p className={styles.cast}>{movie.c?.length?'Starring '+movie.c.slice(0,4).join(', '):'Cast information unavailable'}</p>{movie.lane==='stretch'&&<span className={styles.badge}>A stretch within your hard rules</span>}{movie.lane==='gem'&&<span className={styles.badge}>Less-seen candidate · audience score {movie.r}/10</span>}</div></div>
 {scores}<p className={styles.story}>{movie.o}</p>
 {movie.why?.length?<p className={styles.why}><b>WHY THIS CARD</b> {movie.why.join(' · ')} · {movie.source||'Existing catalogue'}</p>:<p className={styles.why}>{movie.source||'Existing catalogue'} · Fits your agreed wheel category and genre rules.</p>}
 <div className={styles.cardButtons}><button className="cs-btn" onClick={()=>setDetails(true)}>FULL DETAILS</button>{save&&<button className="cs-btn" aria-pressed={saved} onClick={save}>{saved?'SAVED ✓':'SAVE FOR LATER'}</button>}</div>
 </article>{details&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-label={'Details: '+movie.t}><div className={styles.sheet}><h2>{movie.t}</h2><div className={styles.tabs}>{(['story','scores','awards']as const).map(t=><button key={t} className="cs-btn" aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='story'?'SYNOPSIS':t==='scores'?'REVIEWS':'AWARDS'}</button>)}</div>{tab==='story'?<><p>{movie.o}</p><p>Cast: {movie.c?.join(', ')||'Unavailable'}</p></>:tab==='scores'?<>{scores}<p>These are aggregate scores, not quotes from individual critics. Rotten Tomatoes and Metacritic measure different things from IMDb and TMDB audience ratings. Individual review text is not available on this card.</p></>:<p>{meta.awards||movie.aw||'No award information available. This does not mean the film won no awards.'}</p>}<button className="cs-btn cs-btn--gold" onClick={()=>setDetails(false)}>BACK TO THE CARD</button></div></div>}</>;
}
