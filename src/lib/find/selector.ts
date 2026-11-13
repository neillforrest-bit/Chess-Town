import { MOVIES, type PID } from '../game';
import type { Brief, FindMovie, Slice } from './types';
export const FIND_GENRES = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Fantasy','History','Horror','Music','Mystery','Romance','Science Fiction','Thriller','War','Western'];
export const MOOD_RULES = [
 { id:'capers', name:'Clever capers', description:'Crime with humour, heists or cons.', genres:['Crime','Comedy'], test:(m:FindMovie)=>m.g.includes('Crime') && (m.g.includes('Comedy') || /heist|con artist|robbery|swindle/i.test(m.o)) },
 { id:'warm', name:'Comedy and family', description:'Comedy or family metadata, without horror, thriller or war. This is a genre-backed lane, not a promise of a gentle tone.', genres:['Comedy','Family'], test:(m:FindMovie)=>m.g.some(g=>['Comedy','Family'].includes(g)) && !m.g.some(g=>['Horror','Thriller','War'].includes(g)) },
 { id:'mystery', name:'Unravel a mystery', description:'Clues, secrets and investigations.', genres:['Mystery'], test:(m:FindMovie)=>m.g.includes('Mystery') },
 { id:'suspense', name:'Edge of your seat', description:'Thrillers with a clear suspense label.', genres:['Thriller'], test:(m:FindMovie)=>m.g.includes('Thriller') && !m.g.includes('Horror') },
 { id:'crime', name:'Crime and consequences', description:'Films tagged with both Crime and Drama. Tone varies by film.', genres:['Crime','Drama'], test:(m:FindMovie)=>m.g.includes('Crime') && m.g.includes('Drama') },
 { id:'adventure', name:'Into the adventure', description:'Journeys, action and larger worlds.', genres:['Adventure','Action'], test:(m:FindMovie)=>m.g.includes('Adventure') || m.g.includes('Action') },
 { id:'ideas', name:'Other possible worlds', description:'Science fiction or fantasy metadata. Read each card for tone.', genres:['Science Fiction','Fantasy'], test:(m:FindMovie)=>m.g.some(g=>['Science Fiction','Fantasy'].includes(g)) },
 { id:'human', name:'Drama and romance', description:'Drama or romance metadata, excluding horror, action and thriller.', genres:['Drama','Romance'], test:(m:FindMovie)=>m.g.some(g=>['Drama','Romance'].includes(g)) && !m.g.some(g=>['Horror','Action','Thriller'].includes(g)) },
 { id:'true', name:'Stranger than fiction', description:'Documentaries backed by their genre metadata.', genres:['Documentary'], test:(m:FindMovie)=>m.g.includes('Documentary') },
];
const moodGenres:Record<Brief['mood'],string[]>={open:[],light:['Comedy','Family','Romance','Animation'],tense:['Thriller','Mystery','Crime','Horror'],thoughtful:['Drama','Documentary','Science Fiction','History'],adventure:['Adventure','Action','Fantasy','Science Fiction']};
export const namesMatch=(m:FindMovie,actors:string[])=>actors.some(a=>(m.c||[]).some(c=>c.toLowerCase()===a.toLowerCase()));
export function fitsContract(m:FindMovie,b:Record<PID,Brief>):boolean {
 if(m.w||!m.p) return false;
 return (['A','B'] as PID[]).every(p=>{const x=b[p];return !x.exclude.some(g=>m.g.includes(g)) && (!x.genres.length||x.genres.some(g=>m.g.includes(g))) && (!x.requireActor || !x.actors.length || namesMatch(m,x.actors));});
}
export function kindFits(m:FindMovie,k:Brief['kind']):boolean {
 if(k==='any')return true;
 if(k==='classic')return m.y>0&&m.y<=1999;
 if(k==='gem')return m.r>=7&&m.pop>=100&&m.pop<=5000;
 if(k==='blockbuster')return (m.revenue||0)>=150000000 || (m.budget||0)>=60000000;
 // Don't manufacture production status from popularity. Only tagged, verified records qualify.
 return (m.kw||[]).includes('independent film');
}
function score(m:FindMovie,b:Record<PID,Brief>,pid?:PID){
 let n=m.r;
 for(const p of ['A','B'] as PID[]){let v=0;if(namesMatch(m,b[p].actors))v+=7;if(moodGenres[b[p].mood].some(g=>m.g.includes(g)))v+=2;if(kindFits(m,b[p].kind))v+=1; n+=v*(pid===p?1.5:1);}
 return n;
}
export function eligibleMovies(b:Record<PID,Brief>,extra:FindMovie[]=[],seen:number[]=[],verifiedOnly=false):FindMovie[]{
 const map=new Map<number,FindMovie>();for(const m of [...(verifiedOnly?[]:MOVIES),...extra])map.set(m.id,{...map.get(m.id),...m});
 return [...map.values()].filter(m=>fitsContract(m,b)&&!seen.includes(m.id)).sort((a,c)=>score(c,b)-score(a,b)||a.id-c.id);
}
export function slicesFor(movies:FindMovie[],b:Record<PID,Brief>):Slice[]{
 const chosen=([b.A.kind,b.B.kind]).filter(k=>k!=='any');const lenses=chosen.length?movies.filter(m=>chosen.some(k=>kindFits(m,k))):movies;
 const candidates=MOOD_RULES.map(r=>({id:r.id,name:r.name,description:r.description,ids:lenses.filter(r.test).map(m=>m.id)})).filter(s=>s.ids.length>=4);
 const moodWeight=(slice:Slice)=>{const rule=MOOD_RULES.find(r=>r.id===slice.id)!;return (['A','B']as PID[]).reduce((n,p)=>n+rule.genres.filter(g=>moodGenres[b[p].mood].includes(g)).length,0);};
 return candidates.sort((a,c)=>moodWeight(c)-moodWeight(a)).slice(0,6);
}
export function deal(movies:FindMovie[],ids:number[],b:Record<PID,Brief>,limit=12):FindMovie[]{
 const eligible=movies.filter(m=>ids.includes(m.id));const out:FindMovie[]=[];const add=(m:FindMovie|undefined,lane:FindMovie['lane'])=>{if(m&&!out.some(x=>x.id===m.id))out.push({...m,lane,why:[...(['A','B'] as PID[]).flatMap(p=>namesMatch(m,b[p].actors)?['Stars '+(m.c||[]).filter(c=>b[p].actors.some(a=>a.toLowerCase()===c.toLowerCase())).join(', ')]:[]),...m.g.filter(g=>b.A.genres.includes(g)||b.B.genres.includes(g)).map(g=>'Genre: '+g)]});};
 // Reserve up to four less-seen candidates before choosing six close fits. No duplicate or silent preference relaxation.
 const ranked=[...eligible].sort((a,c)=>score(c,b)-score(a,b)||a.id-c.id);
 const gems=ranked.filter(m=>kindFits(m,'gem')).sort((a,c)=>c.r-a.r||a.pop-c.pop).slice(0,4);
 const gemIds=new Set(gems.map(m=>m.id));
 const fit=ranked.filter(m=>!gemIds.has(m.id));
 for(const p of ['A','B']as PID[])fit.filter(m=>namesMatch(m,b[p].actors)).slice(0,2).forEach(m=>{if(out.length<6)add(m,'fit');});
 for(const p of ['A','B']as PID[])if(b[p].kind!=='any')fit.filter(m=>kindFits(m,b[p].kind)).slice(0,2).forEach(m=>{if(out.length<6)add(m,'fit');});
 for(const m of fit){if(out.length>=6)break;add(m,'fit');}
 for(const m of gems)add(m,'gem');
 // Stretches are lower-ranked matches within the same wheel and hard rules, never an excluded genre.
 const remainder=ranked.filter(m=>!out.some(x=>x.id===m.id)&&m.r>=6.5).reverse();
 for(const m of remainder.slice(0,2))add(m,'stretch');
 return out.slice(0,limit);
}
