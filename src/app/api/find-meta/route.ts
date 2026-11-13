import { NextResponse } from 'next/server';
import { db, identity, eq, hash, limit, ipKey } from '@/lib/find/server';
import type { FindState } from '@/lib/find/types';
export const maxDuration=15;
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 try{
  if(!await limit('meta-read:'+ipKey(req),90,60))return reply({error:'Please slow down.'},429);
  const player=await identity(req);if(!player)return reply({error:'Use your remembered player.'},403);
  const raw=await req.text();if(raw.length>512)return reply({error:'Request too large'},413);
  const b=JSON.parse(raw);if(!/^[A-Z2-9]{8}$/.test(b.code)||!Number.isSafeInteger(b.id))return reply({error:'Invalid film'},400);
  const {data,error}=await db().from('find_rooms').select('state').eq('code',b.code).maybeSingle();if(error)throw Error('Storage unavailable');
  const s=data?.state as FindState|undefined,token=req.headers.get('x-find-seat')||'';
  if(!s||token.length!==64||!(['A','B']as const).some(p=>s.players[p].playerId===player.id&&eq(s.players[p].tokenHash,hash(token))))return reply({error:'Use your saved room seat.'},403);
  const film=s.movies.find(m=>m.id===b.id);if(!film?.im||!/^tt\d{6,9}$/.test(film.im))return reply({error:'No verified IMDb match.'},404);
  const key=process.env.OMDB_API_KEY;if(!key)return reply({error:'Review source not configured. No scores invented.'},503);
  // Protect a free personal-use key even if a room is refreshed repeatedly. Cache by verified IMDb ID.
  if(!await limit('omdb-day:'+new Date().toISOString().slice(0,10),900,86400))return reply({error:'Review-source daily safety limit reached.'},429);
  const r=await fetch('https://www.omdbapi.com/?'+new URLSearchParams({apikey:key,i:film.im}),{signal:AbortSignal.timeout(8000),next:{revalidate:86400}});if(!r.ok)throw Error('Review source unavailable');
  const d=await r.json();if(d.Response!=='True'||d.imdbID!==film.im)return reply({error:'No matching review data.'},404);
  const number=(x:unknown,max:number)=>{const n=parseFloat(String(x??''));return Number.isFinite(n)&&n>=0&&n<=max?n:null;};
  const rt=number((d.Ratings||[]).find((x:{Source:string})=>x.Source==='Rotten Tomatoes')?.Value,100);
  return reply({rt,mc:number(d.Metascore,100),imdb:number(d.imdbRating,10),awards:d.Awards&&d.Awards!=='N/A'?String(d.Awards).slice(0,1500):'',source:'OMDb',checkedAt:new Date().toISOString()});
 }catch{return reply({error:'Review source unavailable. No scores invented.'},503);}
}
