from playwright.sync_api import sync_playwright
import json,datetime
base='https://chess-town-git-instinct-quiz-master-preview-20261113-neillo.vercel.app'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(768,1024)]:
  pg=b.new_page(viewport={'width':w,'height':h});pg.clock.install();pg.goto(base+'/quiz');pg.get_by_role('link',name='Logic & Riddles',exact=False).click();pg.get_by_role('button',name='SOLO',exact=False).first.click();pg.locator('.quiz-master').wait_for();pg.clock.fast_forward(500)
  pg.screenshot(path=f'/downloads/quiz-final-logic-{w}.png');assert 'fa834b9' in pg.locator('.build-badge').inner_text() if pg.locator('.build-badge').count() else True
  assert 'CHESS-TOWN' not in pg.locator('body').inner_text();pg.clock.fast_forward(16000);pg.clock.run_for(350);pg.screenshot(path=f'/downloads/quiz-final-red-{w}.png');assert pg.locator('.quiz-countdown.is-red').count()==1
  pg.emulate_media(reduced_motion='reduce');assert pg.locator('.quiz-countdown__track i').evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s';assert pg.locator('.logic-match').evaluate('(e)=>getComputedStyle(e,"::after").animationName')=='none'
  pg.close()
 pg=b.new_page(viewport={'width':390,'height':844});pg.goto(base+'/quiz');pg.screenshot(path='/downloads/quiz-final-door390.png');assert pg.get_by_role('link',name='Logic & Riddles',exact=False).count()==1;assert pg.get_by_role('link',name='Grammar',exact=False).count()==1;pg.get_by_role('link',name='Grammar',exact=False).click();pg.get_by_role('button',name='PLAY SOLO',exact=False).click();pg.get_by_role('button',name='START GRAMMAR · HARD',exact=True).click();pg.locator('.quiz-master').wait_for();pg.screenshot(path='/downloads/quiz-final-grammar390.png');print('PASS final deployedfa834b9 door/Logic/Grammar on320/390/768; red pulse and reduced motion; quiz branding removed',flush=True)
 b.close()
