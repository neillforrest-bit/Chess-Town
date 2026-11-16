from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import os,json
out=Path('/downloads/cove3d');out.mkdir(exist_ok=True);base=os.environ.get('COVE_URL','http://localhost:3037')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w,h in [(390,844),(320,568),(1200,850)]:
  q=b.new_page(viewport={'width':w,'height':h});errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.goto(base+'/golf-cove');q.wait_for_selector('[data-cove-ready=true]',timeout=60000);q.wait_for_timeout(2500);q.screenshot(path=str(out/f'welcome-{w}.png'));q.get_by_role('button',name='STEP INTO THE SUMMER').click();q.get_by_role('button',name='GATHER THE CREW').click();q.get_by_role('button',name='LET’S MAKE A MEMORY').click();q.wait_for_timeout(2400);q.screenshot(path=str(out/f'play-{w}.png'));print(w,'metrics',q.locator('[data-fps]').get_attribute('data-fps'),q.locator('[data-triangles]').get_attribute('data-triangles'),q.locator('[data-draw-calls]').get_attribute('data-draw-calls'),'errors',errors)
  q.get_by_role('button',name='SCOUT THE HOLE').click();q.wait_for_timeout(1600);q.screenshot(path=str(out/f'scout-{w}.png'));assert not errors; q.close()
 b.close()
