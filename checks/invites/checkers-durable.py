from playwright.sync_api import sync_playwright
import re
import os,subprocess,time,requests,signal,json
from urllib.parse import urlparse,parse_qs
os.makedirs('/downloads/invite238',exist_ok=True)
server=subprocess.Popen(['npm','run','start','--','-p','3121'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/ck238-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3121/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);hc=b.new_context(viewport={'width':int(os.environ.get('WIDTH','390')),'height':int(os.environ.get('HEIGHT','680'))});gc=b.new_context(viewport={'width':320,'height':568});a=hc.new_page();z=gc.new_page();errors=[]
  for q in [a,z]:q.set_default_timeout(30000);q.on('pageerror',lambda e:errors.append(str(e)))
  a.goto(os.environ.get('BASE','http://localhost:3121')+'/play-checkers?mode=battle');a.get_by_role('button',name='CREATE SAVED CHECKERS INVITE',exact=True).click();a.get_by_label('Checkers invite link').wait_for();link=a.get_by_label('Checkers invite link').input_value();room=parse_qs(urlparse(link).query)['room'][0];secret=a.evaluate('(r)=>localStorage.getItem("gt-durable-invite-v1:checkers:"+r+":host")',room);json.dump({'game':'checkers','room':room,'secret':secret},open('/tmp/ck238-cleanup.json','w'))
  if os.environ.get('AGE_SIX_DAYS'):
   open('/tmp/gameinvite234-test.sql','w').write("update public.preview_invites_v1 set created_at=now()-interval '6 days',expires_at=now()+interval '1 day' where game='checkers' and room_id='"+room+"';");subprocess.run(['python','/tmp/gameinvite234-db.py','test'],check=True)
  a.close();z.goto(link);z.get_by_role('heading',name='Your place is saved',exact=True).wait_for();z.wait_for_timeout(17000);assert not z.get_by_role('alert').inner_text().strip();z.screenshot(path='/downloads/invite238/ck-wait-320.png');print('PASS guest host-away17s',flush=True)
  a=hc.new_page();a.goto(link);a.get_by_label('Checkers invite link').wait_for();z.get_by_role('button',name='I AM READY',exact=True).wait_for();a.screenshot(path='/downloads/invite238/ck-lobby-host.png');z.screenshot(path='/downloads/invite238/ck-lobby-guest320.png')
  a.get_by_role('button',name='I AM READY',exact=True).click();a.reload();a.get_by_role('button',name='READY · WAITING FOR PARTNER',exact=True).wait_for();print('PASS Ready immediate reload',flush=True);z.get_by_role('button',name='I AM READY',exact=True).click();a.locator('.saved-ck-board').wait_for();z.locator('.saved-ck-board').wait_for()
  def move(q,fr,to):
   for sq in [fr,to]:q.locator('.saved-ck-board').get_by_role('button',name=sq+' ',exact=False).click()
  def plies(q,n):q.wait_for_function('(n)=>document.querySelector("main.saved-ck")?.dataset.plies===String(n)' ,arg=n)
  move(a,'a3','b4');plies(a,1);a.reload();a.locator('.saved-ck-board').wait_for();plies(a,1);plies(z,1);move(z,'b6','a5');plies(a,2);plies(z,2);a.screenshot(path='/downloads/invite238/ck-move-host.png');z.screenshot(path='/downloads/invite238/ck-move-guest320.png');print('PASS real legal moves and immediate host reload at ply1',flush=True)
  x=b.new_context().new_page();x.goto(link+'&host=1');x.get_by_role('alert').filter(has_text=re.compile('All guest places are taken|already started')).wait_for();print('PASS extra guest and host=1 escalation refused',flush=True)
  a.close();z.wait_for_function('document.querySelector("main.saved-ck").innerText.includes("Host is offline")');a=hc.new_page();a.goto(link);a.locator('.saved-ck-board').wait_for();plies(a,2);z.wait_for_function('document.querySelector(".saved-ck-turn").innerText.includes("Partner to move")');a.close();z.close();a=hc.new_page();z=gc.new_page();a.goto(link);z.goto(link);a.locator('.saved-ck-board').wait_for();z.locator('.saved-ck-board').wait_for();plies(a,2);plies(z,2);print('PASS both new-tab same-link seats/board restore',flush=True)
  move(a,'c3','d4');plies(a,3);plies(z,3);assert not errors,errors;cfg=json.load(open('/tmp/gameinvite234-public.json'));r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_delete_v1',headers={'apikey':cfg['key'],'Authorization':'Bearer '+cfg['key']},json={'p_game':'checkers','p_room':room,'p_secret':secret});assert r.ok and r.json() is True;print('PASS resumed next move; exact QA deleted',flush=True);b.close()
finally:os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
