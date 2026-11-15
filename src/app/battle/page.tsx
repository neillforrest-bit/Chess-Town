'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {durableGameSession} from '@/lib/durable-game-session';
import {newBattleSaved} from '@/lib/durable-battle';
export default function BattleEntry(){const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('');return <main className="saved-ck saved-ck-entry"><h1>The saved arena</h1><p>Ten-minute chess, full battle commentary and wildcards. Two phones, one saved match.</p><p>Your invite lasts seven days. The host can leave and return in the same browser. Once play starts, clocks keep running while away. Both fighters tap Ready before the board opens.</p>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>{setBusy(true);const id=crypto.randomUUID().replaceAll('-','').slice(0,16);void durableGameSession('chess','arena-'+id,'Arena host',true,()=>newBattleSaved(),setError,()=>{}).then(s=>{s.stop();router.replace('/battle/'+id+'?durable=1');}).catch(e=>{setError(e instanceof Error?e.message:'Invite could not save.');setBusy(false);});}}>{busy?'SAVING ARENA...':'CREATE SAVED ARENA'}</button><a href="/?choose=mode&town=chess">Chess Town</a></main>;}
