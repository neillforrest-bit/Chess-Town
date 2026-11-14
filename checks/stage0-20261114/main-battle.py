import os,time
from playwright.sync_api import sync_playwright
base=os.environ.get('BASE','http://localhost:3180')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);cs=[b.new_context(viewport={'width':390,'height':844}) for _ in range(2)];a,z=[c.new_page() for c in cs];room='qa'+str(int(time.time()));errors=[]
 for pg in [a,z]:pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/battle/'+room)
 a.get_by_role('button',name='e2 P',exact=True).wait_for(timeout=45000);a.get_by_role('button',name='e2 P',exact=True).click();a.get_by_role('button',name='e4',exact=True).click();key='ct-battle-'+room+':state';a.wait_for_function('(key)=>JSON.parse(localStorage.getItem(key)||"{}").pgn?.includes("e4")',arg=key);before=a.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key);a.reload();a.get_by_role('button',name='e4 P',exact=True).wait_for();after=a.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key);assert after['pgn']==before['pgn'];assert after['playerOneTime']<=before['playerOneTime'];a.screenshot(path='/downloads/stage0-main-battle-restored390.png');print('PASS canonical main chess battle local PGN/remaining clock survived refresh',flush=True);assert not errors,errors;b.close()
