export type Player={id:string;name:string;joined:number;scores:Record<number,number>;runs:Record<number,string>};
export type Event={at:number;kind:'join'|'score'|'note'|'close';text:string;id?:string;name?:string;round?:number;correct?:number;runId?:string;started?:number};
export type Cup={players:Player[];receipts:{text:string;ok:boolean;at:number}[];closed:boolean;draft:'none'|'saved'|'interrupted'|'resumed'|'complete'};
export const fresh=():Cup=>({players:[],receipts:[],closed:false,draft:'none'});
// Virtual minutes from Friday 00:00. No real schedule, API, auth or score security.
export const OPEN=[1080,2040,3480],JOIN_CLOSE=3960,START_CLOSE=4135,CLOSE=4140;
export function clock(n:number){const days=['Fri','Sat','Sun'];return `${days[Math.floor(n/1440)]||'Mon'} ${String(Math.floor(n%1440/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
export const total=(p:Player)=>Object.values(p.scores).reduce((a,b)=>a+b,0);
export function ranked(players:Player[]){return [...players].sort((a,b)=>total(b)-total(a)||a.name.localeCompare(b.name)).map((p,_,a)=>({...p,rank:1+a.filter(o=>total(o)>total(p)).length}))}
export function apply(state:Cup,event:Event):Cup{
 const s: Cup=JSON.parse(JSON.stringify(state));let ok=true,why='';const p=s.players.find(p=>p.id===event.id);
 if(event.kind==='join'){
  if(s.closed||event.at>JOIN_CLOSE){ok=false;why='Join cut-off passed. No player added.'}
  else if(p){ok=false;why='Already joined. No duplicate player.'}
  else{s.players.push({id:event.id!,name:event.name!,joined:event.at,scores:{},runs:{}});why='Synthetic host approval recorded.'}
 }else if(event.kind==='score'){
  const r=event.round!;
  if(!p){ok=false;why='Not an approved simulated player.'}
  else if(!Number.isInteger(r)||r<1||r>3){ok=false;why='Invalid round.'}
  else if(s.closed||event.at>CLOSE){ok=false;why='Cup closed. Score not counted.'}
  else if(event.at<OPEN[r-1]||(event.started??event.at)<OPEN[r-1]){ok=false;why='Round not open. Score not counted.'}
  else if((event.started??event.at)>START_CLOSE){ok=false;why='Run started after 20:55. Not counted.'}
  else if((event.started??event.at)<p.joined){ok=false;why='Run predates accepted join.'}
  else if(p.scores[r]!==undefined){ok=false;why=p.runs[r]===event.runId?'Duplicate retry ignored. Score unchanged.':'Second attempt rejected. Score unchanged.'}
  else if(!Number.isInteger(event.correct)||event.correct!<0||event.correct!>5){ok=false;why='Correct-answer count must be an integer from 0 to 5.'}
  else{p.scores[r]=event.correct!*5;p.runs[r]=event.runId!;why=`Accepted ${event.correct}/5 = ${event.correct!*5} points.`;if(event.id==='aster'&&r===1)s.draft='complete'}
 }else if(event.kind==='close'){s.closed=true;why='Final table. Equal scores share places. No speed bonus.'}
 else{why=event.text;if(event.text.includes('Checkpoint'))s.draft='saved';if(event.text.includes('Interrupted'))s.draft='interrupted';if(event.text.includes('Resumed'))s.draft='resumed'}
 s.receipts.push({text:`${event.kind==='note'?'':event.text+' '}${why}`,ok,at:event.at});return s;
}
const score=(at:number,id:string,round:number,correct:number,runId=`${id}-${round}`,started=at-2):Event=>({at,kind:'score',text:`${id[0].toUpperCase()+id.slice(1)}, round ${round}.`,id,round,correct,runId,started});
export const EVENTS:Event[]=[
 ...['aster','birch','cora','dev'].map((id,i)=>({at:1065+i,kind:'join' as const,id,name:id[0].toUpperCase()+id.slice(1),text:`${id[0].toUpperCase()+id.slice(1)} joins.`})),
 {at:1080,kind:'note',text:'Friday round opens. Four synthetic players, no real invites.'},
 {at:1082,kind:'note',text:'Checkpoint: Aster has answered 2 of 5. Draft saved locally.'},
 {at:1083,kind:'note',text:'Interrupted: Aster closes the pretend tab. No zero awarded.'},
 {at:1085,kind:'note',text:'Resumed: Aster returns to the same draft, not a new ranked attempt.'},
 score(1088,'aster',1,4,'aster-1',1081),score(1089,'aster',1,4,'aster-1',1081),
 score(1090,'birch',1,5),score(1091,'cora',1,3),score(1092,'dev',1,4),
 score(1095,'aster',3,5,'too-early',1093),
 {at:2040,kind:'note',text:'Saturday round opens. Earlier rounds stay available.'},
 score(2045,'aster',2,4),score(2046,'birch',2,3),score(2047,'cora',2,5),
 {at:2048,kind:'note',text:'Dev starts round 2 but never submits. Its draft is not a scored zero.'},
 score(2050,'dev',2,6,'invalid-answer-count'),
 {at:3480,kind:'note',text:'Sunday round opens. Catch-up still allowed until the cut-offs.'},
 score(3485,'aster',3,4),score(3486,'birch',3,4),score(3487,'cora',3,4),
 {at:3900,kind:'join',id:'ember',name:'Ember',text:'Ember joins late on Sunday, before 18:00.'},
 score(3905,'ember',1,4),score(3910,'ember',2,4),score(3915,'ember',3,4),
 {at:3961,kind:'join',id:'late',name:'Late',text:'A join arrives at Sunday 18:01.'},
 score(3970,'dev',1,5,'second-dev-run'),
 score(4138,'dev',3,5,'late-start',4136),
 {at:4140,kind:'close',text:'Sunday 21:00. Close this synthetic cup.'},
 score(4141,'dev',2,5,'after-close',4130)
];
export function simulate(count=EVENTS.length){return EVENTS.slice(0,count).reduce(apply,fresh())}
