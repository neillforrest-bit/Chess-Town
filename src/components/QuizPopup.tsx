'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

// Presentation only: both phones open the same shared phase. No clock or turn changes.
export function QuizGamePanel({popup=false,title='Flash finale',score='',className='',children}:{popup?:boolean;title?:string;score?:string;className?:string;children:ReactNode}){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{if(!popup)return;const previous=document.activeElement as HTMLElement|null;ref.current?.focus({preventScroll:true});return()=>previous?.focus?.({preventScroll:true});},[popup]);
 return <section ref={ref} className={className+(popup?' quiz-game-popup':'')} role={popup?'dialog':undefined} aria-modal={popup||undefined} aria-label={popup?title:undefined} tabIndex={popup?-1:undefined} onKeyDown={e=>{if(!popup||e.key!=='Tab')return;const nodes=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],select,input')||[]).filter(x=>x.getClientRects().length);if(!nodes.length){e.preventDefault();return;}const first=nodes[0],last=nodes.at(-1)!;if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}>{popup&&<header className="quiz-game-popup__head"><b>{title}</b><span>{score}</span></header>}{children}</section>;
}

export function QuizWildcardPicker({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0);const trigger=useRef<HTMLButtonElement>(null);
 const close=()=>{setOpen(false);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));};
 return <><button ref={trigger} type="button" className="quiz-wildcards-open" onClick={()=>{setPage(0);setOpen(true);}} aria-haspopup="dialog" aria-expanded={open}>WILDCARDS · OPEN YOUR HAND</button>{open&&<QuizGamePanel popup title="Your wildcards" className={"quiz-wildcard-popup quiz-wildcard-page-"+page}><button className="quiz-popup-close" onClick={close}>BACK TO QUESTION ×</button><div className="quiz-wildcard-popup__cards" onClick={e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('.trivia-wildcard');if(button&&!button.disabled)close();}} onKeyDown={e=>{if(e.key==='Escape')close();}}>{children}</div><nav className="quiz-wildcard-pager" aria-label="Wildcard pages"><button disabled={!page} onClick={()=>setPage(0)}>PREVIOUS</button><span>{page+1} / 2</span><button disabled={page===1} onClick={()=>setPage(1)}>MORE CARDS</button></nav><p className="quiz-popup-note">Your question timer keeps running. Card effects follow the same rules for everyone.</p></QuizGamePanel>}</>;
}
