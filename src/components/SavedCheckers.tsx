'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {versionLink} from '@/lib/version-link';
import {hasHostIdentity} from '@/lib/durable-invites';
import {useDurableCheckers} from '@/lib/use-durable-checkers';
import {legalMoves,count,sqName} from '@/lib/checkers';
export function SavedCheckersEntry(){
 const [room,setRoom]=useState(''),[host,setHost]=useState(false),[creating,setCreating]=useState(false),[loaded,setLoaded]=useState(false);
 useEffect(()=>{const q=new URLSearchParams(location.search),id=q.get('room')||'';if(/^[a-z0-9-]{6,24}$/i.test(id)){setRoom(id);setHost(hasHostIdentity('checkers',id));}setLoaded(true);},[]);
 if(!loaded)return <main className="saved-ck"><p>Opening checkers...</p></main>;
 if(room)return <SavedCheckersTable roomId={room} isHost={host} creating={creating}/>;
 return <main className="saved-ck saved-ck-entry"><h1>Checkers with a friend</h1><p>Two phones, one saved board.</p><p>New invitations last seven days. You play Red. Your friend plays Black. Both can leave and return through the same link in the same browsers.</p><button onClick={()=>{const id=crypto.randomUUID().replaceAll('-','').slice(0,16);history.replaceState(null,'',versionLink('/play-checkers?mode=duel&durable=1&room='+id));setRoom(id);setHost(true);setCreating(true);}}>CREATE SAVED CHECKERS INVITE</button><Link href="/play-checkers">Chester or pass-and-play</Link></main>;
}
function SavedCheckersTable({roomId,isHost,creating}:{roomId:string;isHost:boolean;creating:boolean}){
 const {view,online,status,error,expiry,pending,stopped,act,retry}=useDurableCheckers(roomId,isHost,creating);
 const [selected,setSelected]=useState<number|null>(null),[copied,setCopied]=useState(false),[more,setMore]=useState(false),[pathChoice,setPathChoice]=useState<number[][]>([]);
 const role=isHost?'host':'guest',side=isHost?'r':'b',started=view?.ready.length===2,ready=view?.ready.includes(role),link=typeof location==='undefined'?'':versionLink(location.origin+'/play-checkers?mode=duel&durable=1&room='+roomId);
 const moves=view&&view.turn===side&&started&&online&&!pending&&!view.over?legalMoves(view.bd,view.turn):[];
 const tap=(i:number)=>{const options=moves.filter(m=>m.from===selected&&m.to===i);if(options.length===1){act('move',options[0].path);setSelected(null);setPathChoice([]);}else if(options.length>1)setPathChoice(options.map(m=>m.path));else{setSelected(moves.some(m=>m.from===i)?i:null);setPathChoice([]);}};
 const red=view?count(view.bd,'r'):null,black=view?count(view.bd,'b'):null;
 return <main className="saved-ck" data-plies={view?.plies}>
  <header><h1>Checkers</h1><Link href="/play-checkers">Menu</Link></header>
  <p role="status">{status}</p>{error&&<p role="alert">{error}</p>}
  {expiry&&<p className="saved-ck-expiry">Invite until {new Date(expiry).toLocaleDateString('en-GB')}. Keep this browser for your seat.</p>}
  {stopped&&<button onClick={retry}>RETRY SAVED SEAT</button>}
  {!view?<section><h2>{expiry?'Your place is saved':'Opening saved table'}</h2><p>The host may be away. This same link will reconnect when they return. No board has been reset.</p></section>:<>
   <div className="saved-ck-score"><b>Red {red!.men+red!.kings}</b><span>{view.plies} moves</span><b>Black {black!.men+black!.kings}</b></div>
   {!started?<section className="saved-ck-lobby"><h2>{isHost?'Your saved table':'Your saved Black seat'}</h2><p>{online?'Both players connected. Tap Ready on each phone.':'Waiting for the other player to return.'}</p>{isHost&&expiry&&<><input aria-label="Checkers invite link" value={link} readOnly onFocus={e=>e.target.select()}/><button onClick={()=>void navigator.clipboard?.writeText(link).then(()=>setCopied(true)).catch(()=>setCopied(false))}>{copied?'COPIED CHECKERS INVITE':'COPY CHECKERS INVITE'}</button></>}<p>Red: {view.ready.includes('host')?'Ready':'Not ready'} · Black: {view.ready.includes('guest')?'Ready':'Not ready'}</p><button disabled={!online||ready||pending} onClick={()=>act('ready')}>{ready?'READY · WAITING FOR PARTNER':'I AM READY'}</button><p>Forced captures and full multi-jumps. Crown ends the turn. No hints in a live game.</p></section>:<>
    <p className="saved-ck-turn">{view.over||(!online?'Partner away · board saved':pending?'Sending move · not confirmed yet':view.turn===side?'Your move · '+(side==='r'?'Red':'Black'):'Partner to move')}{moves[0]?.caps.length?' · Capture is forced':''}</p>
    <div className="saved-ck-board ck-board" role="group" aria-label="Checkers board">{Array.from({length:64},(_,index)=>{const i=isHost?index:63-index,p=view.bd[i],target=moves.some(m=>m.from===selected&&m.to===i);return <button key={i} aria-label={sqName(i)+' '+(p==='.'?'empty':p.toLowerCase()==='r'?'Red':'Black')+(p===p.toUpperCase()&&p!=='.'?' king':'')} disabled={!moves.length} onClick={()=>tap(i)} className={((i>>3)+(i%8))%2?'dark':'light'} data-selected={selected===i} data-target={target} data-last={view.last.includes(i)}>{p!=='.'&&<span className={'disc '+(p.toLowerCase()==='r'?'red':'black')}>{p===p.toUpperCase()?'♛':''}</span>}{target&&<i/>}</button>;})}</div>
    {pathChoice.length>1&&<div className="saved-ck-paths"><p>Choose the full jump route:</p>{pathChoice.map(path=><button key={path.join()} onClick={()=>{act('move',path);setPathChoice([]);setSelected(null);}}>{path.map(sqName).join(' > ')}</button>)}</div>}
    <p className="saved-ck-last">{view.log.at(-1)||'Red moves first.'}</p>
    {view.over&&<button disabled={!online||pending||view.rematch.includes(role)} onClick={()=>act('rematch')}>{view.rematch.includes(role)?'REMATCH REQUESTED · WAITING':'REQUEST REMATCH · BOTH MUST AGREE'}</button>}
   </>}
   <button className="saved-ck-details" onClick={()=>setMore(!more)}>{more?'CLOSE TABLE DETAILS':'INVITE & RULES'}</button>
   {more&&<div className="saved-ck-modal"><h2>Saved checkers table</h2><p>This invite lasts seven days from creation, not seven days per return. Both players use their original browsers. The URL does not grant host control. Active play needs both connected.</p><input aria-label="Saved checkers link" value={link} readOnly onFocus={e=>e.target.select()}/><button onClick={()=>void navigator.clipboard?.writeText(link).then(()=>setCopied(true))}>{copied?'COPIED':'COPY INVITE'}</button><p>American rules. Men move and capture forward. Kings move one square diagonally. Captures and full multi-jumps are forced; crowning ends the turn. Threefold repetition or 40 moves each without a capture or man move is a draw. Rematch requires both players.</p><button onClick={()=>setMore(false)}>BACK TO TABLE</button></div>}
  </>}
 </main>;
}
