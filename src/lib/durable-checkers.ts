import {initial,legalMoves,apply,other,boardKey,moveText,type Board,type Side} from './checkers';
export type SavedCheckers={bd:Board;turn:Side;plies:number;quiet:number;positions:Record<string,number>;over:string|null;log:string[];last:number[];gameId:string;guest:string|null;ready:string[];rematch:string[];seen:string[];serial:number};
export type CheckersAction={type:'ready'|'move'|'rematch';id:string;gameId:string;plies:number;path?:number[]};
export function newSavedCheckers(guest:string|null=null):SavedCheckers{const bd=initial();return {bd,turn:'r',plies:0,quiet:0,positions:{[boardKey(bd,'r')]:1},over:null,log:[],last:[],gameId:crypto.randomUUID(),guest,ready:[],rematch:[],seen:[],serial:0};}
export function validSavedCheckers(s:SavedCheckers){return !!s&&Array.isArray(s.bd)&&s.bd.length===64&&s.bd.every(p=>['.','r','R','b','B'].includes(p))&&['r','b'].includes(s.turn)&&Number.isInteger(s.plies)&&s.plies>=0&&typeof s.gameId==='string'&&Array.isArray(s.ready)&&Array.isArray(s.seen)&&typeof s.positions==='object';}
export function checkersAction(s:SavedCheckers,role:'host'|'guest',a:CheckersAction):SavedCheckers{
 if(!a||typeof a.id!=='string'||a.id.length>60||a.gameId!==s.gameId||s.seen.includes(a.id))return s;
 const seen=[...s.seen.slice(-2047),a.id];
 if(a.type==='ready'&&s.plies===0&&!s.over)return {...s,ready:[...new Set([...s.ready,role])],seen};
 if(a.type==='rematch'&&s.over){const votes=[...new Set([...s.rematch,role])];return votes.length===2?{...newSavedCheckers(s.guest),seen}:{...s,rematch:votes,seen};}
 if(a.type!=='move'||s.over||!s.guest||s.ready.length!==2||a.plies!==s.plies||s.turn!==(role==='host'?'r':'b')||!Array.isArray(a.path))return s;
 const m=legalMoves(s.bd,s.turn).find(m=>m.path.join(',')===a.path!.join(','));if(!m)return s;
 const bd=apply(s.bd,m),turn=other(s.turn),key=boardKey(bd,turn),quiet=m.caps.length||s.bd[m.from]===s.bd[m.from].toLowerCase()?0:s.quiet+1;
 const positions={...s.positions,[key]:(s.positions[key]||0)+1};
 const over=!legalMoves(bd,turn).length?(s.turn==='r'?'Red':'Black')+' wins - no legal moves remain':quiet>=80?'Draw - 40 moves each without capture or man move':positions[key]>=3?'Draw - same position three times':null;
 return {...s,bd,turn,quiet,positions,over,plies:s.plies+1,last:[m.from,m.to],log:[...s.log.slice(-29),(s.turn==='r'?'Red ':'Black ')+moveText(m)],seen};
}
