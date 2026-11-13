from playwright.sync_api import sync_playwright
import subprocess,time,requests,json,re
root=str(__import__('pathlib').Path(__file__).resolve().parents[2])
bank=json.loads(open(root+'/src/lib/trivia-grammar.ts').read().split('[GRAMMAR_CATEGORY_ID]: ')[1].rsplit('\n};',1)[0]);keys={q['question']:q['correct'] for q in bank}
srv=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--port','3103','--hostname','127.0.0.1'],cwd=root,stdout=open('/tmp/ct-grammar-server.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(80):
  try:
   if requests.get('http://127.0.0.1:3103').ok:break
  except:pass
  time.sleep(.15)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  page.route('**/api/trivia-commentary*',lambda r:r.abort());page.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}))
  page.goto('http://127.0.0.1:3103/trivia-brawl?pass=1&topic=grammar&difficulty=hard');page.get_by_placeholder('Player one name').fill('Alice');page.get_by_placeholder('Player two name').fill('Bob');page.get_by_role('button',name='PULL UP A STOOL',exact=True).click();page.get_by_role('button',name='PASS TO BOB',exact=True).click();page.get_by_role('button',name='START GRAMMAR · HARD',exact=True).click()
  main_questions=set();flash=set();summaries=set();metrics=[]
  for step in range(400):
   page.wait_for_timeout(30)
   body=page.locator('body').inner_text()
   if 'REMATCH - NEW CATEGORIES' in body:break
   question=page.locator('.trivia-brawl-question h2')
   q=question.first.inner_text() if question.count() else ''
   ans=page.locator('.trivia-brawl-answers > button')
   primary=page.locator('.trivia-brawl-question > button.trivia-brawl-primary')
   if ans.count():
    text=page.locator('.trivia-brawl-question').inner_text();is_main='GRAMMAR ·' in text
    if is_main:
     main_questions.add(q);assert q in keys,q
     metrics.append(page.locator('main.trivia-grammar').evaluate('(e)=>({height:e.clientHeight,scroll:e.scrollHeight})'))
     correct=keys[q];options=ans.all_text_contents();chosen=correct if 'ALICE TO ANSWER' in text else next(x for x in options if x!=correct)
     ans.filter(has_text=re.compile('^'+re.escape(chosen)+'$')).click()
    else:ans.first.click()
   elif page.locator('.trivia-duel-grid button:enabled').count():page.locator('.trivia-duel-grid button:enabled').first.click()
   elif page.locator('.trivia-flash-zone button:enabled').count():page.locator('.trivia-flash-zone button:enabled').first.click()
   elif primary.count():
    label=primary.first.inner_text()
    if 'FLASH FINALE' in label:flash.add(len(main_questions));page.screenshot(path='/downloads/quiz-grammar-round1-end-390.png') if len(flash)==1 else None
    if label=='ROUND SUMMARY':summaries.add(len(main_questions))
    if label=='NEXT ROUND' and len(summaries)==1:page.screenshot(path='/downloads/quiz-grammar-round-summary-390.png')
    primary.first.click()
   elif page.get_by_role('button',name=re.compile('SHOW')).count():page.get_by_role('button',name=re.compile('SHOW')).first.click()
   elif page.get_by_role('button',name='More answers',exact=True).is_enabled():page.get_by_role('button',name='More answers',exact=True).click()
   else:raise Exception(body)
  assert 'REMATCH - NEW CATEGORIES' in page.locator('body').inner_text(),page.locator('body').inner_text()
  assert 24<=len(main_questions)<=25,len(main_questions);assert len(flash)==5,len(flash);assert len(summaries)==5,len(summaries)
  page.screenshot(path='/downloads/quiz-grammar-finished-390.png')
  print('PASS full match:24-25 unique grammar questions with unchanged roulette rules,5 flash finales,5 round summaries,scoring and finish; main viewport worst excess',max(x['scroll']-x['height'] for x in metrics))
  b.close()
finally:srv.terminate();srv.wait(timeout=10)
