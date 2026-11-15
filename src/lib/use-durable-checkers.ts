'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {durableGameSession} from './durable-game-session';
import {createLogicChannel} from '@/games/logic/channel';
import {newSavedCheckers,validSavedCheckers,checkersAction,type SavedCheckers,type CheckersAction} from './durable-checkers';
export function useDurableCheckers(roomId:string,isHost:boolean,creating:boolean){
 const [view,setView]=useState<SavedCheckers|null>(null),[online,setOnline]=useState(false),[status,setStatus]=useState('Saving / opening your invite...'),[error,setError]=useState(''),[expiry,setExpiry]=useState(''),[pending,setPending]=useState(false),[stopped,setStopped]=useState(false),[storageError,setStorageError]=useState('');
 const actionRef=useRef<(type:CheckersAction['type'],path?:number[])=>void>(()=>{}),retryRef=useRef<()=>void>(()=>{});
 useEffect(()=>{
  let storageFailed=false;setStorageError('');
  let disposed=false,channel:ReturnType<typeof createLogicChannel>|undefined,session:Awaited<ReturnType<typeof durableGameSession<SavedCheckers>>>|undefined;
  let room:SavedCheckers|null=null,local:SavedCheckers|null=null,accepted=-1,joined=false,attempts=0,exhausted=false,live:string[]=[];
  let helloTimer:ReturnType<typeof setTimeout>|undefined,sync:ReturnType<typeof setInterval>|undefined;
  const waiting=new Map<string,CheckersAction>();
  const connected=()=>!!room?.guest&&live.includes(room.guest);
  const send=(ack?:string)=>{if(room?.guest)channel?.send({type:'ck-view',to:room.guest,state:room,ack,connected:connected()});};
  const publish=(save=true)=>{if(disposed||!room)return;room={...room,serial:Math.max(room.serial+1,Date.now())};if(save)void session?.save(room,room.over?'finished':room.ready.length===2?'playing':'waiting');local=room;setView(room);setOnline(connected());send();};
  const hostAction=(role:'host'|'guest',a:CheckersAction)=>{if(storageFailed||!room||!a||typeof a.id!=='string')return;if(!connected()){setError('Wait for both saved players to reconnect.');return;}const next=checkersAction(room,role,a);if(next!==room){room=next;publish();}send(a.id);};
  const hello=()=>{if(disposed||isHost||joined||!channel?.hostSeat)return;if(helloTimer)clearTimeout(helloTimer);if(attempts++>=5){exhausted=true;setStopped(true);setError('Your seat is not confirmed. Retry when the host returns.');return;}channel.send({type:'ck-hello'});helloTimer=setTimeout(()=>{helloTimer=undefined;hello();},3000);};
  void(async()=>{
   session=await durableGameSession<SavedCheckers>('checkers',roomId,'Red player',creating,()=>newSavedCheckers(),message=>{storageFailed=true;setStorageError(message);},setExpiry);
   if(disposed){session.stop();return;}if(session.isHost!==isHost)throw Error('Host identity changed. Reopen this same invite.');
   if(isHost){if(!validSavedCheckers(session.snapshot!))throw Error('This saved board could not be read. Nothing was reset.');room=session.snapshot!;publish();}
   channel=createLogicChannel({namespace:'saved-checkers',roomId,seatId:session.seat,isHost,waitForHost:true,onError:setError,onStatus:setStatus,
    onOpen:()=>{if(isHost){setStatus('Saved checkers table open. Send the invite.');publish(false);}else{joined=false;attempts=0;exhausted=false;hello();}},
    onHostFound:()=>{if(!isHost){joined=false;attempts=0;exhausted=false;hello();}},
    onPresence:seats=>{const changed=seats.join('|')!==live.join('|');live=seats;if(isHost&&changed)publish(false);else if(!isHost&&!channel?.open){joined=false;setOnline(false);}},
    onMessage:m=>{if(disposed)return;if(isHost){if(!room)return;
     if(m.type==='ck-hello'){if(room.guest&&room.guest!==m.from){channel?.send({type:'ck-error',to:m.from,message:'The Black seat is already saved to another browser.',terminal:true});return;}if(!room.guest){room={...room,guest:m.from};publish();}else send();return;}
     if(m.from!==room.guest)return;if(m.type==='ck-sync'){send();return;}if(m.type==='ck-action')hostAction('guest',m.action);
    }else if(m.from===channel?.hostSeat){
     if(m.type==='ck-error'){setError(String(m.message));if(m.terminal){setStopped(true);exhausted=true;}return;}
     if(m.type==='ck-view'&&validSavedCheckers(m.state)&&m.state.serial>=accepted){accepted=m.state.serial;local=m.state;joined=true;attempts=0;setView(local);setOnline(!!m.connected);setStatus('Connected to your saved Black seat.');setError('');setStopped(false);if(helloTimer)clearTimeout(helloTimer);helloTimer=undefined;if(m.ack)waiting.delete(m.ack);for(const[id,a]of waiting){if(a.gameId!==local!.gameId||a.plies!==local!.plies||local!.seen.includes(id))waiting.delete(id);else channel?.send({type:'ck-action',action:a});}setPending(waiting.size>0);}
    }}
   });
   actionRef.current=(type,path)=>{setError('');if(!local)return;const action:CheckersAction={id:crypto.randomUUID(),type,path,gameId:local.gameId,plies:local.plies};if(isHost)hostAction('host',action);else{waiting.set(action.id,action);setPending(true);channel?.send({type:'ck-action',action});}};
   retryRef.current=()=>{setError('');setStopped(false);attempts=0;exhausted=false;joined=false;hello();};
   sync=setInterval(()=>{if(!isHost&&channel?.open&&!exhausted){if(joined)channel.send({type:'ck-sync'});else if(!helloTimer)hello();}},5000);
  })().catch(e=>{if(!disposed)setError(e instanceof Error?e.message:'The saved table could not open.');});
  return()=>{disposed=true;if(helloTimer)clearTimeout(helloTimer);if(sync)clearInterval(sync);channel?.close();session?.stop();actionRef.current=()=>{};};
 },[roomId,isHost,creating]);
 return {view,online:online&&!storageError,status,error:storageError||error,expiry,pending,stopped,act:useCallback((type:CheckersAction['type'],path?:number[])=>actionRef.current(type,path),[]),retry:useCallback(()=>retryRef.current(),[])};
}
