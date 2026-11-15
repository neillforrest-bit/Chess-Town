import 'server-only';
import {createHmac,createHash} from 'node:crypto';
import type {State} from './game';
export type SavedMovie={state:State;seats:{A:string;B:string};inviteHash:string;receipts:string[];resetVotes?:Partial<Record<'A'|'B',boolean>>};
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export const validSecret=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function assertPreview(){if(process.env.VERCEL_ENV==='production')throw Error('Saved movie rooms are preview-only.');}
function root(code:string){assertPreview();const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('Saved movie storage is not configured.');return createHmac('sha256',key).update('gametown:preview:saved-movie:v1:'+code).digest('hex');}
async function rpc(name:string,body:Record<string,unknown>){const key='sb_publishable_evOAPZMaAvwBr7DQI3-LUQ_taA22ZaE';const r=await fetch('https://chsatuxnkfstvsqhzqru.supabase.co/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(10000)});const d=await r.json();if(!r.ok)throw Error(d?.message||'Saved movie storage unavailable.');return d;}
export async function readSaved(code:string):Promise<{snapshot:SavedMovie;revision:number;expiresAt:string}>{return rpc('preview_invite_host_v1',{p_game:'movies',p_room:'original-'+code,p_secret:root(code)});}
export async function createSaved(code:string,snapshot:SavedMovie){return rpc('preview_invite_create_v1',{p_game:'movies',p_room:'original-'+code,p_secret:root(code),p_name:snapshot.state.players.A.name,p_snapshot:snapshot});}
export async function writeSaved(code:string,revision:number,snapshot:SavedMovie){return rpc('preview_invite_host_v1',{p_game:'movies',p_room:'original-'+code,p_secret:root(code),p_expected:revision,p_snapshot:snapshot,p_phase:snapshot.state.phase==='lobby'?'waiting':snapshot.state.phase==='done'?'finished':'playing'});}

export async function summarySaved(code:string){assertPreview();return rpc('preview_invite_summary_v1',{p_game:'movies',p_room:'original-'+code});}
