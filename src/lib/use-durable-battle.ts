'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {durableGameSession} from './durable-game-session';
import {createLogicChannel} from '@/games/logic/channel';
import {newBattleSaved,validBattleSaved,battlePatch,foldBattle,type BattleSaved,type Synced} from './durable-battle';
type Action={id:string;rev:number;patch?:Partial<Synced>;ready?:boolean;name?:string;fid?:string};
export function useDurableBattle(roomId:string,enabled:boolean,isHost:boolean,creating:boolean){
 const [view,setView]=useState<BattleSaved|null>(null),[online,setOnline]=useState(false),[status,setStatus]=useState('Saving / opening arena...'),[error,setError]=useState(''),[storageError,setStorageError]=useState(''),[expiry,setExpiry]=useState(''),[pending,setPending]=useState(false);
 const actionRef=useRef<(a:Omit<Action,'id'|'rev'>)=>void>(()=>{}),chitRef=useRef<(p:any)=>void>(()=>{}),[chit,setChit]=useState<any>(null);
 useEffect(()=>{
  if(!enabled)return;let disposed=false,failed=false,room:BattleSaved|null=null,local:BattleSaved|null=null,accepted=-1,joined=false,attempts=0;let live:string[]=[];
  const fighter=localStorage.getItem('ct-fighter-id')||crypto.randomUUID();localStorage.setItem('ct-fighter-id',fighter);
  let channel:ReturnType<typeof createLogicChannel>|undefined,session:Awaited<ReturnType<typeof durableGameSession<BattleSaved>>>|undefined,timer:ReturnType<typeof setTimeout>|undefined,sync:ReturnType<typeof setInterval>|undefined,tick:ReturnType<typeof setInterval>|undefined;
  const waiting=new Map<string,Action>();const both=()=>!!room?.guest&&live.includes(room.guest);
  const send=(ack?:string)=>{if(room?.guest)channel?.send({type:'arena-view',to:room.guest,state:room,online:both(),ack});};
  const publish=(save=true)=>{if(disposed||!room)return;room={...room,serial:Math.max(room.serial+1,Date.now())};if(save)void session?.save(room,room.state.result?'finished':room.ready.length===2?'playing':'waiting');local=room;setView(room);setOnline(both());send();};
  const act=(seat:0|1,a:Action)=>{if(failed||!room||!a||typeof a.id!=='string'||a.id.length>60||!Number.isSafeInteger(a.rev)||a.name!==undefined&&typeof a.name!=='string'||a.patch!==undefined&&(!a.patch||typeof a.patch!=='object'||Array.isArray(a.patch)))return;if(room.seen.includes(a.id)){send(a.id);return;}
   let next=room;if(a.fid&&(typeof a.fid!=='string'||a.fid.length>64))return;if(a.name){const name=a.name.replace(/[^\p{L}\p{N} '.-]/gu,'').trim().slice(0,18)||'PLAYER';next={...room,...(seat===0?{hostName:name,hostFid:a.fid||room.hostFid}:{guestName:name,guestFid:a.fid||room.guestFid})};}
   if(a.ready&&both()&&!room.state.pgn&&!room.state.result)next={...next,ready:[...new Set([...room.ready,seat])]};
   else if(a.patch&&both()&&room.ready.length===2&&a.rev===room.state.rev)next=battlePatch(room,seat,a.patch);
   if(next!==room){room={...next,seen:[...room.seen.slice(-2047),a.id]};publish();}send(a.id);
  };
  const hello=()=>{if(disposed||isHost||joined||!channel?.hostSeat)return;if(timer)clearTimeout(timer);if(attempts++>=5){setError('Saved seat not confirmed. Reopen this link when the host is back.');return;}channel.send({type:'arena-hello'});timer=setTimeout(()=>{timer=undefined;hello();},3000);};
  void(async()=>{
   session=await durableGameSession<BattleSaved>('chess','arena-'+roomId,'Arena host',creating,()=>newBattleSaved(),message=>{failed=true;setStorageError(message);},setExpiry);
   if(disposed){session.stop();return;}if(session.isHost!==isHost)throw Error('Host identity changed. Reopen this invite.');if(isHost){if(!validBattleSaved(session.snapshot!))throw Error('Saved arena unreadable. Nothing was reset.');room=session.snapshot!;const settled=foldBattle(room,Date.now());if(settled.result!==room.state.result){settled.rev++;room={...room,state:settled,at:Date.now()};}publish();}
   channel=createLogicChannel({namespace:'saved-arena',roomId,seatId:session.seat,isHost,waitForHost:true,onStatus:setStatus,onError:setError,
    onOpen:()=>{if(isHost){setStatus('Saved arena open.');publish(false);}else{joined=false;attempts=0;hello();}},onHostFound:()=>{if(!isHost){joined=false;attempts=0;hello();}},onPresence:seats=>{const changed=seats.join('|')!==live.join('|');live=seats;if(isHost&&changed)publish(false);else if(!isHost&&!channel?.open){joined=false;setOnline(false);}},
    onMessage:m=>{if(disposed)return;if(isHost){if(!room)return;if(m.type==='arena-hello'){if(room.guest&&room.guest!==m.from){channel?.send({type:'arena-error',to:m.from,message:'Both arena seats are already saved.'});return;}if(!room.guest){room={...room,guest:m.from};publish();}else send();return;}if(m.from!==room.guest)return;if(m.type==='arena-sync')send();if(m.type==='arena-action')act(1,m.action);if(m.type==='arena-chit'){setChit(m.payload);channel?.send({type:'arena-chit',to:room.guest,payload:m.payload});}}
    else if(m.from===channel?.hostSeat){if(m.type==='arena-error'){setError(String(m.message));return;}if(m.type==='arena-chit'){setChit(m.payload);return;}if(m.type==='arena-view'&&validBattleSaved(m.state)&&m.state.serial>=accepted){accepted=m.state.serial;local=m.state;joined=true;attempts=0;if(timer)clearTimeout(timer);timer=undefined;setView(local);setOnline(!!m.online);setStatus('Connected to your saved arena seat.');setError('');if(m.ack)waiting.delete(m.ack);for(const[id,a]of waiting){if(local!.seen.includes(id)||a.patch&&a.rev!==local!.state.rev)waiting.delete(id);else channel?.send({type:'arena-action',action:a});}setPending(waiting.size>0);}}
    }
   });
   actionRef.current=value=>{if(!local||failed)return;setError('');if(value.name)localStorage.setItem('ct-fighter-name',value.name);const action={...value,...(value.ready||value.name?{fid:fighter,name:value.name||localStorage.getItem('ct-fighter-name')||(isHost?local.hostName:local.guestName)}:{}),id:crypto.randomUUID(),rev:local.state.rev};if(isHost)act(0,action);else{waiting.set(action.id,action);setPending(true);channel?.send({type:'arena-action',action});}};
   chitRef.current=payload=>{if(isHost&&room?.guest)channel?.send({type:'arena-chit',to:room.guest,payload});else channel?.send({type:'arena-chit',payload});};
   sync=setInterval(()=>{if(!isHost&&channel?.open){if(joined)channel.send({type:'arena-sync'});else if(!timer&&attempts<5)hello();}},5000);
   tick=setInterval(()=>{if(!isHost||!room||failed)return;const state=foldBattle(room,Date.now());if(state.result!==room.state.result){state.rev++;room={...room,state,at:Date.now()};publish();}},100);
  })().catch(e=>{if(!disposed)setError(e instanceof Error?e.message:'Saved arena could not open.');});
  return()=>{disposed=true;if(timer)clearTimeout(timer);if(sync)clearInterval(sync);if(tick)clearInterval(tick);channel?.close();session?.stop();actionRef.current=()=>{};};
 },[roomId,enabled,isHost,creating]);
 return {view,online:online&&!storageError,status,error:storageError||error,expiry,pending,chit,act:useCallback((a:Omit<Action,'id'|'rev'>)=>actionRef.current(a),[]),sendChit:useCallback((p:any)=>chitRef.current(p),[])};
}
