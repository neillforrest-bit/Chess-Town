import {hasHostIdentity,inviteIdentity,inviteWriter,type InviteGame} from './durable-invites';
import {previewInviteStore as store,allowPreviewInvites} from './preview-invite-store';
export async function durableGameSession<T>(game:InviteGame,room:string,name:string,create:boolean,initial:(seat:string)=>T,onError:(s:string)=>void,onSaved:(date:string)=>void){
 if(!allowPreviewInvites())throw Error('Saved invites are available only on the testing preview.');
 const isHost=create||hasHostIdentity(game,room),secret=inviteIdentity(game,room,isHost?'host':'guest');
 const seatKey='gt-durable-seat:'+game+':'+room+':'+(isHost?'host':'guest');let seat=localStorage.getItem(seatKey);if(!seat){seat=crypto.randomUUID().replace(/-/g,'');localStorage.setItem(seatKey,seat);}
 let revision=0,snapshot:T|undefined,expiresAt='';
 if(create){const r=await store.create(game,room,secret,name.trim()||'Host',initial(seat));revision=r.revision;expiresAt=r.expiresAt;}
 if(isHost){const r=await store.restore<T>(game,room,secret);snapshot=r.snapshot;revision=r.revision;expiresAt=r.expiresAt;}
 else{const summary=await store.summary(game,room);if(summary.status!=='active')throw Error(summary.status==='expired'?'This seven-day invite has expired. Ask for a fresh one.':'This saved invite was not found.');const r=await store.wait(game,room,secret,name.trim()||'Guest');expiresAt=r.expiresAt!;}
 onSaved(expiresAt);const writer=isHost?inviteWriter<T>(store,game,room,secret,revision,onError,onSaved):null;
 return {isHost,seat,snapshot,expiresAt,save:(value:T,phase:'waiting'|'playing'|'finished')=>writer?.save(value,phase),flush:()=>writer?.flush(),stop:()=>writer?.stop()};
}
