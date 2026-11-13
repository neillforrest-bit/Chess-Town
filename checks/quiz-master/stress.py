import subprocess,time,requests,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root='/home/sandbox/ct-quiz';grammar=json.loads(Path(root+'/src/lib/trivia-grammar.ts').read_text().split('[GRAMMAR_CATEGORY_ID]: ')[1].rsplit('\n};',1)[0]);logic=json.loads(Path('/tmp/logic-quiz-bank.json').read_text())
s=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--port','3103'],cwd=root,stdout=open('/tmp/quiz-dev.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(120):
  try:
   if requests.get('http://localhost:3103/logic-brawl').ok:break
  except:pass
  time.sleep(.25)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(320,568),(390,844),(768,1024)]:
   for mode,bank in [('logic',logic),('grammar',grammar)]:
    pg=b.new_page(viewport={'width':w,'height':h});pg.route('**/api/trivia-commentary*',lambda r:r.abort());pg.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}))
    if mode=='logic':pg.goto('http://localhost:3103/logic-brawl');pg.get_by_role('button',name='SOLO',exact=False).first.click()
    else:
     pg.goto('http://localhost:3103/trivia-brawl?pass=1&topic=grammar&difficulty=master');pg.get_by_role('button',name='PULL UP A STOOL',exact=True).click();pg.get_by_role('button',name='PASS TO PLAYER 2',exact=True).click();pg.get_by_role('button',name='START GRAMMAR · MASTER',exact=True).click()
    pg.locator('.quiz-master').wait_for();pg.clock.install()
    result=pg.evaluate('''(bank)=>{const panel=document.querySelector('.logic-panel,.trivia-brawl-question:has(.quiz-master)'),q=panel.querySelector('.quiz-master h2'),buttons=[...panel.querySelectorAll('.logic-options button,.trivia-brawl-answers button')],clock=panel.querySelector('.quiz-countdown');let bad=[],worst=null;for(let item of bank){q.textContent=item.prompt||item.question;panel.querySelector('.quiz-master').classList.toggle('quiz-master--long',q.textContent.length>120);let opts=item.options||[item.correct,...item.wrong];opts.forEach((a,i)=>{buttons[i].textContent=a});let excess=panel.scrollHeight-panel.clientHeight,over=buttons.filter(b=>b.scrollHeight>b.clientHeight+1).length,bottom=Math.max(...buttons.map(b=>b.getBoundingClientRect().bottom)),timerTop=clock.getBoundingClientRect().top;if(excess>1||over||bottom>timerTop+1)bad.push({id:item.id,question:q.textContent,excess,over,bottom,timerTop});if(!worst||q.getBoundingClientRect().height>worst.height)worst={height:q.getBoundingClientRect().height,question:q.textContent,item};}return {bad,worst}}''',bank)
    print(mode,w,'bad',len(result['bad']),json.dumps(result['bad'][:5]),'worst',result['worst']['question'],flush=True)
    Path(f'/tmp/quiz-stress-{mode}-{w}.json').write_text(json.dumps(result));pg.evaluate('''item=>{document.querySelector('.quiz-master h2').textContent=item.prompt||item.question;document.querySelector('.quiz-master').classList.toggle('quiz-master--long',(item.prompt||item.question).length>120);(item.options||[item.correct,...item.wrong]).forEach((a,i)=>document.querySelectorAll('.logic-options button,.trivia-brawl-answers button')[i].textContent=a)}''',result['worst']['item']);pg.screenshot(path=f'/downloads/quiz-worst-{mode}-{w}.png');pg.close()
  b.close()
finally:s.terminate();s.wait()
