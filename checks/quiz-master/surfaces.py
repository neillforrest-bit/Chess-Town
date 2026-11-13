import subprocess,time,requests,json,datetime
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
  for w,h in [(390,844),(320,568),(768,1024)]:
   for mode in ['logic','solo','pass']:
    pg=b.new_page(viewport={'width':w,'height':h});pg.route('**/api/trivia-commentary*',lambda r:r.abort());pg.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}));pg.clock.install()
    if mode=='logic':
     pg.goto('http://localhost:3103/logic-brawl');pg.get_by_role('button',name='SOLO',exact=False).first.click()
    else:
     pg.goto(f'http://localhost:3103/trivia-brawl?{mode}=1&topic=grammar&difficulty=master')
     if mode=='pass':pg.get_by_role('button',name='PULL UP A STOOL',exact=True).click();pg.get_by_role('button',name='PASS TO PLAYER 2',exact=True).click()
     pg.get_by_role('button',name='START GRAMMAR · MASTER',exact=True).click()
    pg.locator('.quiz-master').wait_for();pg.screenshot(path=f'/downloads/quiz-{mode}-{w}.png')
    result=pg.evaluate('''()=>{let main=document.querySelector('.logic-match,.trivia-brawl-page'),panel=main.querySelector('.logic-panel,.trivia-brawl-question'),buttons=[...panel.querySelectorAll('.logic-options button,.trivia-brawl-answers button')],timer=panel.querySelector('.quiz-countdown');return {scroll:main.scrollHeight,client:main.clientHeight,panelScroll:panel.scrollHeight,panelClient:panel.clientHeight,bottom:Math.max(...buttons.map(b=>b.getBoundingClientRect().bottom)),timerTop:timer.getBoundingClientRect().top,timerBottom:timer.getBoundingClientRect().bottom,colours:buttons.map(b=>({bg:getComputedStyle(b).backgroundColor,fg:getComputedStyle(b).color})),question:panel.querySelector('h2').innerText}}''')
    print(mode,w,json.dumps(result),flush=True)
    assert result['bottom']<=result['timerTop']+1 and result['timerBottom']<=h
    assert result['scroll']<=result['client']+2 and result['panelScroll']<=result['panelClient']+2
    assert all(x['bg']=='rgb(255, 255, 255)' and x['fg']=='rgb(9, 9, 11)' for x in result['colours'])
    pg.clock.fast_forward(12000 if mode=='logic' else 11000);pg.screenshot(path=f'/downloads/quiz-{mode}-{w}-red.png')
    # Red effect must be absent for reduced motion; timer is still visible.
    pg.emulate_media(reduced_motion='reduce');assert pg.locator('.quiz-countdown__track i').evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s'
    pg.close()
  b.close()
finally:s.terminate();s.wait()
