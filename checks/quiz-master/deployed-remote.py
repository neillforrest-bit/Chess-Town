import subprocess,time,requests,re,json
from playwright.sync_api import sync_playwright
root='/home/sandbox/ct-quiz';base='https://chess-town-git-instinct-quiz-master-preview-20261113-neillo.vercel.app'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 contexts=[b.new_context(viewport={'width':390,'height':844}) for _ in range(2)];pages=[c.new_page() for c in contexts];a,z=pages
 for pg in pages:
  pg.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}));pg.on('pageerror',lambda e:print('JS ERROR',e,flush=True))
 a.goto(base+'/logic-brawl');a.get_by_role('button',name='HOST A BATTLE',exact=False).click();a.locator('input[readonly]').first.wait_for();invite=a.locator('input[readonly]').first.input_value();print('LOGIC invite',invite,flush=True);z.goto(invite)
 print('LOGIC pre-ready',a.locator('body').inner_text(),z.locator('body').inner_text(),flush=True);a.get_by_role('button',name=re.compile('READY'),exact=False).first.click();z.get_by_role('button',name=re.compile('READY'),exact=False).first.click();print('LOGIC LOBBY',a.locator('body').inner_text(),flush=True)
 a.get_by_role('button',name=re.compile('START')).click();a.locator('.quiz-master').wait_for();z.locator('.quiz-master').wait_for()
 assert a.locator('.quiz-master h2').inner_text()==z.locator('.quiz-master h2').inner_text();a.locator('.logic-options button').first.click();assert not a.locator('.logic-options button:enabled').count();z.locator('.logic-options button').first.click();a.get_by_text('ANSWER & REASON',exact=False).wait_for();print('PASS real Logic2-session question/lock/reveal',flush=True);a.screenshot(path='/downloads/deployed-quiz-logic-remote-reveal.png')
 for pg in pages:pg.goto(base+'/trivia-brawl?topic=grammar&difficulty=hard&triviaFreeCommentary=1')
 a.get_by_role('button',name='PLAY A FRIEND',exact=False).click();a.locator('input[readonly]').first.wait_for();invite=a.locator('input[readonly]').first.input_value();print('TRIVIA invite',invite,flush=True);z.goto(invite)
 print('HOST',a.locator('body').inner_text(),flush=True);print('GUEST',z.locator('body').inner_text(),flush=True)
 for pg in pages:
  # Focused Grammar uses the same confirmation action as a category draft.
  pg.get_by_role('button',name=re.compile('LOCK|READY|CONFIRM|BELLYS'),exact=False).first.click()
 a.get_by_role('button',name='START THE BRAWL',exact=True).click();a.locator('.quiz-master').wait_for();z.locator('.quiz-master').wait_for();a.screenshot(path='/downloads/deployed-quiz-trivia-remote-question.png');z.screenshot(path='/downloads/deployed-quiz-trivia-guest-question.png')
 assert a.locator('.quiz-master h2').inner_text()==z.locator('.quiz-master h2').inner_text();question=z.locator('.quiz-master h2').inner_text();z.reload();z.locator('.quiz-master').wait_for();assert z.locator('.quiz-master h2').inner_text()==question;print('PASS guest reload rejoined current question',flush=True);a.locator('.trivia-brawl-answers button').first.click();z.locator('.trivia-brawl-answers button').last.click();a.locator('.trivia-reveal').wait_for();print('PASS real Trivia2-session question/lock/reveal',flush=True)
 b.close()
