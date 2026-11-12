from playwright.sync_api import sync_playwright
import subprocess,time,requests,json
root='/home/sandbox/ct-prod';bank=json.loads(open(root+'/src/lib/trivia-grammar.ts').read().split('[GRAMMAR_CATEGORY_ID]: ')[1].rsplit('\n};',1)[0])
s=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--port','3100'],cwd=root,stdout=open('/tmp/layout.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(60):
  try:
   if requests.get('http://localhost:3100').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(390,844),(320,568)]:
   pg=b.new_page(viewport={'width':w,'height':h});pg.route('**/api/trivia-commentary*',lambda r:r.abort());pg.goto('http://localhost:3100/trivia-brawl?pass=1&topic=grammar&difficulty=master');pg.get_by_role('button',name='PULL UP A STOOL',exact=True).click();pg.get_by_role('button',name='PASS TO PLAYER 2',exact=True).click();pg.get_by_role('button',name='START GRAMMAR · MASTER',exact=True).click();pg.locator('.trivia-brawl-answers button').first.wait_for()
   # Freeze the test clock while exercising all inert text layouts on the real question surface.
   pg.clock.install();pg.clock.pause_at(__import__('datetime').datetime.now()+__import__('datetime').timedelta(seconds=1))
   result=pg.evaluate('''(bank)=>{let worst={excess:-1};const main=document.querySelector('main.trivia-grammar'),q=document.querySelector('.trivia-brawl-question h2'),buttons=[...document.querySelectorAll('.trivia-brawl-answers > button')];let bad=[];for(let item of bank){q.textContent=item.question;[item.correct,...item.wrong].forEach((a,i)=>buttons[i].textContent=a);let excess=main.scrollHeight-main.clientHeight;let bottom=Math.max(...buttons.map(b=>b.getBoundingClientRect().bottom));if(!worst.bottom||bottom>worst.bottom)worst={excess,bottom,question:item.question};if(excess>1||bottom>innerHeight)bad.push({question:item.question,excess,bottom});}return {worst,bad}}''',bank)
   print(w,json.dumps(result),flush=True)
   worst=next(q for q in bank if q['question']==result['worst']['question']);pg.evaluate('''(item)=>{document.querySelector('.trivia-brawl-question h2').textContent=item.question;[item.correct,...item.wrong].forEach((a,i)=>document.querySelectorAll('.trivia-brawl-answers > button')[i].textContent=a)}''',worst);pg.screenshot(path=f'/downloads/grammar-trickier-worst-{w}.png');assert not result['bad']
  b.close()
finally:s.terminate();s.wait()
