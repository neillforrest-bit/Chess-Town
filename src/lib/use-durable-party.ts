'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {durableGameSession} from './durable-game-session';
import {createLogicChannel} from '@/games/logic/channel';
import {applyPartyAction,createParty,expireParty,makePartySeat,PARTY_LIMIT,partyContext,partyView,prepareParty,type PartyAction,type PartyRoom,type PartyView} from './trivia-party';
import {LOCAL_CATEGORIES} from './trivia-local';
import {loadTriviaSettings} from './trivia-settings';
type Saved={room:PartyRoom;tokens:[string,string][];seen:string[];serial:number;hashes:[string,string][];revoked:[string,string][]};
export function useDurableParty(roomId:string,isHost:boolean,creating:boolean){
 const [view,setView]=useState<PartyView|null>(null),[seatId,setSeatId]=useState(isHost?'host':''),[online,setOnline]=useState<string[]>([]),[busy,setBusy]=useState(false),[status,setStatus]=useState('Saving / opening your party invite...'),[error,setError]=useState(''),[stopped,setStopped]=useState(false),[expiry,setExpiry]=useState('');
 const actionRef=useRef<(body:PartyAction)=>void>(()=>{}),retryRef=useRef<()=>void>(()=>{});
 useEffect(()=>{
  let disposed=false,channel:ReturnType<typeof createLogicChannel>|undefined,session:Awaited<ReturnType<typeof durableGameSession<Saved>>>|undefined;
  let room:PartyRoom|null=null,local:PartyView|null=null,serial=0,accepted=-1,busyNow=false,joined=false,attempts=0,exhausted=false,transportSeat='';
  let helloTimer:ReturnType<typeof setTimeout>|undefined,tick:ReturnType<typeof setInterval>|undefined,sync:ReturnType<typeof setInterval>|undefined,queue=Promise.resolve();
  const hashes=new Map<string,string>(),revoked=new Map<string,string>();
  const releaseRevoked=()=>{for(const hash of revoked.values())void session?.releasePartySeat(hash).catch(e=>{if(!disposed)setError('Seat removed, but its reservation could not yet be freed. Reload before inviting a replacement.');});};
  const tokens=new Map<string,string>(),seen=new Set<string>(),pending=new Map<string,{body:PartyAction;context:string}>();let present:string[]=[];
  const live=()=>['host',...[...tokens].filter(([key])=>present.includes(key)).map(([,id])=>id)];
  const sendView=(to:string,ack?:string)=>{if(room&&tokens.has(to))channel?.send({type:'party-room',to,room:partyView(room,tokens.get(to)!),seatId:tokens.get(to),online:live(),busy:busyNow,serial,ack});};
  const publish=(save=true)=>{if(disposed||!room)return;serial=Math.max(serial+1,Date.now());if(save)void session?.save({room,tokens:[...tokens],seen:[...seen],serial,hashes:[...hashes],revoked:[...revoked]},room.phase==='lobby'?'waiting':room.phase==='finished'?'finished':'playing');local=partyView(room,'host');setView(local);setOnline(live());setBusy(busyNow);for(const key of tokens.keys())sendView(key);};
  const hostAction=(id:string,body:PartyAction,context:string,ack?:string,from?:string)=>{
   queue=queue.then(async()=>{if(disposed||!room)return;
    if(ack&&seen.has(ack)){if(from)sendView(from,ack);return;}
    if(context!==partyContext(room)||busyNow){if(from)sendView(from,ack);return;}
    if(ack){seen.add(ack);if(seen.size>2048)seen.delete(seen.values().next().value!);}
    try{
     if(body.start&&id==='host'&&(room.phase==='lobby'||room.phase==='intro')&&room.seats.some(s=>!live().includes(s.id)))throw Error('Wait for saved players to reconnect, or remove absent seats before preparing.');
     if(body.removeSeat&&id==='host'&&room.phase==='lobby'&&body.removeSeat!=='host')for(const[key,value]of tokens)if(value===body.removeSeat){tokens.delete(key);const hash=hashes.get(key);if(hash)revoked.set(key,hash);channel?.send({type:'party-error',to:key,terminal:true,message:'The host removed this lobby seat. Return to the pub door.'});}
     if(body.start&&id==='host'&&room.phase==='lobby'){busyNow=true;publish(false);try{const prepared=await prepareParty(room,id=>LOCAL_CATEGORIES.find(c=>c.id===id)?.name);if(disposed)return;room=prepared;}finally{busyNow=false;}}
     else if(body.ready!==undefined){let next=room;if(body.name)next=applyPartyAction(next,id,{name:body.name});if(body.categories)next=applyPartyAction(next,id,{categories:body.categories});room=applyPartyAction(next,id,{ready:body.ready});}
     else room=applyPartyAction(room,id,body);
     publish();if(body.removeSeat){await session?.flush();releaseRevoked();}if(from)sendView(from,ack);
    }catch(e){const message=e instanceof Error?e.message:'That action did not land.';if(id==='host')setError(message);else channel?.send({type:'party-error',to:from,message,ack});publish();}
   }).catch(()=>{if(!disposed)setError('The host could not apply that action.');});
  };
  const hello=()=>{if(disposed||isHost||joined||!channel?.hostSeat)return;if(helloTimer)clearTimeout(helloTimer);if(attempts++>=5){exhausted=true;setStopped(true);setError('Your seat is not confirmed. Retry when the host is online.');return;}channel.send({type:'party-hello',guestHash:session?.guestHash});helloTimer=setTimeout(()=>{helloTimer=undefined;hello();},3000);};
  void(async()=>{
   session=await durableGameSession<Saved>('trivia-party',roomId,'Party host',creating,()=>({room:createParty('host',loadTriviaSettings()),tokens:[],seen:[],serial:0,hashes:[],revoked:[]}),setError,setExpiry);
   if(disposed){session.stop();return;}if(session.isHost!==isHost)throw Error('Host identity changed. Reopen the same invite to recover.');transportSeat=session.seat;
   if(isHost){const saved=session.snapshot!;if(!saved.room?.seats?.some(s=>s.id==='host')||!Array.isArray(saved.tokens)||!Array.isArray(saved.seen))throw Error('This saved party could not be read. Nothing was reset.');room=saved.room;serial=saved.serial||0;for(const pair of saved.tokens)tokens.set(...pair);for(const pair of saved.hashes||[])hashes.set(...pair);for(const pair of saved.revoked||[])revoked.set(...pair);if(room.phase==='lobby')releaseRevoked();for(const id of saved.seen)seen.add(id);setSeatId('host');publish();}
   channel=createLogicChannel({namespace:'trivia-party',roomId,seatId:transportSeat,isHost,waitForHost:true,onStatus:setStatus,onError:setError,
    onOpen:()=>{if(isHost){setStatus('Saved party open. Invite up to four friends.');publish(false);}else{joined=false;attempts=0;exhausted=false;hello();}},
    onHostFound:()=>{if(!isHost){joined=false;attempts=0;exhausted=false;hello();}},
    onPresence:seats=>{const changed=present.join('|')!==seats.join('|');present=seats;if(isHost&&changed)publish(false);else if(!isHost&&!channel?.open){joined=false;setOnline([]);}},
    onMessage:m=>{if(disposed)return;if(isHost){if(!room)return;
     if(m.type==='party-hello'){
      if(revoked.has(m.from)){channel?.send({type:'party-error',to:m.from,terminal:true,message:'The host removed this saved seat. Ask the host for a new party if you should return.'});return;}if(typeof m.guestHash!=='string'||!/^[a-f0-9]{64}$/.test(m.guestHash))return;hashes.set(m.from,m.guestHash);
      let id=tokens.get(m.from);if(!id){if(busyNow||room.phase!=='lobby'||room.seats.length>=PARTY_LIMIT){channel?.send({type:'party-error',to:m.from,terminal:true,message:room.phase!=='lobby'?'This quiz has started. Only saved seats can return.':'This party has five players already.'});return;}id=crypto.randomUUID();tokens.set(m.from,id);room={...room,seats:[...room.seats,makePartySeat(id,'PLAYER '+(room.seats.length+1))]};}
      publish();return;
     }
     const id=tokens.get(m.from);if(!id)return;if(m.type==='party-sync'){sendView(m.from);return;}
     if(m.type==='party-action'&&typeof m.actionId==='string'&&m.actionId.length<=60&&typeof m.context==='string'&&m.body&&typeof m.body==='object')hostAction(id,m.body,m.context,m.actionId,m.from);
    }else if(m.from===channel?.hostSeat){
     if(m.type==='party-error'){if(m.ack)pending.delete(m.ack);setError(String(m.message));if(m.terminal){exhausted=true;setStopped(true);joined=false;setView(null);}return;}
     if(m.type==='party-room'&&m.room&&m.serial>=accepted){accepted=m.serial;joined=true;attempts=0;if(helloTimer)clearTimeout(helloTimer);helloTimer=undefined;local=m.room;setView(local);setSeatId(m.seatId);setOnline(m.online);setBusy(!!m.busy);setStatus('Connected to your saved party seat.');setError('');setStopped(false);if(m.ack)pending.delete(m.ack);for(const[id,item]of pending){if(item.context!==partyContext(local!))pending.delete(id);else channel?.send({type:'party-action',actionId:id,...item});}}
    }}
   });
   actionRef.current=body=>{setError('');if(isHost&&room)hostAction('host',body,partyContext(room));else if(local){const id=crypto.randomUUID(),context=partyContext(local);pending.set(id,{body,context});if(joined&&channel?.open)channel.send({type:'party-action',actionId:id,body,context});else setError('Your choice is waiting for a connection, not yet host-confirmed.');}};
   retryRef.current=()=>{setError('');setStopped(false);attempts=0;exhausted=false;joined=false;hello();};
   tick=setInterval(()=>{if(disposed||!isHost||!room||busyNow)return;queue=queue.then(()=>{if(disposed||!room||busyNow)return;const next=expireParty(room);if(next!==room){room=next;publish();}});},100);
   sync=setInterval(()=>{if(!isHost&&channel?.open&&!exhausted){if(joined)channel.send({type:'party-sync'});else if(!helloTimer)hello();}},5000);
  })().catch(e=>{if(!disposed)setError(e instanceof Error?e.message:'Saved party could not open.');});
  return()=>{disposed=true;if(helloTimer)clearTimeout(helloTimer);if(tick)clearInterval(tick);if(sync)clearInterval(sync);channel?.close();session?.stop();actionRef.current=()=>{};retryRef.current=()=>{};};
 },[roomId,isHost,creating]);
 const act=useCallback((body:PartyAction)=>actionRef.current(body),[]),retry=useCallback(()=>retryRef.current(),[]);
 return {view,seatId,online,busy,status,error,stopped,relay:null as boolean|null,act,retry,expiry};
}
