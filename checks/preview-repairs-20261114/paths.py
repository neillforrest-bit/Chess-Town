from playwright.sync_api import sync_playwright
import os,json,re
from pathlib import Path
base=os.environ.get('BASE','http://localhost:3181')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);q=b.new_page(viewport={'width':390,'height':844});q.set_default_timeout(15000)
 for width in [320,390]:
  q.set_viewport_size({'width':width,'height':844});q.goto(base+'/league');q.get_by_role('heading',name='League Table',exact=True).wait_for();assert '/league' in q.url;assert 'No live standings yet' in q.locator('body').inner_text();q.screenshot(path=f'/downloads/repair-league{width}.png');q.get_by_role('link',name='Back to Game Town',exact=True).click();q.locator('#gt-game').wait_for();print('PASS league correct route and honest no-feed state/back',width,flush=True)
 q.set_viewport_size({'width':390,'height':844})
 for mode in ['find','together','tonight','discover']:
  q.goto(base+'/movie/'+mode);f=q.frame_locator('iframe');f.locator('body').wait_for();f.locator('button').first.wait_for();q.wait_for_timeout(1500);print('MOVIE',mode,f.locator('body').inner_text()[:300],flush=True);q.screenshot(path=f'/downloads/repair-movie-{mode}390.png');nav=q.locator('nav.global-nav').get_by_role('link',name='GAME TOWN',exact=True);assert nav.is_visible();nav.click();q.locator('#gt-game').wait_for();print('PASS canonical movie header return',mode,flush=True)
 # Repeated real requests/answers, no model spend on preview.
 q.goto(base+'/trivia');questions=[]
 for i in range(12):
  q.locator('.trivia-answers button').first.wait_for();questions.append(q.locator('.trivia-question').inner_text());q.locator('.trivia-answers button').first.click();q.get_by_role('button',name='NEXT ROUND',exact=True).wait_for();q.get_by_role('button',name='NEXT ROUND',exact=True).click()
 assert len(set(questions))==12;print('PASS 12 consecutive rounds, unique questions, real service/cache/fallback',flush=True);q.locator('.trivia-answers button').first.wait_for();q.screenshot(path='/downloads/repair-quiz-real390.png')
 # Deliberately force rate-limit payload, broken JSON, HTTP429, and stalled request.
 for label in ['code5','http429','badjson','timeout']:
  c=b.new_context(viewport={'width':390,'height':844});t=c.new_page();t.set_default_timeout(10000)
  def handler(route):
   if label=='timeout':return
   if label=='http429':route.fulfill(status=429,body='Rate limited');return
   route.fulfill(status=200,content_type='application/json',body='badjson' if label=='badjson' else '{"response_code":5,"result":[]}')
  t.route('https://opentdb.com/**',handler);t.goto(base+'/trivia');t.locator('.trivia-answers button').first.wait_for();assert 'House pack' in t.locator('.trivia-source').inner_text();seen=[]
  for i in range(3):
   seen.append(t.locator('.trivia-question').inner_text());t.locator('.trivia-answers button').first.click();t.get_by_role('button',name='NEXT ROUND').click();t.locator('.trivia-answers button').first.wait_for()
  assert len(set(seen))==3
  t.screenshot(path='/downloads/repair-quiz-'+label+'390.png');print('PASS fallback',label,'3 answers/next, distinct questions',flush=True)
  for diff in ['easy','medium','hard']:
   t.get_by_label('Last Call difficulty').select_option(diff);t.locator('.trivia-answers button').first.wait_for();assert 'ROUND 1' in t.locator('.trivia-scoreboard').inner_text()
  c.close()
 b.close()
