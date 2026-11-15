// Preview-only invite persistence. Configure a dedicated preview database, never the live game's database.
export type InviteGame='haywire'|'logic'|'trivia-duel'|'trivia-party'|'checkers'|'chess'|'movies';
export type InvitePhase='waiting'|'playing'|'finished';
export type InviteSummary={status:'active'|'expired'|'not-found';game?:InviteGame;roomId?:string;hostName?:string;phase?:InvitePhase;expiresAt?:string;hostSeenAt?:string;waitingCount?:number};
type HostResult<T>={status:'saved'|'conflict';revision:number;snapshot:T;expiresAt:string;waitingGuests:{name:string;joinedAt:string}[]};
type Config={url:string;key:string;fetcher?:typeof fetch};
const PREFIX='gt-durable-invite-v1:';
export class InviteStorageError extends Error{}
export function inviteSecret(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function inviteIdentity(game:InviteGame,room:string,role:'host'|'guest',storage:Storage=localStorage):string{
 const key=PREFIX+game+':'+room+':'+role;const existing=storage.getItem(key);if(existing&&/^[a-f0-9]{64}$/.test(existing))return existing;
 const token=inviteSecret();storage.setItem(key,token);return token;
}
export function hasHostIdentity(game:InviteGame,room:string,storage:Storage=localStorage){try{return /^[a-f0-9]{64}$/.test(storage.getItem(PREFIX+game+':'+room+':host')||'');}catch{return false;}}
export function createInviteStore(config:Config){
 const fetcher=config.fetcher||fetch;
 const rpc=async<T>(name:string,body:Record<string,unknown>):Promise<T>=>{
  if(!config.url||!config.key)throw new InviteStorageError('Long-lasting invites are unavailable. No invite has been saved.');
  let response:Response;try{response=await fetcher(config.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});}catch{throw new InviteStorageError('Invite storage did not answer. Keep this screen open and retry.');}
  const value=await response.json().catch(()=>null);if(!response.ok)throw new InviteStorageError(typeof value?.message==='string'?value.message:'Could not save this invite.');return value as T;
 };
 return {
  create:<T>(game:InviteGame,room:string,secret:string,name:string,snapshot:T)=>rpc<{game:InviteGame;roomId:string;revision:number;expiresAt:string}>('preview_invite_create_v1',{p_game:game,p_room:room,p_secret:secret,p_name:name,p_snapshot:snapshot}),
  summary:(game:InviteGame,room:string)=>rpc<InviteSummary>('preview_invite_summary_v1',{p_game:game,p_room:room}),
  wait:(game:InviteGame,room:string,secret:string,name:string)=>rpc<InviteSummary>('preview_invite_wait_v1',{p_game:game,p_room:room,p_secret:secret,p_name:name}),
  restore:<T>(game:InviteGame,room:string,secret:string)=>rpc<HostResult<T>>('preview_invite_host_v1',{p_game:game,p_room:room,p_secret:secret}),
  save:<T>(game:InviteGame,room:string,secret:string,revision:number,snapshot:T,phase:InvitePhase)=>rpc<HostResult<T>>('preview_invite_host_v1',{p_game:game,p_room:room,p_secret:secret,p_expected:revision,p_snapshot:snapshot,p_phase:phase}),
  remove:(game:InviteGame,room:string,secret:string)=>rpc<boolean>('preview_invite_delete_v1',{p_game:game,p_room:room,p_secret:secret})
 };
}
export type InviteStore=ReturnType<typeof createInviteStore>;
// Serializes host writes and stops on revision conflict. Never overwrites another host tab's newer game.
export function inviteWriter<T>(store:InviteStore,game:InviteGame,room:string,secret:string,revision:number,onError:(message:string)=>void,onSaved:(expiresAt:string)=>void){
 let nextRevision=revision,stopped=false,chain=Promise.resolve();
 return {save:(snapshot:T,phase:InvitePhase)=>{
  const frozen=JSON.parse(JSON.stringify(snapshot)) as T;
  chain=chain.then(async()=>{if(stopped)return;try{const result=await store.save(game,room,secret,nextRevision,frozen,phase);if(result.status==='conflict'){stopped=true;onError('This game was changed in another host tab. Return there or reload to recover the latest saved game.');return;}nextRevision=result.revision;onSaved(result.expiresAt);}catch(e){stopped=true;onError(e instanceof Error?e.message:'Invite save failed.');}});return chain;
 },flush:()=>chain,stop:()=>{stopped=true;},get stopped(){return stopped;}};
}
