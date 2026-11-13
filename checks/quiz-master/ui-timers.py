from playwright.sync_api import sync_playwright
import subprocess,time,requests
s=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--port','3103'],cwd='/home/sandbox/ct-quiz',stdout=open('/tmp/timerui.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(60):
  try:
   if requests.get('http://localhost:3103').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for topic,total in [('grammar',15),('nba',10)]:
   for mode in ['solo','pass']:
    pg=b.new_page(viewport={'width':390,'height':844});pg.route('**/api/trivia-commentary*',lambda r:r.abort());pg.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}));pg.clock.install();pg.goto(f'http://localhost:3103/trivia-brawl?{mode}=1&topic=grammar&difficulty=hard')
    if topic!='grammar':pg.get_by_label('Quiz topic',exact=True).select_option(topic)
    if mode=='solo':pg.get_by_role('button',name=f'START {topic.upper()} · HARD',exact=True).click()
    else:
     pg.get_by_role('button',name='PULL UP A STOOL',exact=True).click();pg.get_by_role('button',name='PASS TO PLAYER 2',exact=True).click();pg.get_by_role('button',name=f'START {topic.upper()} · HARD',exact=True).click()
    pg.locator('.trivia-brawl-answers button').first.wait_for();assert str(total)+'S' in pg.get_by_role('timer').inner_text().upper()
    pg.clock.fast_forward((total-4)*1000);assert pg.locator('.trivia-brawl-answers button:enabled').count()==4
    assert '4S' in pg.get_by_role('timer').inner_text().upper(),pg.get_by_role('timer').inner_text()
    pg.clock.fast_forward(4100);assert pg.locator('.trivia-brawl-answers button:enabled').count()==0
    print('PASS',topic,mode,total,'seconds, wrong at expiry',flush=True);pg.close()
  b.close()
finally:s.terminate();s.wait()
