import subprocess,time,requests,re,json
from playwright.sync_api import sync_playwright
root='/home/sandbox/ct-quiz';base='http://localhost:3103'
s=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--port','3103'],cwd=root,stdout=open('/tmp/quiz-remote.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(120):
  try:
   if requests.get(base+'/logic-brawl').ok:break
  except:pass
  time.sleep(.25)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  contexts=[b.new_context(viewport={'width':390,'height':844}) for _ in range(2)];pages=[c.new_page() for c in contexts];a,z=pages
  for pg in pages:
   pg.route('**/api/trivia-commentary*',lambda r:r.abort());pg.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}));pg.on('pageerror',lambda e:print('JS ERROR',e,flush=True))
  for pg in pages:pg.goto(base+'/trivia-brawl?topic=grammar&difficulty=hard&triviaFreeCommentary=1')
  a.get_by_role('button',name='PLAY A FRIEND',exact=False).click();a.locator('input[readonly]').first.wait_for();invite=a.locator('input[readonly]').first.input_value();print('TRIVIA invite',invite,flush=True);z.goto(invite)
  print('HOST',a.locator('body').inner_text(),flush=True);print('GUEST',z.locator('body').inner_text(),flush=True)
  for pg in pages:
   # Focused Grammar uses the same confirmation action as a category draft.
   pg.get_by_role('button',name=re.compile('LOCK|READY|CONFIRM|BELLYS'),exact=False).first.click()
  a.get_by_role('button',name='START THE BRAWL',exact=True).click();a.locator('.quiz-master').wait_for();z.locator('.quiz-master').wait_for();a.screenshot(path='/downloads/quiz-trivia-remote-question.png');z.screenshot(path='/downloads/quiz-trivia-guest-question.png')
  assert a.locator('.quiz-master h2').inner_text()==z.locator('.quiz-master h2').inner_text();a.locator('.trivia-brawl-answers button').first.click();z.locator('.trivia-brawl-answers button').last.click();a.locator('.trivia-reveal').wait_for();print('PASS real Trivia2-session question/lock/reveal',flush=True)
  a.goto(base+'/trivia-party');a.get_by_role('button',name='OPEN A PARTY TABLE',exact=True).click();a.get_by_label('Party invite link').wait_for();invite=a.get_by_label('Party invite link').input_value();z.goto(invite)
  a.get_by_label('Quiz topic',exact=True).select_option('grammar');a.get_by_label('Your party name').fill('Alice');z.get_by_label('Your party name').fill('Bob');a.get_by_role('button',name='READY FOR THE PARTY',exact=True).click();z.get_by_role('button',name='READY FOR THE PARTY',exact=True).click();a.get_by_role('button',name='LOCK ROSTER · PREPARE QUIZ',exact=True).click();a.get_by_role('button',name='START THE PARTY',exact=True).click();a.locator('.quiz-master').wait_for();z.locator('.quiz-master').wait_for();a.screenshot(path='/downloads/quiz-party-question390.png');a.locator('.trivia-brawl-answers button').first.click();z.locator('.trivia-brawl-answers button').last.click();a.get_by_text('The answer is in',exact=True).wait_for();print('PASS real Party2-session question/lock/reveal',flush=True);a.screenshot(path='/downloads/quiz-party-reveal390.png')
  b.close()
finally:s.terminate();s.wait()
