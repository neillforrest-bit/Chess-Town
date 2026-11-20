import type { FindState } from './types';
import type { PID } from '../game';
const lines:Record<string,string[]>={
 start:['The lounge is open. Thirty tokens each. Make your case.','No bracket, no casualties. Just films and questionable tactics.','Your favourites are safe. Your tokens, less so.'],
 bid:['{p} backs {film} with {n}. The rope has opinions.','{n} tokens for {film}. {p} is making a statement.','{p} is pulling for {film}. Subtle? Not especially.'],
 lead:['{film} takes the lead. {p}, that got my attention.','The rope swings toward {film}. Nobody get comfortable.','A new leader: {film}. I do enjoy a plot twist.'],
 lock:['{p} is locked. The other side still has a move.','That is {p} committed. No backing out of those tokens.','{p} puts the paddle down. Let us see the other bid.'],
 win:['{film} wins this bout. Nobody leaves the shelf.','A tug victory for {film}. A proposal, not an order.','{film} takes the rope. Both still get the final say.'],
 upset:['A comeback for {film}. I had my eyebrow ready.','{film} turns it around. That is why we play.','The lead changed hands and {film} stole the scene.'],
 draw:['A draw. Two stubborn humans, one very tired rope.','Level stakes. No coin toss. You choose what happens next.','A dead heat. Democracy has excellent comic timing.'],
 double:['{p} plays Double Down. Same spend, twice the pull.','Double Down from {p}. Suddenly that stake looks taller.','{p} doubles the force, not the bill. Play tokens only.'],
 steal:['{p} takes {n} uncommitted tokens. Daylight robbery.','A five-finger plot twist: {p} steals {n}.','{p} raids the spare bank for {n}. Committed stakes stay safe.'],
 swap:['{p} swaps the pair. A fresh argument, same evening.','New films on the table. {p} changed the conversation.','A pair swap from {p}. No saved film was harmed.'],
 timeout:['{p} calls thirty seconds of breathing room.','Time-out for {p}. The rope can wait.','{p} pauses the clock. Discuss, scheme, fetch a snack.'],
 low:['Ten seconds left. Stage a bid or let it auto-lock.','The clock is getting impatient. Your staged bid will count.','Last ten seconds. No panic purchases, these are play tokens.'],
 auto:['Time. Staged bids are locked exactly as shown.','Clock finished. No hidden extra stake.','The timer has spoken. Your staged bids stand.'],
 proposal:['{p} proposes {film}. Now both say yes or go back.','A proposal for {film}. Two willing humans required.','{film} is on the table. No token can buy the final yes.'],
 final:['Two yeses for {film}. Chester approves this message.','Both want {film}. A rare and lovely agreement.','{film} it is. Two yeses beat any number of tokens.'],
 return:['An honest no. Back to the lounge, favourites intact.','No forced film. The lounge is still open.','A no is allowed. Your tokens did not buy consent.']
};
export function chester(s:FindState,event:string,p?:PID,id?:number,n?:number){const pool=lines[event]||lines.start;const i=(s.v+s.trace.length)%pool.length;const film=s.movies.find(m=>m.id===id)?.t||'this film';s.line=pool[i].replaceAll('{p}',p?s.players[p].name:'Someone').replaceAll('{film}',film).replaceAll('{n}',String(n??0));if(s.lounge){s.lounge.event=event;s.lounge.eventN=(s.lounge.eventN||0)+1;}}
