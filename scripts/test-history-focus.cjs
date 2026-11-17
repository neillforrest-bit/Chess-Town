const fs=require('fs'),ts=require('typescript'),assert=require('assert');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const S=require('../src/lib/trivia-settings.ts'),L=require('../src/lib/trivia-local.ts'),E=require('../src/lib/trivia-match.ts'),R=require('../src/lib/trivia-room.ts');
global.fetch=()=>{throw Error('Unexpected network: History main shelf must be local')};
(async()=>{
 assert.equal(S.sportFocusCategoryId('history'),-15);assert.equal(S.normalizeTriviaSettings({focus:'history',difficulty:'hard'}).focus,'history');
 for(const heat of ['classic','easy','medium','hard','master']){
  let m=E.planMatch([{id:-15,name:'History'}],[{id:-15,name:'History'}],{p1:-15,p2:-15},{difficulty:heat});
  await E.loadAllRounds(m,(i,q)=>{m=E.markRoundLoaded(m,i,q)});
  const qs=m.rounds.flatMap(r=>r.questions);assert.equal(qs.length,25);assert.equal(new Set(qs.map(q=>q.question)).size,25);
  assert(qs.every(q=>q.category==='History'));assert(m.rounds.every(r=>r.categoryId===-15&&r.ready));
  assert(qs.every(q=>new Set(q.answers).size===4&&q.answers.includes(q.correctAnswer)));
  if(heat!=='classic')assert(qs.every(q=>q.difficulty===(heat==='master'?'hard':heat)));
  const t=await E.fetchLastCallQuestion(E.usedQuestionTexts(m),-15,heat==='classic'?'hard':heat);assert.equal(t.category,'History');
  const room={...R.createRoom({focus:'history',difficulty:heat}),match:m,phase:'question'};const pub=R.serializeRoom(room,'p2');assert(!JSON.stringify(pub.currentQuestion).includes('correctAnswer'));
  const armed=E.applyWildcard(m,'p1','fiftyfifty');assert(!armed.error);assert.equal(E.viewerQuestion(armed.state,'p1').answers.length,2);
  const q=E.currentQuestionOf(m);m=E.applyAnswer(m,'p1',q.correctAnswer).state;m=E.applyAnswer(m,'p2',q.correctAnswer).state;assert.equal(m.phase,'reveal');
  console.log('PASS',heat,'25 unique History main questions, exact shelf, on-topic decider, answer privacy/cards');
 }
 const all=L.LOCAL_QUESTIONS[-15];console.log('BANK',all.length,JSON.stringify(Object.fromEntries(['easy','medium','hard'].map(l=>[l,all.filter(q=>q.level===l).length]))));
})().catch(e=>{console.error(e);process.exit(1)});