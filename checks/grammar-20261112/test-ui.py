from playwright.sync_api import sync_playwright
import subprocess,time,requests,json
root=str(__import__('pathlib').Path(__file__).resolve().parents[2])
srv=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--port','3100','--hostname','127.0.0.1'],cwd=root,stdout=open('/tmp/ct-grammar-server.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(80):
  try:
   if requests.get('http://127.0.0.1:3100').ok:break
  except:pass
  time.sleep(.15)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  page.route('**/api/trivia-commentary*',lambda r:r.abort())
  page.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}))
  page.goto('http://127.0.0.1:3100/trivia-brawl?pass=1');page.get_by_role('button',name='SINGLE TOPIC',exact=True).click()
  page.get_by_role('button',name='GRAMMAR',exact=True).click();page.get_by_label('Quiz difficulty',exact=True).select_option('master')
  page.get_by_placeholder('Player one name').fill('Alice');page.get_by_placeholder('Player two name').fill('Bob')
  page.screenshot(path='/downloads/grammar-setup-390.png',full_page=True)
  print('setup ready')
  print('setup metrics',page.evaluate('({scroll:document.documentElement.scrollHeight,height:innerHeight,width:document.documentElement.scrollWidth})'))
  page.get_by_role('button',name='PULL UP A STOOL',exact=True).click();page.get_by_role('button',name='PASS TO BOB',exact=True).click();page.get_by_role('button',name='START GRAMMAR · MASTER',exact=True).click()
  page.locator('.trivia-brawl-answers button').first.wait_for()
  page.screenshot(path='/downloads/grammar-question-390.png',full_page=True)
  print('question metrics',page.locator('main.trivia-grammar').evaluate('(e)=>({height:e.clientHeight,scroll:e.scrollHeight})'))
  page.locator('.trivia-brawl-answers button').first.click();page.get_by_role('button',name='I AM BOB - SHOW QUESTION',exact=True).click();page.locator('.trivia-brawl-answers button').first.click()
  page.screenshot(path='/downloads/grammar-reveal-390.png',full_page=True)
  print('reveal ready')
  b.close()
finally:
 srv.terminate();srv.wait(timeout=10)
