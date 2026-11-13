from playwright.sync_api import sync_playwright,expect
import subprocess,time,os,signal,json
ROOT='/home/sandbox/ct-film';server=subprocess.Popen(['npm','run','start','--','-p','3011'],cwd=ROOT,stdout=open('/tmp/find-local.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for saved in [False,True]:
   c=b.new_context(viewport={'width':320,'height':568});q=c.new_page();calls=[]
   if saved:c.add_init_script("localStorage.setItem('gametown-player-v1',JSON.stringify({id:'qa',username:'QA_User',token:'a'.repeat(64)}))")
   c.add_init_script("Storage.prototype.setItem=function(){throw Error('Browser storage blocked. Allow storage and retry.')} ")
   c.route('**/api/find-identity',lambda r:(calls.append(r.request.method),r.fulfill(json={'id':'qa','username':'QA_User'})))
   c.route('**/api/find-room/*',lambda r:(calls.append('ROOM'),r.fulfill(status=500,json={'error':'Must not be reached'})))
   for attempt in range(40):
    try:q.goto('http://localhost:3011/find');break
    except:time.sleep(.2)
   if saved:
    q.get_by_role('button',name='RETRY USERNAME CHECK').wait_for();assert 'ROOM' not in calls;assert calls==['GET']
   else:
    q.get_by_label('Claim your Game Town username').fill('QA_User');q.get_by_role('button',name='CLAIM & REMEMBER MY USERNAME').click();q.get_by_text('Browser storage blocked. Allow storage and retry.',exact=True).wait_for();assert not calls
   q.screenshot(path='/downloads/find-storage-blocked-'+str(saved)+'.png');assert q.locator('main').evaluate('(e)=>e.scrollHeight<=e.clientHeight+1');c.close()
  print('PASS blocked storage: no remote identity claim/room creation before pending credential saved; remembered identity failure offers retry; no remote room writes. Fixture only, no actual QA account created.',flush=True);b.close()
finally:os.killpg(server.pid,signal.SIGTERM)
