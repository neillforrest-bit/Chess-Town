import {advanceLounge} from '@/lib/find/lounge';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { newFind, type Action, type FindState } from '@/lib/find/types';
import { reduceFind, prepareWheel } from '@/lib/find/reducer';
import { catalogueFor } from '@/lib/find/catalogue';
import type { PID } from '@/lib/game';
import { db, hash, eq, identity, ipKey, limit } from '@/lib/find/server';
export const dynamic='force-dynamic';
export const maxDuration=30;
const publicState=(s:FindState,p:PID)=>{const {inviteHash,...rest}=s;void inviteHash;return {...rest,players:{A:{...s.players.A,tokenHash:''},B:{...s.players.B,tokenHash:''}},you:p};};
const read=async(code:string)=>{const {data,error}=await db().from('find_rooms').select('state').eq('code',code).maybeSingle();if(error)throw Error('Room storage unavailable');const s=data?.state;return s?.flow==='find-v1'?s as FindState:null;};
const valid=(x:string)=>/^[A-Z2-9]{8}$/.test(x);
const reply=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store'}});
function seat(req:Request,s:FindState):PID|null{const token=req.headers.get('x-find-seat')||'';if(token.length<32)return null;const h=hash(token);return (['A','B']as PID[]).find(p=>s.players[p].tokenHash&&eq(s.players[p].tokenHash,h))||null;}
export async function GET(req:Request,{params}:{params:Promise<{code:string}>}){try{const {code}=await params;if(!valid(code))return reply({error:'Invalid room'},400);if(!await limit('read:'+ipKey(req),240,60))return reply({error:'Please slow down.'},429);const s=await read(code);if(!s)return reply({error:'Room not found'},404);const p=seat(req,s);if(p){const player=await identity(req);if(player?.id===s.players[p].playerId){if(advanceLounge(s)){const saved=await db().from('find_rooms').update({state:s,updated_at:new Date().toISOString()}).eq('code',code).eq('state->>v',String(s.v-1)).select('code');if(saved.error||!saved.data?.length)return reply({error:'Clock state is syncing. Please reconnect.'},409);}const etag='"'+code+'-'+p+'-'+s.v+'"';if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{ETag:etag,'Cache-Control':'no-store'}});const response=reply(publicState(s,p));response.headers.set('ETag',etag);return response;}return reply({error:'The remembered username does not own this seat.'},403);}const invite=new URL(req.url).searchParams.get('invite')||'';if(invite.length>=32&&eq(hash(invite),s.inviteHash))return reply({code:s.code,host:s.players.A.name,guestJoined:s.players.B.joined});return reply({error:'Use your saved seat or the original invite link.'},403);}catch{return reply({error:'Room storage unavailable. Your saved seat has not been reset.'},503);}}
export async function POST(req:Request,{params}:{params:Promise<{code:string}>}){
 try{const {code}=await params;if(!valid(code))return reply({error:'Invalid room'},400);if(!await limit('write:'+ipKey(req),90,60))return reply({error:'Please wait a minute before more actions.'},429);const raw=await req.text();if(raw.length>16000)return reply({error:'Too much data'},413);const body=JSON.parse(raw);const player=await identity(req);if(!player)return reply({error:'Claim or restore your remembered username first.'},403);const token=req.headers.get('x-find-seat')||'';if(!/^[a-f0-9]{64}$/.test(token))return reply({error:'A saved seat token is required'},403);
 for(let attempt=0;attempt<6;attempt++){
  const row=await read(code);const rowVersion=row?.v;let s=row;let p:PID|null=null;
  if(body.create&&s&&seat(req,s)==='A'&&s.players.A.playerId===player.id&&eq(hash(String(body.invite||'')),s.inviteHash))return reply(publicState(s,'A'));
  if(body.create){if(!await limit('create:'+player.id,20,86400))return reply({error:"Today's room creation limit reached."},429);if(s)return reply({error:'Room code already used. Create another room.'},409);if(!/^[a-f0-9]{64}$/.test(body.invite||''))return reply({error:'Invalid invite'},400);s=newFind(code,hash(body.invite));s.players.A.tokenHash=hash(token);s.players.A.playerId=player.id;p='A';}
  else{if(!s)return reply({error:'Room not found'},404);p=seat(req,s);if(!p&&body.join&&eq(hash(String(body.invite||'')),s.inviteHash)){if(s.players.B.joined)return reply({error:'That seat is already claimed. Use its original browser to resume.'},409);if(s.players.A.playerId===player.id)return reply({error:"You already own the host seat. Open the invite on your partner's device."},409);s.players.B.tokenHash=hash(token);s.players.B.playerId=player.id;p='B';}}
  if(!s||!p||s.players[p].playerId!==player.id)return reply({error:'This browser does not own that seat. Use the saved seat on your original browser.'},403);
  const it=(body.create||body.join)?{t:'join',name:player.username}:body.it;if((it?.t==='join')&&!body.create&&!body.join)return reply({error:'Your username is fixed to this player.'},403);if(!it||typeof it.t!=='string')return reply({error:'Missing action'},400);
  const actionId=typeof body.actionId==='string'&&/^[a-f0-9]{32,64}$/.test(body.actionId)?p+':'+body.actionId:null;if(actionId&&s.actionReceipts?.[actionId])return reply(publicState(s,p));
  const timed=advanceLounge(s);const next=reduceFind(s,p,it as Action);if(next===s&&!timed)return reply({error:'The room has moved on. Refreshing the current step; please use the action shown now.'},409);if(actionId)next.actionReceipts=Object.fromEntries([...Object.entries(s.actionReceipts||{}).slice(-63),[actionId,next.v]]);let searched=false;if(it.t==='brief'&&s.phase==='brief'&&s.brief[p==='A'?'B':'A'].ready){if(!await limit('search:'+player.id,10,3600))return reply({error:"This hour's film-search limit reached. Your existing room is safe."},429);searched=true;next.brief.A.ready=true;next.brief.B.ready=true;const fresh=await catalogueFor(next.brief);next.searchNotes=fresh.notes;prepareWheel(next,fresh.movies,true);if(!fresh.movies.length)next.issue=fresh.notes.find(n=>n.includes('required actor'))||'No matching live film pool was verified. Your rules and saved films are unchanged. Edit your brief or retry later.';}let result;
  if(!row)result=await db().from('find_rooms').insert({code,state:next});
  else result=await db().from('find_rooms').update({state:next,updated_at:new Date().toISOString()}).eq('code',code).eq('state->>v',String(rowVersion)).select('code');
  if(result.error)return reply({error:'Could not save. Keep this page open and retry.'},503);
  if(!row||result.data?.length)return reply(publicState(next,p));if(searched)return reply({error:'Your partner changed the brief while films were loading. Review it and lock yours again.'},409);
 }
 return reply({error:'Another action arrived at the same time. Please retry.'},409);
 }catch{return reply({error:'Could not save this action. Your existing room has not been reset.'},503);}
}
