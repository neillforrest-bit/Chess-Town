// Browser-local postcards and solo medals. No identity, network or gameplay upgrades.
export type Passport={completed:number;best:Record<string,number>;stamps:number[];holeBest:Record<string,number[]>;soloRoutes:Record<string,number>};
const LEVELS=['amateur','club','pro'];const PAR=[4,4,5];
export const emptyPassport=():Passport=>({completed:0,best:{},stamps:[],holeBest:{},soloRoutes:{}});
export function readPassport(store:Pick<Storage,'getItem'>):Passport{
 try{const p=JSON.parse(store.getItem('cove-passport-v1')||'null');if(!p||!Number.isInteger(p.completed)||p.completed<0)return emptyPassport();const result=emptyPassport();result.completed=Math.min(9999,p.completed);for(const k of LEVELS){if(Number.isInteger(p.best?.[k])&&p.best[k]>=3&&p.best[k]<=24)result.best[k]=p.best[k];if(Number.isInteger(p.soloRoutes?.[k])&&p.soloRoutes[k]>=3&&p.soloRoutes[k]<=24)result.soloRoutes[k]=p.soloRoutes[k];if(Array.isArray(p.holeBest?.[k]))result.holeBest[k]=[0,1,2].map(i=>Number.isInteger(p.holeBest[k][i])&&p.holeBest[k][i]>=1&&p.holeBest[k][i]<=8?p.holeBest[k][i]:0);}result.stamps=Array.isArray(p.stamps)?[...new Set<number>(p.stamps.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<3))]:[];return result;}catch{return emptyPassport();}
}
export function recordHolePassport(store:Pick<Storage,'getItem'|'setItem'>,hole:number,challenge:string,soloStrokes?:number):Passport{
 const p=readPassport(store);if(!Number.isInteger(hole)||hole<0||hole>2)return p;p.stamps=[...new Set([...p.stamps,hole])];if(LEVELS.includes(challenge)&&typeof soloStrokes==='number'&&Number.isInteger(soloStrokes)&&soloStrokes>=1&&soloStrokes<=8){const scores=p.holeBest[challenge]??[0,0,0];scores[hole]=Math.min(scores[hole]||9,soloStrokes);p.holeBest[challenge]=scores;}store.setItem('cove-passport-v1',JSON.stringify(p));return p;
}
export function recordPassport(store:Pick<Storage,'getItem'|'setItem'>,holes:number[],challenge:string,soloTotal?:number,allSunk=false):Passport{
 const p=readPassport(store);p.completed=Math.min(9999,p.completed+1);p.stamps=[...new Set([...p.stamps,...holes.filter(h=>Number.isInteger(h)&&h>=0&&h<3)])];if(LEVELS.includes(challenge)&&soloTotal!==undefined&&new Set(holes).size===3&&Number.isInteger(soloTotal)&&soloTotal>=3&&soloTotal<=24){p.best[challenge]=Math.min(p.best[challenge]??25,soloTotal);if(allSunk)p.soloRoutes[challenge]=Math.min(p.soloRoutes[challenge]??25,soloTotal);}store.setItem('cove-passport-v1',JSON.stringify(p));return p;
}
export function soloProgress(p:Passport){
 const holeMin=PAR.map((_,i)=>Math.min(...LEVELS.map(k=>p.holeBest[k]?.[i]||9)));
 const route=Math.min(...LEVELS.map(k=>p.soloRoutes[k]||25));
 const medals=[...PAR.map((par,i)=>({name:['Ridge reader','Lagoon keeper','Sunset skipper'][i],detail:`Hole ${i+1} in ${par} or fewer · any tier`,earned:holeMin[i]<=par,record:holeMin[i]<=8?`Best ${holeMin[i]}`:'Not yet'})),{name:'A summer to keep',detail:'Sink all three holes in one solo journey',earned:route<=24,record:route<=24?`Best ${route}`:'Not yet'},{name:'Captain of the cove',detail:'Solo journey in par 13 or fewer · any tier',earned:route<=13,record:route<=24?`Best ${route}`:'Not yet'},{name:'Harbour legend',detail:'Pro solo journey in par 13 or fewer',earned:(p.soloRoutes.pro||25)<=13,record:p.soloRoutes.pro?`Pro best ${p.soloRoutes.pro}`:'Not yet'}];
 const earned=medals.filter(m=>m.earned).length;const rank=earned===6?'Harbour legend':earned>=5?'Cove captain':earned>=3?'Green reader':earned>=1?'Cabin hand':'Day tripper';
 return{medals,earned,rank,next:medals.find(m=>!m.earned)?.detail||'All six medals earned. Chase your personal best.'};
}
