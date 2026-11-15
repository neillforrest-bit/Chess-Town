import type {Machine} from '@/games/haywire/engine';
import {createMachine} from '@/games/haywire/engine';
import {hasHostIdentity,inviteIdentity,inviteWriter,recoverInviteJournal} from './durable-invites';
import {previewInviteStore as store,allowPreviewInvites} from './preview-invite-store';
type Saved={machine:Machine;seat:string;savedAt:number;remaining:number;swapRemaining:number};
export async function openDurableHaywire(roomId:string,name:string,create:boolean,onError:(s:string)=>void,onSaved:(date:string)=>void){
 if(!allowPreviewInvites())throw Error('Durable invites are available only on the testing preview.');
 const isHost=create||hasHostIdentity('haywire',roomId),secret=inviteIdentity('haywire',roomId,isHost?'host':'guest');
 const seatKey='gt-durable-haywire-seat:'+roomId+':'+(isHost?'host':'guest');let seat=localStorage.getItem(seatKey);if(!seat){seat=crypto.randomUUID();localStorage.setItem(seatKey,seat);}
 let machine:Machine|undefined,revision=0,expiresAt='';
 if(create){machine=createMachine(seat,name,crypto.getRandomValues(new Uint32Array(1))[0]%10000);const result=await store.create('haywire',roomId,secret,name.trim()||'Operator A',{machine,seat,savedAt:Date.now(),remaining:0,swapRemaining:0} satisfies Saved);revision=result.revision;expiresAt=result.expiresAt;}
 if(isHost){let restored=await store.restore<Saved>('haywire',roomId,secret);const pending=recoverInviteJournal<Saved>('haywire',roomId,restored);if(pending){const saved=await store.save('haywire',roomId,secret,restored.revision,pending.snapshot,pending.phase);if(saved.status==='conflict')throw Error('Another host tab changed this game. Reload to recover it.');restored={...restored,snapshot:pending.snapshot,revision:saved.revision};}if(!restored.snapshot?.machine||restored.snapshot.seat!==seat)throw Error('The saved host seat could not be recovered. Nothing was reset.');machine=restored.snapshot.machine;revision=restored.revision;expiresAt=restored.expiresAt;
  if(machine.phase==='run'){machine.deadline=Date.now()+restored.snapshot.remaining;machine.swapAt=Date.now()+restored.snapshot.swapRemaining;machine.seal={};machine.v++;}
 }else{const summary=await store.summary('haywire',roomId);if(summary.status!=='active')throw Error(summary.status==='expired'?'This seven-day invite has expired. Ask for a fresh one.':'This saved invite was not found.');const result=await store.wait('haywire',roomId,secret,name.trim()||'Operator B');expiresAt=result.expiresAt!;}
 onSaved(expiresAt);
 const writer=isHost?inviteWriter<Saved>(store,'haywire',roomId,secret,revision,onError,onSaved):null;
 return {isHost,seat,machine,expiresAt,save:(value:Machine)=>writer?.save({machine:value,seat,savedAt:Date.now(),remaining:Math.max(0,value.deadline-Date.now()),swapRemaining:Math.max(0,value.swapAt-Date.now())},value.phase==='lobby'||value.phase==='read'?'waiting':value.phase==='finished'?'finished':'playing'),stop:()=>writer?.stop(),flush:()=>writer?.flush()};
}
