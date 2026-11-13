import subprocess,time,requests,re,json
from playwright.sync_api import sync_playwright
root='/home/sandbox/ct-quiz';base='https://chess-town-git-instinct-quiz-master-preview-20261113-neillo.vercel.app'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 contexts=[b.new_context(viewport={'width':320,'height':568}) for _ in range(5)];pages=[c.new_page() for c in contexts];a,z=pages[:2]
 for pg in pages:
  pg.route('https://opentdb.com/**',lambda r:r.fulfill(json={'trivia_categories':[]}));pg.on('pageerror',lambda e:print('JS ERROR',e,flush=True))
 a.goto(base+'/trivia-party');a.get_by_role('button',name='OPEN A PARTY TABLE',exact=True).click();a.get_by_label('Party invite link').wait_for();invite=a.get_by_label('Party invite link').input_value();[pg.goto(invite) for pg in pages[1:]]
 a.get_by_role('button',name='SINGLE TOPIC',exact=True).click();a.get_by_role('button',name='GRAMMAR',exact=True).click();
 for i,pg in enumerate(pages):
  pg.get_by_label('Your party name').fill(['Forrest','Jemma','Andrew','Joseph','Hubert'][i]);pg.get_by_role('button',name='READY FOR THE PARTY',exact=True).click()
 a.get_by_role('button',name='LOCK ROSTER · PREPARE QUIZ',exact=True).click();a.get_by_role('button',name='START THE PARTY',exact=True).click();a.locator('.quiz-master').wait_for();z.locator('.quiz-master').wait_for();a.screenshot(path='/downloads/deployed-quiz-party-five320.png');print('PARTY layout',a.locator('main.trivia-party').evaluate('(m)=>({scroll:m.scrollHeight,client:m.clientHeight,panel:m.querySelector(".trivia-party-play-area").scrollHeight,panelClient:m.querySelector(".trivia-party-play-area").clientHeight,timer:m.querySelector(".quiz-countdown").getBoundingClientRect().toJSON()})'),flush=True);[pg.locator('.trivia-brawl-answers button').first.click() for pg in pages];a.get_by_text('The answer is in',exact=True).wait_for();print('PASS real Party2-session question/lock/reveal',flush=True);a.screenshot(path='/downloads/deployed-quiz-party-five-reveal320.png');seen=[]
 for n in range(3):
  seen+=a.locator('.trivia-party-results>div>b').all_text_contents()
  if n<2:a.get_by_role('button',name='More results',exact=True).click()
 print('Result pages',seen,flush=True);assert len(seen)==5
 b.close()
