import subprocess,time,requests
from playwright.sync_api import sync_playwright
s=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--port','3103'],stdout=open('/tmp/quiz-dev.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(120):
  try:
   if requests.get('http://localhost:3103/logic-brawl').ok:break
  except:pass
  time.sleep(.25)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for d in ['1','2','3']:
   pg=b.new_page(viewport={'width':390,'height':844});pg.goto('http://localhost:3103/logic-brawl');pg.get_by_label('Logic difficulty').select_option(d);pg.get_by_role('button',name='SOLO',exact=False).first.click();pg.locator('.quiz-master').wait_for();assert ['EASY','MEDIUM','HARD'][int(d)-1] in pg.locator('.logic-eyebrow').inner_text();pg.screenshot(path='/downloads/quiz-difficulty-logic'+d+'.png');pg.close();print('PASS Logic difficulty UI',d,flush=True)
  pg=b.new_page();pg.goto('http://localhost:3103/logic-brawl?road=1');assert pg.get_by_label('Logic difficulty').count()==1;print('PASS Logic Road difficulty choice',flush=True);pg.close()
  pg=b.new_page();pg.route('https://opentdb.com/**',lambda r:r.fulfill(json={'response_code':0,'results':[{'category':'QA','difficulty':'hard','question':'QA question','correct_answer':'A','incorrect_answers':['B','C','D']}]}));pg.goto('http://localhost:3103/trivia');pg.get_by_label('Last Call difficulty').select_option('hard');pg.locator('.quiz-master').wait_for();pg.wait_for_timeout(200);print(pg.locator('.trivia-question').inner_text());assert 'HARD' in pg.locator('.trivia-question').inner_text();print('PASS Last Call difficulty UI',flush=True);pg.close();b.close()
finally:s.terminate();s.wait()
