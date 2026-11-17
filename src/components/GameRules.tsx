'use client';
import {useState,ReactNode} from 'react';
export type GameRule={title:string;body:string;doNow:string};
/** Paged rule and explicit readiness pattern extracted from Movie Town BracketPage.
 * Rules stay game-specific; no timer starts or game action runs before onReady.
 */
export default function GameRules({rules,onReady,readyLabel='GOT IT / READY TO PLAY',className='',renderExtra}:{rules:GameRule[];onReady:()=>void;readyLabel?:string;className?:string;renderExtra?:(page:number)=>ReactNode}){
 const [page,setPage]=useState(0);const rule=rules[page];
 return <section className={'game-rules '+className} aria-label="Game rules"><span className="game-rules-count">RULE {page+1} / {rules.length}</span><h2>{rule.title}</h2><p>{rule.body}</p>{renderExtra?.(page)}<div className="game-rules-do"><b>YOUR ACTION</b><p>{rule.doNow}</p></div><div className="game-rules-nav"><button aria-label="Previous rule" disabled={page===0} onClick={()=>setPage(v=>v-1)}>‹ BACK</button>{page<rules.length-1?<button aria-label="Next rule" onClick={()=>setPage(v=>v+1)}>NEXT RULE →</button>:<button onClick={onReady}>{readyLabel}</button>}</div></section>
}
