import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db, hash, identity, ipKey, limit, tokenValid } from '@/lib/find/server';
export const dynamic='force-dynamic';
const reply=(x:unknown,status=200,retryAfter?:number)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store',...(retryAfter?{'Retry-After':String(retryAfter)}:{})}});
export async function GET(req:Request){try{const token=req.headers.get('x-find-player')||'';if(!tokenValid(token))return reply({error:'No saved player on this device.'},404);if(!await limit('identity-read-device:'+hash(token),120,60))return reply({error:'Please slow down and try again in a minute.'},429,60);const p=await identity(req);return p?reply({id:p.id,username:p.username}):reply({error:'No saved player on this device.'},404);}catch{return reply({error:'Player storage unavailable. Your remembered player has not been replaced.'},503);}}
export async function POST(req:Request){try{
 const token=req.headers.get('x-find-player')||'';if(!tokenValid(token))return reply({error:'A device credential is required.'},400);
 const existing=await identity(req);if(existing)return reply({id:existing.id,username:existing.username});
 const text=await req.text();if(text.length>1024)return reply({error:'Request too large'},413);const b=JSON.parse(text),username=typeof b.username==='string'?b.username.trim():'';
 if(!/^[a-zA-Z][a-zA-Z0-9_]{2,13}$/.test(username))return reply({error:'Use 3-14 letters, numbers or underscores, starting with a letter. No spaces: try Lieutenant_Dan instead of Lieutenant Dan.'},400);
 if(/^(admin|moderator|support|system|orson|movie_?town|game_?town)$/i.test(username))return reply({error:'Choose another username.'},400);
 if(!await limit('identity-claim-device-v2:'+hash(token),12,300))return reply({error:'Too many username attempts on this browser. Keep this page open and retry in 5 minutes.',retryAfter:300},429,300);
 // Shared networks need room for families and playtests. Keep an abuse cap, not an eight-person daily lockout.
 if(!await limit('identity-claim-network-v2:'+ipKey(req),120,3600))return reply({error:'This shared network is temporarily busy creating players. Retry in an hour; remembered usernames still work.',retryAfter:3600},429,3600);
 const {data,error}=await db().from('find_players').insert({id:randomUUID(),username,username_key:username.toLowerCase(),credential_hash:hash(token)}).select('id,username').single();
 if(error){if(error.code==='23505'){const remembered=await identity(req);if(remembered)return reply({id:remembered.id,username:remembered.username});return reply({error:'That username is already claimed. Choose another.'},409);}return reply({error:'Could not claim your username. Please retry.'},503);}return reply(data);
 }catch{return reply({error:'Could not claim a player right now. No existing username has been changed.'},503);}}
