import { NextResponse } from 'next/server';
import { db, identity, eq, hash, limit, ipKey } from '@/lib/find/server';
import type { FindState } from '@/lib/find/types';
export const maxDuration=25;
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
  const film=s.movies.find(m=>m.id===b.id);if(!film)return reply({error:'This film is not in your saved room.'},404);
  let imdbId=film.im&&/^tt\d{6,9}$/.test(film.im)?film.im:null;
  if(!imdbId){const tmdbKey=process.env.TMDB_API_KEY;if(!tmdbKey)return reply({error:'No verified IMDb link is stored for this film, and the film-ID source is unavailable. TMDB score is separate.'},404);if(!await limit('meta-id:'+ipKey(req),30,60))return reply({error:'Film-ID lookup safety limit reached. Try again shortly.'},429);try{const ids=await fetch('https://api.themoviedb.org/3/movie/'+film.id+'/external_ids?'+new URLSearchParams({api_key:tmdbKey}),{signal:AbortSignal.timeout(5000),next:{revalidate:86400}});if(!ids.ok)return reply({error:'The film-ID source is unavailable right now. Retry review lookup; TMDB score is separate.'},503);const linked=await ids.json();if(linked?.id===film.id&&/^tt\d{6,9}$/.test(linked.imdb_id||''))imdbId=linked.imdb_id;}catch{return reply({error:'Could not verify this film\'s IMDb link right now. Retry review lookup; TMDB score is separate.'},503);}if(!imdbId)return reply({error:'The film source has no verified IMDb link for this title. No title-only guess was used. TMDB score is separate.'},404);}

  const key=process.env.OMDB_API_KEY;if(!key)return reply({error:'Review source not configured. No scores invented.'},503);
  // Protect a free personal-use key even if a room is refreshed repeatedly. Cache by verified IMDb ID.
  if(!await limit('omdb-day:'+new Date().toISOString().slice(0,10),900,86400))return reply({error:'Review-source daily safety limit reached.'},429);
  const r=await fetch('https://www.omdbapi.com/?'+new URLSearchParams({apikey:key,i:imdbId}),{signal:AbortSignal.timeout(8000),next:{revalidate:86400}});if(!r.ok)throw Error('Review source unavailable');
  const d=await r.json();if(d.Response!=='True'||d.imdbID!==imdbId)return reply({error:'No matching review data.'},404);
  const number=(x:unknown,max:number)=>{const n=parseFloat(String(x??''));return Number.isFinite(n)&&n>=0&&n<=max?n:null;};
  const rt=number((d.Ratings||[]).find((x:{Source:string})=>x.Source==='Rotten Tomatoes')?.Value,100);
  const mc=number(d.Metascore,100),imdb=number(d.imdbRating,10),missing=[rt==null?'Rotten Tomatoes':null,mc==null?'Metacritic':null,imdb==null?'IMDb':null].filter(Boolean);return reply({rt,mc,imdb,note:missing.length?'OMDb returned no '+missing.join(', ')+' score for this IMDb-matched film. TMDB is a separate audience score.':'',awards:d.Awards&&d.Awards!=='N/A'?String(d.Awards).slice(0,1500):'',source:'OMDb',checkedAt:new Date().toISOString()});
 }catch{return reply({error:'Review source unavailable. No scores invented.'},503);}
}
