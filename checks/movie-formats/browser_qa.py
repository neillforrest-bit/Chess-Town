from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time
out=Path('/downloads/movie-formats');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3010/movie?format=series');page.wait_for_selector('text=The Pilot Club',timeout=15000)
 page.screenshot(path=str(out/'series-home.png'))
 page.get_by_role('button',name='01 Pilot Fight',exact=False).click();page.screenshot(path=str(out/'series-battle.png'))
 for _ in range(3):page.get_by_role('button',name='BACK THIS PILOT',exact=False).first.click()
 page.get_by_role('button',name='SAVE THE WINNER').click();page.screenshot(path=str(out/'series-winner.png'))
 page.get_by_role('button',name='← MODES',exact=True).click();page.get_by_role('button',name='02 Cold Open',exact=False).click()
 for i in range(5):
  page.locator('button').filter(has_text='NEXT →')
  page.locator('[class*=answers] button').first.click()
  if i==0:page.screenshot(path=str(out/'series-quiz.png'))
  page.get_by_role('button',name='NEXT →',exact=True).click()
 page.screenshot(path=str(out/'series-score.png'))
 page.get_by_label('Screen format').select_option('documentaries');page.screenshot(path=str(out/'docs-home.png'))
 page.get_by_role('button',name='01 Rabbit Hole',exact=False).click();page.get_by_label('Curiosity trail').select_option('Food');page.get_by_role('button',name='KEEP THIS').click();page.screenshot(path=str(out/'docs-rabbit.png'))
 page.get_by_role('button',name='← MODES',exact=True).click();page.get_by_role('button',name='03 Field notes',exact=False).click();assert 'Jiro Dreams of Sushi' in page.inner_text('body');page.screenshot(path=str(out/'docs-shelf.png'))
 page.get_by_role('button',name='← MODES',exact=True).click();page.get_by_role('button',name='02 Time Machine',exact=False).click();page.locator('[class*=answers] button').first.click();page.screenshot(path=str(out/'docs-quiz.png'))
 page.get_by_role('button',name='SOURCES & LIMITS').click();page.screenshot(path=str(out/'sources.png'))
 page.get_by_label('Screen format').select_option('films');page.screenshot(path=str(out/'films-home.png'))
 print('ERRORS',errors)
 print('BOUNDS',page.evaluate('({scroll:document.documentElement.scrollHeight,viewport:innerHeight,wide:document.documentElement.scrollWidth})'))
 print('FILM_LINK',page.get_by_role('link',name="LET’S WATCH →").count() if False else page.locator('a[href="/movie/find"]').get_attribute('href'))
 # Small phone and desktop menu checks.
 for w,h in [(375,667),(430,932),(1280,900)]:
  page.set_viewport_size({'width':w,'height':h});page.goto('http://localhost:3010/movie?format=documentaries');page.wait_for_selector('text=The Curiosity Department');page.screenshot(path=str(out/f'docs-{w}.png'))
 print('DONE')
 browser.close()
