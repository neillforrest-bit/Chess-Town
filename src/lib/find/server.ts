import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';
export const hash=(x:string)=>createHash('sha256').update(x).digest('hex');
export const eq=(x:string,y:string)=>x.length===y.length&&timingSafeEqual(Buffer.from(x),Buffer.from(y));
// Fail closed. Never fall back to the inherited browser role for new records.
export function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Server storage is not configured');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export const tokenValid=(token:string)=>/^[a-f0-9]{64}$/.test(token);
export function ipKey(req:Request){const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';return hash((process.env.SUPABASE_SERVICE_ROLE_KEY||'')+':find-ip:'+ip);}
export async function limit(key:string,max:number,seconds:number){const {data,error}=await db().rpc('find_take_rate',{p_key:key,p_max:max,p_seconds:seconds});if(error)throw Error('Safety limit unavailable');return data===true;}
export async function identity(req:Request){const token=req.headers.get('x-find-player')||'';if(!tokenValid(token))return null;const {data,error}=await db().from('find_players').select('id,username,credential_hash').eq('credential_hash',hash(token)).maybeSingle();if(error)throw Error('Identity storage unavailable');return data as {id:string;username:string;credential_hash:string}|null;}
