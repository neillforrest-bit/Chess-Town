const assert=require('node:assert/strict'),crypto=require('node:crypto');global.crypto=crypto.webcrypto;global.window={localStorage:{getItem:()=>null,setItem:()=>{}}};
const m=require('/tmp/quiz-compiled/trivia-match.js'),r=require('/tmp/quiz-compiled/trivia-room.js'),p=require('/tmp/quiz-compiled/trivia-party.js'),s=require('/tmp/quiz-compiled/trivia-settings.js'),l=require('/tmp/quiz-compiled/trivia-local.js');
(async()=>{
assert.equal(s.mainQuestionSeconds('Grammar'),15);assert.equal(s.mainQuestionSeconds('NBA'),10);assert.equal(s.mainQuestionSeconds(undefined),10);
for(const [id,cat,ms] of [[-14,'Grammar',15000],[-11,'NBA',10000]]){
 let match=m.planMatch([{id,name:cat}],[{id,name:cat}],{p1:id,p2:id},{difficulty:'hard'});await m.loadAllRounds(match,(i,qs)=>{match=m.markRoundLoaded(match,i,qs)});let room=r.createRoom({focus:id===-14?'grammar':'nba',difficulty:'hard'});room.match=match;room.phase='intro';
 const old=Date.now;let now=100000;Date.now=()=>now;
 try{
  let started=(await r.applyRoomAction(room,'p1',{start:true})).room;assert.equal(started.questionEndsAt,now+ms);now+=10500;
  let mid=(await r.applyRoomAction(started,'p1',{questionTimeout:true})).room;assert.equal(mid.phase,id===-14?'question':'reveal');
  if(id===-14){now=115001;let end=(await r.applyRoomAction(mid,'p1',{questionTimeout:true})).room;assert.equal(end.phase,'reveal');assert.equal(end.match.answers.p1,m.QUESTION_TIMEOUT_ANSWER)}
 }finally{Date.now=old}
 const q=match.rounds[0].questions[0];let party=p.createParty('a',{focus:id===-14?'grammar':'nba',difficulty:'hard'});party.seats.push(p.makePartySeat('b','B'));party.phase='intro';party.questions=[[q]];party=p.applyPartyAction(party,'a',{start:true},100000);assert.equal(party.deadline,100000+ms);assert.equal(p.expireParty(party,100000+ms-1).phase,'question');assert.equal(p.expireParty(party,100000+ms).phase,'reveal');
}
const bank=l.LOCAL_QUESTIONS[-14],families=new Map(bank.map(q=>[q.question,q.family]));for(let rep=0;rep<100;rep++)for(const level of ['easy','medium','hard','master']){let seen=new Set(),f=new Set();for(let rd=0;rd<5;rd++){for(let q of await m.fetchRoundQuestions(-14,level,seen)){assert(!f.has(families.get(q.question)));f.add(families.get(q.question));seen.add(q.question)}}assert.equal(f.size,25)}
console.log('PASS Grammar 15s, NBA 10s, host expiry at deadline not 10s; party same; 400 fixed-level full loads do not repeat a rule family');
})().catch(e=>{console.error(e);process.exit(1)});
