import { NextResponse } from 'next/server';
import { identity, displayName, tokenValid } from '@/lib/find/server';
export const dynamic='force-dynamic';
const reply=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{const p=await identity(req);return p?reply({id:p.id,username:p.username}):reply({error:'No saved player on this browser.'},404);}catch{return reply({error:'Connection interrupted. Your saved player has not been replaced. Retry.'},503);}}
export async function POST(req:Request){try{
 const token=req.headers.get('x-find-player')||'';if(!tokenValid(token))return reply({error:'Browser storage is needed to remember your seat. Please retry.'},400);
 const text=await req.text();if(text.length>4096)return reply({error:'Request too large'},413);const b=JSON.parse(text),name=displayName(b.username);
 const headers=new Headers(req.headers);headers.set('x-find-name',encodeURIComponent(name));const p=await identity(new Request(req.url,{headers}));
 return p?reply({id:p.id,username:p.username}):reply({error:'Could not start this browser session. Please retry.'},503);
 }catch{return reply({error:'Connection interrupted. No name has been rejected. Please retry.'},503);}}
