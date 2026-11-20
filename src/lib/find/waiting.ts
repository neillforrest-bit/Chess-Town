import type {FindState} from './types';
import type {PID} from '../game';
export function partnerWait(s:FindState,p:PID):{key:string;reason:string}|null {
 const o=p==='A'?'B':'A';let reason='';let step='';
 switch(s.phase){
 case 'lobby':if(s.players[p].ready&&!s.players[o].ready)reason=s.players[o].joined?'getting ready':'joining the room';break;
 case 'actorAgree':if(s.actorConsent?.[p]&&!s.actorConsent?.[o])reason='reviewing the cast';break;
 case 'brief':if(s.brief[p].ready&&!s.brief[o].ready)reason='choosing their brief';break;
 case 'wheel':{const w=s.wheel;step=[w.setup,w.spinCount,w.result,w.suggested].join(':');if(w.setup==='protect'&&w.protectDone?.[p]&&!w.protectDone?.[o])reason='choosing protection';else if(w.setup==='veto'&&w.vetoDone?.[p]&&!w.vetoDone?.[o])reason='choosing vetoes';else if(w.setup==='spin'&&!w.result&&w.turn===o)reason='getting ready to spin';else if(w.result&&w.accepted[p]&&!w.accepted[o])reason='deciding KEEP or NO';else if(['review','suggest'].includes(w.setup||'')&&w.accepted[p]&&!w.accepted[o])reason='reviewing the genres';else if(w.setup==='suggest'&&!w.suggested&&w.turn===o)reason='finding another genre';break;}
 case 'cards':case 'nominate':if(s.nominationDone[p]&&!s.nominationDone[o])reason='choosing their films';else if(s.finished[p]&&!s.finished[o])reason='reviewing the film cards';break;
 case 'accept':if(s.acceptanceDone[p]&&!s.acceptanceDone[o])reason='reviewing the shortlist';break;
 case 'showdown':if(s.bout?.votes[p]!==undefined&&s.bout?.votes[o]===undefined)reason='choosing a film';break;
 case 'confirm':if(s.confirmed[p]&&!s.confirmed[o])reason='giving the final yes or no';break;
 case 'lounge':{const l=s.lounge;if(!l)break;step=[l.stage,l.history.length,l.tournament?.phase,l.tournament?.index].join(':');if(l.auction&&l.stage==='bout'&&l.auction.turn===o)reason='deciding their raise or tap out';else if(l.auction&&l.stage==='complete'&&l.auction.choices?.[p]!==undefined&&l.auction.choices?.[o]===undefined)reason='choosing a finalist';else if(l.stage==='choose'&&l.tournament?.ready[p]&&!l.tournament?.ready[o])reason='getting ready for the bout';else if(l.stage==='bout'&&l.bids[p].locked&&!l.bids[o].locked)reason='finishing their token bid';else if(l.stage==='result'&&l.nextReady?.[p]&&!l.nextReady?.[o])reason='reviewing the result';else if(l.stage==='result'&&l.tournament?.tieChoice?.[p]&&!l.tournament?.tieChoice?.[o])reason='choosing the tied film';break;}
 }
 return reason?{key:[s.code,s.batch,p,s.phase,step,reason].join(':'),reason}:null;
}
