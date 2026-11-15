from playwright.sync_api import sync_playwright
import os,subprocess,time,requests,signal,json
from urllib.parse import urlparse,parse_qs
server=subprocess.Popen(['npm','run','start','--','-p','3121'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/trivia236-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
os.makedirs('/downloads/viewport242/trivia',exist_ok=True)
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3121/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);hc=b.new_context(viewport={'width':int(os.environ.get('WIDTH','390')),'height':int(os.environ.get('HEIGHT','680'))});gc=b.new_context(viewport={'width':320,'height':568});a=hc.new_page();z=gc.new_page()
  for q in [a,z]:q.set_default_timeout(25000);q.on('pageerror',lambda e:print('PAGEERROR',str(e),flush=True))
  a.goto(os.environ.get('BASE','http://localhost:3121')+'/trivia-brawl?triviaFreeCommentary=1');
  if os.environ.get('TOPIC')=='grammar':a.get_by_label('Quiz format').select_option('single')
  a.get_by_role('button',name='PLAY A FRIEND · SEND INVITE',exact=True).click();a.get_by_role('heading',name='Player One:',exact=False).wait_for();print('HOST',a.locator('main.trivia-brawl-page').inner_text(),flush=True);a.get_by_role('textbox',name='Your name',exact=True).fill('Host QA');a.get_by_role('button',name='SEND THE INVITE',exact=True).click();a.get_by_role('heading',name='Host QA:',exact=False).wait_for();a.get_by_text('SHOW INVITE LINK',exact=True).click();link=a.get_by_label('Invite link for Player 2').input_value();assert 'durable=1' in link;room=parse_qs(urlparse(link).query)['match'][0];secret=a.evaluate('(r)=>localStorage.getItem("gt-durable-invite-v1:trivia-duel:"+r+":host")',room);json.dump({'game':'trivia-duel','room':room,'secret':secret},open('/tmp/trivia236-cleanup.json','w'));
  if os.environ.get('AGE_SIX_DAYS')=='1':
   exec(open('/tmp/gameinvite234-db.py').read().split('if sys.argv')[0]);subprocess.run(args+['-c',"update public.preview_invites_v1 set created_at=now()-interval '6 days',expires_at=now()+interval '1 day',host_seen_at=now()-interval '6 days' where game='trivia-duel' and room_id='"+room+"';"],env=e,check=True)
  a.close()
  z.goto(link);z.get_by_role('heading',name='Your place is saved').wait_for();z.wait_for_timeout(300);assert 'Connection paused after' not in z.locator('main.trivia-brawl-page').inner_text();z.screenshot(path='/downloads/viewport242/trivia/trivia-wait-320.png');print('PASS guest waits17s with host closed',flush=True)
  a=hc.new_page();a.goto(link);a.get_by_role('heading',name='Host QA:',exact=False).wait_for();z.get_by_role('button',name='JOIN THIS MATCH',exact=True).wait_for();print('RETURN HOST',a.locator('main.trivia-brawl-page').inner_text(),flush=True);print('RETURN GUEST',z.locator('main.trivia-brawl-page').inner_text(),flush=True);a.screenshot(path='/downloads/viewport242/trivia/trivia-host-return-390.png');z.screenshot(path='/downloads/viewport242/trivia/trivia-guest-320.png')
  z.get_by_role('textbox',name='Your name',exact=True).fill('Guest QA');z.get_by_role('button',name='JOIN THIS MATCH',exact=True).click();z.wait_for_function('!document.querySelector("main.trivia-brawl-page").innerText.includes("JOIN THIS MATCH")');print('JOINED',z.locator('main.trivia-brawl-page').inner_text(),flush=True)
  for q in [a,z]:
   if q==a:q.get_by_role('button',name='CONFIRM MY TOPIC' if os.environ.get('TOPIC')=='grammar' else 'CHOOSE MY CATEGORIES',exact=True).click()
   if os.environ.get('TOPIC')!='grammar':
    for n in range(3):q.locator('.trivia-brawl-categories button').nth(n).click()
   q.get_by_role('button',name='LOCK ',exact=False).click()
   if q==a:
    a.reload();a.get_by_role('heading',name='Host QA:',exact=False).wait_for();a.wait_for_function('document.querySelector(".trivia-ready-board").innerText.includes("✓ Ready")');print('PASS lock categories immediate reload',flush=True)
  print('PRESTART HOST',a.locator('main.trivia-brawl-page').inner_text(),flush=True);print('PRESTART GUEST',z.locator('main.trivia-brawl-page').inner_text(),flush=True);a.get_by_role('button',name='START THE BRAWL',exact=True).click()
  print('STARTED HOST',a.locator('main.trivia-brawl-page').inner_text(),flush=True);print('STARTED GUEST',z.locator('main.trivia-brawl-page').inner_text(),flush=True);a.screenshot(path='/downloads/viewport242/trivia/grammar-start-390.png');
  for i in range(5):
   for q in [a,z]:q.locator('.trivia-brawl-answers button').first.wait_for()
   if i==0:
    for n,q in enumerate([a,z]):
     q.get_by_role('button',name='WILDCARDS · OPEN YOUR HAND',exact=True).click();q.get_by_role('dialog',name='Your wildcards',exact=True).wait_for();q.screenshot(path='/downloads/viewport242/trivia/wildcard-'+str(n)+'.png');q.get_by_role('button',name='MORE CARDS',exact=True).click();q.screenshot(path='/downloads/viewport242/trivia/wildcard-page2-'+str(n)+'.png');q.get_by_role('button',name='BACK TO QUESTION ×',exact=True).click()
   for q in [a,z]:q.locator('.trivia-brawl-answers button').first.click()
   a.get_by_role('button',name='NEXT QUESTION' if i<4 else '⚡ FLASH FINALE',exact=True).wait_for();a.get_by_role('button',name='NEXT QUESTION' if i<4 else '⚡ FLASH FINALE',exact=True).click()
  for n,q in enumerate([a,z]):
   q.get_by_role('dialog',name='FLASH FINALE · SHARED TABLE',exact=True).wait_for();q.screenshot(path='/downloads/viewport242/trivia/shared-flash-'+str(n)+'.png');assert q.locator('.gt-shared-nav').bounding_box()['y']==0;print('PASS actual shared flash popup phone',n,flush=True)
   for bt in q.locator('.quiz-game-popup button').all():
    box=bt.bounding_box()
    if bt.is_visible():assert box['y']>=56 and box['y']+box['height']<=q.viewport_size['height']+1,box
  print('PASS actual five questions, both independent wildcard pickers, shared flash popup on both phones',flush=True)
  # preserve exact identity for further continuation tests
  hc.storage_state(path='/tmp/trivia236-host-storage.json');gc.storage_state(path='/tmp/trivia236-guest-storage.json');cfg=json.load(open('/tmp/gameinvite234-public.json'));r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_delete_v1',headers={'apikey':cfg['key'],'Authorization':'Bearer '+cfg['key']},json={'p_game':'trivia-duel','p_room':room,'p_secret':secret});assert r.ok and r.json() is True;print('Exact QA room deleted',flush=True);b.close()
finally:os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
