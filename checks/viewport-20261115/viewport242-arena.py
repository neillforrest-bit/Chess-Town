from playwright.sync_api import sync_playwright
import os,subprocess,time,requests,signal,json
from urllib.parse import urlparse,parse_qs
os.makedirs('/downloads/viewport242/arena',exist_ok=True)
server=subprocess.Popen(['npm','run','start','--','-p','3121'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/arena239-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3121/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);hc=b.new_context(viewport={'width':int(os.environ.get('WIDTH','390')),'height':int(os.environ.get('HEIGHT','680'))});gc=b.new_context(viewport={'width':320,'height':568});a=hc.new_page();z=gc.new_page();errors=[];paid=[]
  for c in [hc,gc]:c.route('**/api/chester/chat',lambda r:(paid.append(r.request.url),r.abort()))
  for q in [a,z]:q.set_default_timeout(30000);q.on('pageerror',lambda e:errors.append(str(e)))
  a.goto(os.environ.get('BASE','http://localhost:3121')+'/battle');a.get_by_role('button',name='CREATE SAVED ARENA',exact=True).click();a.get_by_label('Arena invite link').wait_for();link=a.get_by_label('Arena invite link').input_value();room=urlparse(link).path.split('/')[-1];secret=a.evaluate('(r)=>localStorage.getItem("gt-durable-invite-v1:chess:arena-"+r+":host")',room);json.dump({'game':'chess','room':'arena-'+room,'secret':secret},open('/tmp/arena239-cleanup.json','w'));a.close()
  z.goto(link);z.get_by_text('Your place is saved if the invite is active.',exact=False).wait_for();z.wait_for_timeout(300);z.screenshot(path='/downloads/viewport242/arena/arena-wait320.png');assert not z.locator('p[role=alert]').count();print('PASS saved guest host-away17s',flush=True)
  a=hc.new_page();a.goto(link);a.get_by_label('Arena invite link').wait_for();z.get_by_role('button',name='READY FOR THE ARENA',exact=True).wait_for();a.get_by_label('Arena fighter name').fill('HOST QA');a.get_by_role('button',name='READY FOR THE ARENA',exact=True).click();a.reload();a.get_by_role('button',name='READY · WAITING',exact=True).wait_for();print('PASS atomic Ready name immediate reload',flush=True);z.get_by_label('Arena fighter name').fill('GUEST QA');z.get_by_role('button',name='READY FOR THE ARENA',exact=True).click();a.locator('.tapboard').wait_for();z.locator('.tapboard').wait_for();a.wait_for_timeout(6000);a.screenshot(path='/downloads/viewport242/arena/arena-board-host.png');z.screenshot(path='/downloads/viewport242/arena/arena-board-guest320.png');print('HOST',a.locator('main.battle-shell').inner_text()[:1100],flush=True)
  def move(q,fr,to):
   q.locator('.tapboard').get_by_role('button',name=fr,exact=False).click();q.locator('.tapboard').get_by_role('button',name=to,exact=False).click()
  def position(q,fr,to):
   q.locator('.tapboard').get_by_role('button',name=to,exact=False).locator('img').wait_for();q.wait_for_function('(sq)=>!document.querySelector("button[aria-label^="+sq+"] img")',arg=fr)
  move(a,'e2','e4');position(a,'e2','e4');a.reload();a.locator('.tapboard').wait_for();position(a,'e2','e4');position(z,'e2','e4');print('PASS real e4 immediate reload',flush=True);a.wait_for_timeout(6000);move(z,'e7','e5');position(a,'e7','e5');position(z,'e7','e5');print('PASS guest e5 confirmed',flush=True)
  a.close();z.wait_for_function('document.querySelector(".battle-saved-status").innerText.includes("Rival away")');z.wait_for_timeout(3000);a=hc.new_page();a.goto(link);a.locator('.tapboard').wait_for();position(a,'e7','e5');a.wait_for_timeout(6000);move(a,'g1','f3');position(a,'g1','f3');position(z,'g1','f3');a.screenshot(path='/downloads/viewport242/arena/arena-restored-host.png');z.screenshot(path='/downloads/viewport242/arena/arena-restored-guest320.png');print('PASS host away/new-tab restored and next move',flush=True)
  a.close();z.close();a=hc.new_page();z=gc.new_page();a.goto(link);z.goto(link);a.locator('.tapboard').wait_for();z.locator('.tapboard').wait_for();position(a,'g1','f3');position(z,'g1','f3');print('PASS both new-tab restore board/seats',flush=True)
  cfg=json.load(open('/tmp/gameinvite234-public.json'));r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_delete_v1',headers={'apikey':cfg['key'],'Authorization':'Bearer '+cfg['key']},json={'p_game':'chess','p_room':'arena-'+room,'p_secret':secret});assert r.ok and r.json() is True;assert not errors,errors;assert not paid,paid;print('Exact QA deleted',flush=True);b.close()
finally:os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
