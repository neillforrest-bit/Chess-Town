import subprocess,time,requests,json
from playwright.sync_api import sync_playwright
root='/home/sandbox/ct-quiz';s=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--port','3103'],cwd=root,stdout=open('/tmp/quiz-dev.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(120):
  try:
   if requests.get('http://localhost:3103/logic-brawl').ok:break
  except:pass
  time.sleep(.25)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(390,844),(320,568)]:
   pg=b.new_page(viewport={'width':w,'height':h});pg.goto('http://localhost:3103/logic-brawl');print(pg.locator('button').all_text_contents(),flush=True)
   pg.get_by_role('button',name='SOLO',exact=False).first.click();pg.locator('.quiz-master').wait_for();pg.clock.install();pg.clock.pause_at(__import__('datetime').datetime.now()+__import__('datetime').timedelta(seconds=1));pg.screenshot(path=f'/downloads/quiz-master-first-{w}.png');print(w,pg.evaluate('''()=>{let m=document.querySelector('.logic-panel'),o=document.querySelector('.logic-options');return {height:innerHeight,panel:m.getBoundingClientRect().toJSON(),scroll:m.scrollHeight,client:m.clientHeight,options:o.getBoundingClientRect().toJSON(),body:document.body.scrollHeight}}'''),flush=True);pg.close()
  b.close()
finally:s.terminate();s.wait()
