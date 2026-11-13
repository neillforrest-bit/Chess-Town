import 'server-only';
import type { PID } from '../game';
import { fitsContract } from './selector';
import type { Brief, FindMovie } from './types';
const GN:Record<number,string>={28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Science Fiction',53:'Thriller',10752:'War',37:'Western'};
const GI:Record<string,number>=Object.fromEntries(Object.entries(GN).map(([k,v])=>[v,Number(k)]));
type Candidate={id:number;genre_ids?:number[];vote_average?:number;vote_count?:number;title?:string;overview?:string;poster_path?:string;release_date?:string};
export async function catalogueFor(brief:Record<PID,Brief>):Promise<{movies:FindMovie[];notes:string[]}>{
 const key=process.env.TMDB_API_KEY,notes:string[]=[];if(!key)return{movies:[],notes:['Live film search is unavailable. No unverified substitute pool was served.']};
 let calls=0;const deadline=Date.now()+22000;const g=async(path:string,q:Record<string,string>={})=>{if(++calls>58||Date.now()>=deadline)throw Error('Search request cap reached');const response=await fetch('https://api.themoviedb.org/3/'+path+'?'+new URLSearchParams({api_key:key,language:'en-US',...q}),{signal:AbortSignal.timeout(Math.max(1,Math.min(6500,deadline-Date.now()))),next:{revalidate:86400}});if(!response.ok)throw Error('Film search unavailable');return await response.json();};
 const names=Array.from(new Set((['A','B']as PID[]).flatMap(p=>brief[p].actors))),actorIds=new Map<string,number>();
 await Promise.all(names.map(async name=>{try{const data=await g('search/person',{query:name,include_adult:'false'});const exact=(data.results||[]).filter((p:{name:string;known_for_department?:string})=>p.name?.toLocaleLowerCase()===name.toLocaleLowerCase()&&p.known_for_department==='Acting');if(exact.length===1)actorIds.set(name,exact[0].id);else notes.push('Could not uniquely resolve actor "'+name+'". No other actor was substituted.');}catch{notes.push('Could not check actor "'+name+'" against live cast data.');}}));
 const exclusions=Array.from(new Set((['A','B']as PID[]).flatMap(p=>brief[p].exclude))).map(g=>GI[g]).filter(Boolean).join(',');
 const base:Record<string,string>={include_adult:'false',include_video:'false','vote_count.gte':'80','vote_average.gte':'6.5','primary_release_date.lte':new Date().toISOString().slice(0,10),...(exclusions?{without_genres:exclusions}:{})};
 // Queries gather candidates. One shared contract below is the authority, never query filters alone.
 const genreQueries=Array.from(new Set((['A','B']as PID[]).map(p=>brief[p].genres.map(g=>GI[g]).filter(Boolean).join('|')).filter(Boolean)));
 const jobs:{path:string;q:Record<string,string>}[]=[];
 for(const sort of ['vote_average.desc','vote_count.desc','primary_release_date.desc'])jobs.push({path:'discover/movie',q:{...base,sort_by:sort,...(genreQueries[0]?{with_genres:genreQueries[0]}:{}),...(sort==='vote_average.desc'?{'vote_count.lte':'5000'}:{})}});
 if(genreQueries.length>1)jobs.push({path:'discover/movie',q:{...base,sort_by:'vote_average.desc',with_genres:genreQueries[1]}});
 for(const id of actorIds.values())jobs.push({path:'person/'+id+'/movie_credits',q:{}});
 if((['A','B']as PID[]).some(p=>brief[p].kind==='classic'))jobs.push({path:'discover/movie',q:{...base,sort_by:'vote_average.desc','primary_release_date.lte':'1999-12-31'}});
 if((['A','B']as PID[]).some(p=>brief[p].kind==='indie')){try{const result=await g('search/keyword',{query:'independent film'});const keyword=(result.results||[]).find((x:{name:string})=>x.name==='independent film');if(keyword)jobs.push({path:'discover/movie',q:{...base,with_keywords:String(keyword.id),sort_by:'vote_average.desc',...(genreQueries[0]?{with_genres:genreQueries[0]}:{})}});else notes.push('The independent-film source tag could not be resolved.');}catch{notes.push('The independent-film source tag could not be checked.');}}
 const actorFilmIds=new Set<number>();const raw=new Map<number,Candidate>();await Promise.all(jobs.map(async j=>{try{const data=await g(j.path,j.q);for(const m of data.results||data.cast||[]){if(m.adult||!m.id||!m.poster_path||!m.overview)continue;const gs=(m.genre_ids||[]).map((id:number)=>GN[id]);if((['A','B']as PID[]).some(p=>brief[p].exclude.some(x=>gs.includes(x))||(brief[p].genres.length&&!brief[p].genres.some(x=>gs.includes(x)))))continue;raw.set(m.id,m);if(j.path.startsWith('person/'))actorFilmIds.add(m.id);}}catch{notes.push('One film search source was unavailable; no results from it were invented.');}}));
 const ranked=[...raw.values()].sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
 // Actor credits are gathered first through their own channel; prioritise their films before broad discovery.
 ranked.sort((a,b)=>Number(actorFilmIds.has(b.id))-Number(actorFilmIds.has(a.id))||(b.vote_average||0)-(a.vote_average||0));
 const movies:FindMovie[]=[];
 const selected=ranked.slice(0,Math.max(0,Math.min(40,58-calls)));
 // Bound concurrency and total requests; one credits+keywords detail response per candidate.
 for(let start=0;start<selected.length;start+=8)await Promise.all(selected.slice(start,start+8).map(async candidate=>{try{const d=await g('movie/'+candidate.id,{append_to_response:'credits,keywords'});if(d.adult||!d.poster_path||!d.overview||!d.release_date||d.release_date>new Date().toISOString().slice(0,10))return;const cast=(d.credits?.cast||[]).map((x:{name:string})=>x.name),kw=(d.keywords?.keywords||[]).map((x:{name:string})=>x.name.toLowerCase());const m:FindMovie={id:d.id,t:d.title,y:Number(d.release_date.slice(0,4)),r:Math.round((d.vote_average||0)*10)/10,pop:d.vote_count||0,g:(d.genres||[]).map((x:{id:number})=>GN[x.id]).filter(Boolean),o:d.overview,p:d.poster_path,w:false,c:cast,rn:d.runtime||undefined,im:d.imdb_id||undefined,budget:d.budget||0,revenue:d.revenue||0,lang:d.original_language,kw,source:'TMDB details and full cast checked',creditsChecked:true};if(fitsContract(m,brief))movies.push(m);}catch{}}));
 if(!movies.length)notes.push('No new matching titles could be verified. No preferences were relaxed.');return{movies,notes:Array.from(new Set(notes))};
}
