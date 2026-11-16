// Browser-local postcards. No identity, network request or cloud-save claim.
export type Passport={completed:number;best:Record<string,number>;stamps:number[]};
export const emptyPassport=():Passport=>({completed:0,best:{},stamps:[]});
export function readPassport(store:Pick<Storage,'getItem'>):Passport{
 try{const p=JSON.parse(store.getItem('cove-passport-v1')||'null');if(!p||!Number.isInteger(p.completed)||p.completed<0)return emptyPassport();const best:Record<string,number>={};for(const k of ['amateur','club','pro'])if(Number.isInteger(p.best?.[k])&&p.best[k]>=3&&p.best[k]<=24)best[k]=p.best[k];return{completed:Math.min(9999,p.completed),best,stamps:Array.isArray(p.stamps)?[...new Set<number>(p.stamps.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<3))]:[]};}catch{return emptyPassport();}
}
export function recordPassport(store:Pick<Storage,'getItem'|'setItem'>,holes:number[],challenge:string,soloTotal?:number):Passport{
 const p=readPassport(store);p.completed=Math.min(9999,p.completed+1);p.stamps=[...new Set([...p.stamps,...holes])];if(soloTotal!==undefined&&holes.length===3&&soloTotal>=3&&soloTotal<=24)p.best[challenge]=Math.min(p.best[challenge]??25,soloTotal);store.setItem('cove-passport-v1',JSON.stringify(p));return p;
}
