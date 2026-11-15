from playwright.sync_api import sync_playwright
import os,subprocess,time,requests,signal,json
from urllib.parse import urlparse,parse_qs
os.makedirs('/downloads/invite237',exist_ok=True)
server=subprocess.Popen(['npm','run','start','--','-p','3121'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/party237-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3121/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);hc=b.new_context(viewport={'width':int(os.environ.get('WIDTH','390')),'height':int(os.environ.get('HEIGHT','680'))});gc=b.new_context(viewport={'width':320,'height':568});a=hc.new_page();z=gc.new_page();errors=[]
  for q in [a,z]:q.set_default_timeout(30000);q.on('pageerror',lambda e:errors.append(str(e)))
  a.goto(os.environ.get('BASE','http://localhost:3121')+'/trivia-party');a.get_by_role('button',name='OPEN A PARTY TABLE',exact=True).click();a.get_by_label('Party invite link').wait_for();link=a.get_by_label('Party invite link').input_value();assert 'durable=1' in link;room=parse_qs(urlparse(link).query)['room'][0];secret=a.evaluate('(r)=>localStorage.getItem("gt-durable-invite-v1:trivia-party:"+r+":host")',room);json.dump({'game':'trivia-party','room':room,'secret':secret},open('/tmp/party237-cleanup.json','w'));
  if os.environ.get('AGE_SIX_DAYS'):
   open('/tmp/gameinvite234-test.sql','w').write("update public.preview_invites_v1 set created_at=now()-interval '6 days',expires_at=now()+interval '1 day' where game='trivia-party' and room_id='"+room+"';");subprocess.run(['python','/tmp/gameinvite234-db.py','test'],check=True)
  a.close()
  z.goto(link);z.get_by_role('heading',name='Your place is saved').wait_for();z.wait_for_timeout(17000);z.screenshot(path='/downloads/invite237/party-wait-320.png');assert not z.get_by_role('alert').inner_text().strip();print('PASS host-away guest wait17s',flush=True)
  a=hc.new_page();a.goto(link);a.get_by_label('Party invite link').wait_for();z.get_by_label('Your party name').wait_for();a.screenshot(path='/downloads/invite237/party-host-390.png');z.screenshot(path='/downloads/invite237/party-guest-320.png')
  a.set_viewport_size({'width':320,'height':568});contexts=[hc,gc];guests=[z]
  for n in range(3):
   c=b.new_context(viewport={'width':320,'height':568});contexts.append(c);q=c.new_page();q.set_default_timeout(30000);q.goto(link);q.get_by_label('Your party name').wait_for();guests.append(q)
  a.get_by_role('button',name='5/5 players',exact=True).wait_for();a.get_by_role('button',name='5/5 players',exact=True).click();a.screenshot(path='/downloads/invite237/party-five-320.png');print('PASS five saved seats',flush=True)
  extra=b.new_context(viewport={'width':320,'height':568});x=extra.new_page();x.goto(link);x.get_by_role('alert').filter(has_text='All guest places are taken').wait_for();print('PASS sixth guest refused',flush=True)
  # Remove player two and replace with an independent sixth browser. Revocation survives reload.
  a.on('dialog',lambda d:d.accept());a.get_by_role('button',name='REMOVE SEAT',exact=True).first.click();z.get_by_role('alert').filter(has_text='removed').wait_for();z.reload();z.get_by_role('alert').filter(has_text='removed').wait_for();x.reload();x.get_by_label('Your party name').wait_for();guests=guests[1:]+[x];a.get_by_role('button',name='5/5 players',exact=True).wait_for();print('PASS removed guest revoked and replacement joins',flush=True)
  a.get_by_role('button',name='Setup',exact=True).click();a.get_by_label('Party topic').select_option('grammar');a.get_by_role('button',name='Invite',exact=True).click()
  for n,q in enumerate([a]+guests):q.get_by_label('Your party name').fill('PLAYER '+str(n+1));q.get_by_role('button',name='READY FOR THE PARTY',exact=True).click()
  a.get_by_role('button',name='LOCK ROSTER · PREPARE QUIZ',exact=True).click();a.get_by_role('button',name='START THE PARTY',exact=True).wait_for();a.screenshot(path='/downloads/invite237/party-five-intro-320.png');a.get_by_role('button',name='START THE PARTY',exact=True).click();a.locator('.trivia-brawl-answers button').first.wait_for();a.screenshot(path='/downloads/invite237/party-five-question-320.png')
  for q in [a]+guests:q.locator('.trivia-brawl-answers button').first.click()
  a.get_by_role('button',name='NEXT QUESTION',exact=True).wait_for();a.screenshot(path='/downloads/invite237/party-five-reveal-320.png');a.get_by_role('button',name='More results',exact=True).click();a.screenshot(path='/downloads/invite237/party-five-page2-320.png');print('PASS five answers/reveal/pages',flush=True)
  cfg=json.load(open('/tmp/gameinvite234-public.json'));r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_delete_v1',headers={'apikey':cfg['key'],'Authorization':'Bearer '+cfg['key']},json={'p_game':'trivia-party','p_room':room,'p_secret':secret});assert r.ok and r.json() is True;assert not errors,errors;print('Exact QA room deleted',flush=True);b.close()
finally:os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
