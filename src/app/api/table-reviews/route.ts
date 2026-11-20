import {NextResponse} from 'next/server';
import {limit,ipKey} from '@/lib/find/server';
export const maxDuration=30;
const cache=new Map<number,{until:number;data:Record<string,unknown>}>();
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Same-site requests only.'},{status:403});
 if(!await limit('table-meta:'+ipKey(req),40,60))return NextResponse.json({error:'Please pause before more review lookups.'},{status:429});
 let ids:number[];try{const b=await req.json();if(!Array.isArray(b.ids)||b.ids.length>12||b.ids.some((id:unknown)=>!Number.isSafeInteger(id)||Number(id)<1))throw Error();ids=[...new Set(b.ids)] as number[];}catch{return NextResponse.json({error:'Choose up to12 film IDs.'},{status:400});}
 const tmdb=process.env.TMDB_API_KEY,omdb=process.env.OMDB_API_KEY;if(!tmdb||!omdb)return NextResponse.json({error:'Review lookup is not configured. Stored scores remain available.'},{status:503});
 const results:Record<string,unknown>[]=[];
 for(let i=0;i<ids.length;i+=4)await Promise.all(ids.slice(i,i+4).map(async id=>{
 const old=cache.get(id);if(old&&old.until>Date.now()){results.push(old.data);return;}
 try{
 const r=await fetch('https://api.themoviedb.org/3/movie/'+id+'/external_ids?'+new URLSearchParams({api_key:tmdb}),{signal:AbortSignal.timeout(5000),next:{revalidate:86400}});if(!r.ok)throw Error();const linked=await r.json();const imdb=linked.imdb_id;if(linked.id!==id||!/^tt\d{6,10}$/.test(imdb||'')){results.push({id,rt:null,note:'No verified IMDb link for this film.'});return;}
 if(!await limit('omdb-day:'+new Date().toISOString().slice(0,10),900,86400)){results.push({id,rt:null,note:'Review-source daily safety limit reached.'});return;}
 const rr=await fetch('https://www.omdbapi.com/?'+new URLSearchParams({apikey:omdb,i:imdb}),{signal:AbortSignal.timeout(6000),next:{revalidate:86400}});if(!rr.ok)throw Error();const d=await rr.json();if(d.Response!=='True'||d.imdbID!==imdb){results.push({id,rt:null,note:/limit/i.test(d.Error||'')?'Review-source daily limit reached.':'OMDb has no review for this exact film.'});return;}
 const value=(d.Ratings||[]).find((x:{Source:string})=>x.Source==='Rotten Tomatoes')?.Value;const rt=typeof value==='string'&&/^\d{1,3}%$/.test(value)&&parseInt(value)<=100?parseInt(value):null;
 const awards=typeof d.Awards==='string'&&d.Awards!=='N/A'?d.Awards.slice(0,1000):'';
 const data={id,rt,awards,imdb,source:'OMDb / Rotten Tomatoes',checkedAt:new Date().toISOString(),note:rt===null?'OMDb returned no Rotten Tomatoes score for this exact film.':''};if(cache.size>2000)cache.clear();cache.set(id,{until:Date.now()+86400000,data});results.push(data);
 }catch{results.push({id,rt:null,note:'Review source could not be reached. Retry later.'});}
 }));return NextResponse.json({results});
}
