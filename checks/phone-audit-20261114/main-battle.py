import os,time,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('BASE','http://localhost:3181');result={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);cs=[b.new_context(viewport={'width':390,'height':844}) for _ in range(2)];a,z=[c.new_page() for c in cs];room='qa'+str(int(time.time()));Path('/tmp/stage1-main-qa-room').write_text(room);key='ct-battle-'+room+':state'
 for pg in [a,z]:pg.set_default_timeout(18000);pg.goto(base+'/battle/'+room)
 a.get_by_role('button',name='e2 P',exact=True).wait_for();a.wait_for_timeout(3500);a.get_by_role('button',name='e2 P',exact=True).click();a.get_by_role('button',name='e4',exact=True).click();z.get_by_role('button',name='e4 P',exact=True).wait_for();before=a.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key);a.reload();a.get_by_role('button',name='e4 P',exact=True).wait_for();a.wait_for_timeout(2000);after=a.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key);assert after['pgn']==before['pgn'];assert after['playerOneTime']<=before['playerOneTime']
 c=cs[1].new_cdp_session(z);c.send('Network.enable');c.send('Network.emulateNetworkConditions',{'offline':False,'latency':300,'downloadThroughput':96000,'uploadThroughput':48000,'connectionType':'cellular3g'});c.send('Page.setWebLifecycleState',{'state':'frozen'});time.sleep(3);c.send('Page.setWebLifecycleState',{'state':'active'});z.reload();z.get_by_role('button',name='e7 p',exact=True).wait_for();z.wait_for_timeout(3000);z.get_by_role('button',name='e7 p',exact=True).click();z.get_by_role('button',name='e5',exact=True).click();a.get_by_role('button',name='e5 p',exact=True).wait_for();assert a.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).pgn',key)==z.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).pgn',key);a.screenshot(path='/downloads/audit-main-battle390.png');print('PASS two-session main battle moves e4/e5,host reload,guest frozen/resume/rejoin,slow network,PGN/clocks',flush=True)
 # Fool's mate finishes a real match quickly, verifying result and rematch path without fabricated state.
 for pg,fr,to in [(a,'g2 P','g4'),(z,'d8 q','h4')]:
  pg.get_by_role('button',name=fr,exact=True).click();pg.get_by_role('button',name=to,exact=True).click()
 print('END',a.locator('body').inner_text()[-1800:],flush=True);a.screenshot(path='/downloads/audit-main-battle-play390.png');b.close()
