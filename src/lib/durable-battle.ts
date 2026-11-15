import {Chess} from 'chess.js';
const START_MS = 10 * 60 * 1000;
export type Synced = {
  pgn: string; playerOneTime: number; playerTwoTime: number; playerOneTimeoutUsed: boolean; playerTwoTimeoutUsed: boolean;
  rev: number; result: string | null; drawBy: 0 | 1 | null; rematchBy: 0 | 1 | null; pausedBy: 0 | 1 | null; flipped: boolean;
  // WILD CARDS (one each per fighter per game)
  takebackBy: 0 | 1 | null; playerOneTakebackUsed: boolean; playerTwoTakebackUsed: boolean;
  ghost: { by: 0 | 1; square: string; untilPly: number; castPly: number } | null; playerOneGhostUsed: boolean; playerTwoGhostUsed: boolean;
  playerOneHintUsed: boolean; playerTwoHintUsed: boolean;
};
export const FRESH: Synced = { pgn: '', playerOneTime: START_MS, playerTwoTime: START_MS, playerOneTimeoutUsed: false, playerTwoTimeoutUsed: false, rev: 0, result: null, drawBy: null, rematchBy: null, pausedBy: null, flipped: false, takebackBy: null, playerOneTakebackUsed: false, playerTwoTakebackUsed: false, ghost: null, playerOneGhostUsed: false, playerTwoGhostUsed: false, playerOneHintUsed: false, playerTwoHintUsed: false };
export type BattleSaved={state:Synced;at:number;guest:string|null;hostName:string;guestName:string;hostFid?:string;guestFid?:string;ready:number[];seen:string[];serial:number};
export function newBattleSaved():BattleSaved{return {state:{...FRESH},at:Date.now(),guest:null,hostName:'WHITE',guestName:'BLACK',ready:[],seen:[],serial:0};}
export function validBattleSaved(s:BattleSaved){try{
 if(!s||typeof s!=='object'||!Number.isFinite(s.at)||!Number.isSafeInteger(s.serial)||s.serial<0||!Array.isArray(s.ready)||s.ready.length>2||new Set(s.ready).size!==s.ready.length||s.ready.some(v=>v!==0&&v!==1)||!Array.isArray(s.seen)||s.seen.length>2048||s.seen.some(v=>typeof v!=='string'||v.length>60)||!(s.guest===null||typeof s.guest==='string')||typeof s.hostName!=='string'||typeof s.guestName!=='string'||s.hostName.length>18||s.guestName.length>18)return false;
 const t=s.state;if(!t||typeof t.pgn!=='string'||t.pgn.length>100000||!Number.isSafeInteger(t.rev)||t.rev<0||typeof t.flipped!=='boolean'||![t.playerOneTime,t.playerTwoTime].every(v=>Number.isFinite(v)&&v>=0&&v<=START_MS))return false;
 if(![t.result===null||typeof t.result==='string'&&/^(resign:[wb]|timeout:[wb]|draw:agreed)$/.test(t.result),...[t.drawBy,t.rematchBy,t.pausedBy,t.takebackBy].map(v=>v===null||v===0||v===1)].every(Boolean))return false;
 for(const key of ['playerOneTimeoutUsed','playerTwoTimeoutUsed','playerOneTakebackUsed','playerTwoTakebackUsed','playerOneGhostUsed','playerTwoGhostUsed','playerOneHintUsed','playerTwoHintUsed'] as const)if(typeof t[key]!=='boolean')return false;
 if(t.ghost&&(!/^[a-h][1-8]$/.test(t.ghost.square)||![0,1].includes(t.ghost.by)||!Number.isSafeInteger(t.ghost.castPly)||t.ghost.castPly<0||t.ghost.untilPly!==t.ghost.castPly+6))return false;
 const c=new Chess();if(t.pgn)c.loadPgn(t.pgn);return true;
 }catch{return false;}}
export function foldBattle(saved:BattleSaved,now:number):Synced{
 const s={...saved.state},c=new Chess();if(s.pgn)c.loadPgn(s.pgn);
 if(s.pgn&&!s.result&&s.pausedBy===null&&!c.isGameOver()){
  const key=c.turn()==='w'?'playerOneTime':'playerTwoTime';s[key]=Math.max(0,s[key]-Math.max(0,now-saved.at));if(s[key]<=0)s.result='timeout:'+c.turn();
 }
 return s;
}
export function battlePatch(saved:BattleSaved,seat:0|1,patch:Partial<Synced>,now=Date.now()):BattleSaved{
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||![0,1].includes(seat))return saved;
 const old=saved.state,s=foldBattle(saved,now),c=new Chess();if(s.pgn)c.loadPgn(s.pgn);const color=old.flipped?(seat===0?'b':'w'):(seat===0?'w':'b');
 const done=!!s.result||c.isGameOver(),turn=c.turn()===color;let next:Synced|null=null;
 if(s.result!==old.result)next=s;
 else if('pgn' in patch){
  if(done&&patch.pgn===''&&patch.flipped===!old.flipped&&old.rematchBy!==null&&old.rematchBy!==seat)next={...FRESH,flipped:!old.flipped};
  else if(!done&&old.pausedBy===null&&old.takebackBy!==null&&old.takebackBy!==seat&&patch.takebackBy===null){const copy=new Chess();if(old.pgn)copy.loadPgn(old.pgn);copy.undo();if(copy.pgn()===patch.pgn)next={...s,pgn:copy.pgn(),takebackBy:null,...(old.takebackBy===0?{playerOneTakebackUsed:true}:{playerTwoTakebackUsed:true})};}
  else if(!done&&turn&&old.pausedBy===null&&saved.ready.length===2){const nextChess=new Chess();try{if(typeof patch.pgn!=='string'||patch.pgn.length>100000)return saved;if(patch.pgn)nextChess.loadPgn(patch.pgn);const oldHistory=c.history(),history=nextChess.history();if(history.length===oldHistory.length+1&&history.slice(0,-1).join('|')===oldHistory.join('|'))next={...s,pgn:nextChess.pgn(),drawBy:null,takebackBy:null};}catch{}}
 }else if('result' in patch){
  if(!done&&patch.result==='resign:'+color)next={...s,result:patch.result};
  else if(!done&&patch.result==='draw:agreed'&&old.drawBy!==null&&old.drawBy!==seat)next={...s,result:'draw:agreed',drawBy:null};
 }else if('pausedBy' in patch){
  const used=seat===0?'playerOneTimeoutUsed':'playerTwoTimeoutUsed';
  if(!done&&turn&&old.pausedBy===null&&!old[used]&&patch.pausedBy===seat)next={...s,pausedBy:seat,[used]:true};
  else if(old.pausedBy===seat&&patch.pausedBy===null)next={...s,pausedBy:null};
 }else if('drawBy' in patch){if(!done&&(patch.drawBy===seat||patch.drawBy===null&&old.drawBy!==seat))next={...s,drawBy:patch.drawBy!};}
 else if('rematchBy' in patch){if(done&&patch.rematchBy===seat)next={...s,rematchBy:seat};}
 else if('takebackBy' in patch){const used=seat===0?old.playerOneTakebackUsed:old.playerTwoTakebackUsed;if(!done&&old.pgn&&!turn&&!used&&old.takebackBy===null&&patch.takebackBy===seat)next={...s,takebackBy:seat};else if(old.takebackBy!==null&&old.takebackBy!==seat&&patch.takebackBy===null)next={...s,takebackBy:null};}
 else if(patch.ghost){const used=seat===0?old.playerOneGhostUsed:old.playerTwoGhostUsed,g=patch.ghost;if(typeof g!=='object'||typeof g.square!=='string'||!/^[a-h][1-8]$/.test(g.square))return saved;const pc=c.get(g.square as never);if(!done&&turn&&!used&&pc?.color===color&&g.by===seat&&(!old.ghost||c.history().length>=old.ghost.untilPly))next={...s,ghost:{by:seat,square:g.square,castPly:c.history().length,untilPly:c.history().length+6},...(seat===0?{playerOneGhostUsed:true}:{playerTwoGhostUsed:true})};}
 else{const key=seat===0?'playerOneHintUsed':'playerTwoHintUsed';if(!done&&turn&&!old[key]&&patch[key]===true)next={...s,[key]:true};}
 if(!next)return saved;next.rev=old.rev+1;return {...saved,state:next,at:now,ready:next.pgn===''&&done?[]:saved.ready};
}
