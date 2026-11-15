from playwright.sync_api import sync_playwright
import re
import os,subprocess,time,requests,signal,json
from urllib.parse import urlparse,parse_qs
os.makedirs('/downloads/viewport242/duel',exist_ok=True)
server=subprocess.Popen(['npm','run','start','--','-p','3121'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/duel240-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3121/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);hc=b.new_context(viewport={'width':int(os.environ.get('WIDTH','390')),'height':int(os.environ.get('HEIGHT','680'))});gc=b.new_context(viewport={'width':320,'height':568});a=hc.new_page();z=gc.new_page();errors=[];paid=[]
  for c in [hc,gc]:c.route('**/api/chester/commentary',lambda r:(paid.append(r.request.url),r.abort()));c.route('**/api/chester/chat',lambda r:(paid.append(r.request.url),r.abort()))
  for c in [hc,gc]:c.on('page',lambda q:q.on('pageerror',lambda e:errors.append(str(e))))
  for q in [a,z]:q.set_default_timeout(20000);q.on('pageerror',lambda e:errors.append(str(e)))
  a.goto('http://localhost:3121/duel');a.get_by_label('Duel clock').select_option('0' if os.environ.get('NO_CLOCK') else '180')
  if os.environ.get('WAR'):a.get_by_label('Duel game').select_option('war')
  a.get_by_role('button',name='CREATE SAVED DUEL INVITE',exact=True).click();a.get_by_label('Duel invite link').wait_for();link=a.get_by_label('Duel invite link').input_value();room=parse_qs(urlparse(link).query)['room'][0];secret=a.evaluate('(r)=>localStorage.getItem("gt-durable-invite-v1:chess:duel-"+r+":host")',room);json.dump({'game':'chess','room':'duel-'+room,'secret':secret},open('/tmp/duel240-cleanup.json','w'));
  if os.environ.get('AGE_SIX_DAYS'):
   open('/tmp/gameinvite234-test.sql','w').write("update public.preview_invites_v1 set created_at=now()-interval '6 days',expires_at=now()+interval '1 day' where game='chess' and room_id='duel-"+room+"';");subprocess.run(['python','/tmp/gameinvite234-db.py','test'],check=True)
  a.close();z.goto(link);z.get_by_text('Your place is saved if the invite is active.',exact=False).wait_for();z.wait_for_timeout(300);assert not ''.join(z.get_by_role('alert').all_inner_texts());z.screenshot(path='/downloads/viewport242/duel/wait320.png');print('PASS host-away17s',flush=True)
  a=hc.new_page();a.goto(link);a.get_by_role('button',name='READY FOR THE DUEL',exact=True).wait_for();z.get_by_role('button',name='READY FOR THE DUEL',exact=True).wait_for();a.get_by_role('button',name='READY FOR THE DUEL',exact=True).click();a.reload();a.get_by_role('button',name='READY · WAITING',exact=True).wait_for();z.get_by_role('button',name='READY FOR THE DUEL',exact=True).click();a.wait_for_timeout(6500);a.screenshot(path='/downloads/viewport242/duel/board-host.png');z.screenshot(path='/downloads/viewport242/duel/board-guest320.png');print('HOST',a.locator('main').all_inner_texts(),flush=True);print('ERRORS',errors,flush=True)
  for q in [a,z]:q.evaluate('window.__qaFen=null;window.addEventListener("duel-turn",e=>window.__qaFen=e.detail.fen);window.addEventListener("chester-position-now",e=>window.__qaFen=e.detail.fen)')
  def move(q,fr,to,black=False):
   if os.environ.get('WAR'):
    for sq in [fr,to]:q.locator('.tapboard').get_by_role('button',name=sq,exact=False).click()
   else:
    box=q.locator('canvas').bounding_box()
    for sq in [fr,to]:
     col=ord(sq[0])-97;row=8-int(sq[1]);col=7-col if black else col;row=7-row if black else row;q.mouse.click(box['x']+(30+col*92+46)/800*box['width'],box['y']+(30+row*92+46)/800*box['height'])
  move(a,'e2','e4');a.wait_for_function('document.querySelector(".chester-matchbar__turn")?.innerText.includes("RIVAL")' if not os.environ.get('WAR') else 'document.querySelector(".tapboard button[aria-label^=e4] img")');a.reload();a.wait_for_timeout(6500);a.screenshot(path='/downloads/viewport242/duel/move-reload.png');print('PASS actual White e4 then immediate reload',flush=True)
  move(z,'e7','e5',True);z.wait_for_timeout(1500);z.screenshot(path='/downloads/viewport242/duel/reply-guest320.png');print('AFTER',z.locator('main').all_inner_texts(),flush=True)
  a.close();z.wait_for_function('document.querySelector(".saved-duel-status").innerText.includes("Rival away")');a=hc.new_page();a.goto(link);a.wait_for_timeout(6500);move(a,'g1','f3') if not os.environ.get('WAR') else move(a,'d2','d4');a.wait_for_timeout(700);a.close();z.close();a=hc.new_page();z=gc.new_page();a.goto(link);z.goto(link);a.wait_for_timeout(6500)
  def read(q):
   if os.environ.get('WAR'):
    assert q.locator('.tapboard').get_by_role('button',name='d4',exact=False).locator('img').count();return
   q.evaluate('window.__qaSnap=null;window.addEventListener("chess-sync-state",e=>window.__qaSnap=e.detail,{once:true});window.dispatchEvent(new CustomEvent("chess-sync-request"))');q.wait_for_function('window.__qaSnap?.pgn.includes("Nf3")');assert len(q.evaluate('window.__qaSnap.timeline'))==4
  read(a);read(z);a.screenshot(path='/downloads/viewport242/duel/restored-host.png');z.screenshot(path='/downloads/viewport242/duel/restored-guest320.png');print('PASS host-away return,next move,both fresh tabs exact board/seats',flush=True)
  x=b.new_context().new_page();x.goto(link+'&host=1');x.get_by_role('alert').filter(has_text=re.compile('All guest places are taken|already started')).wait_for();x.close();print('PASS third guest/host flag refused',flush=True)
  cfg=json.load(open('/tmp/gameinvite234-public.json'));h={'apikey':cfg['key'],'Authorization':'Bearer '+cfg['key']};r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_host_v1',headers=h,json={'p_game':'chess','p_room':'duel-'+room,'p_secret':secret});assert r.json()['snapshot']['state']['rev']==3;print('PASS confirmed third ply persisted',flush=True)
  if os.environ.get('RESIGN'):
   a.get_by_role('button',name='Open match menu',exact=True).click();a.get_by_role('button',name=re.compile('RESIGN MATCH')).click();a.get_by_role('button',name=re.compile('CONFIRM RESIGN')).click();a.locator('.saved-duel-status').filter(has_text='You resigned.').wait_for();z.locator('.saved-duel-status').filter(has_text='Rival resigned. You win.').wait_for();a.reload();a.locator('.saved-duel-status').filter(has_text='You resigned.').wait_for();a.screenshot(path='/downloads/viewport242/duel/resign-restored.png');print('PASS confirmed resign reaches both seats and survives reload',flush=True)
  if os.environ.get('END_FIXTURE'):
   a.close();z.close();subprocess.run(['node','/tmp/duel240-endfixture.cjs','war' if os.environ.get('WAR') else 'chess'],check=True);fixture=json.load(open('/tmp/duel240-endfixture.json'));v=r.json();state=v['snapshot'];state['state'].update(fixture);state['at']=int(time.time()*1000);state.pop('__inviteWrite',None);r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_host_v1',headers=h,json={'p_game':'chess','p_room':'duel-'+room,'p_secret':secret,'p_expected':v['revision'],'p_snapshot':state,'p_phase':'playing'});assert r.ok and r.json()['status']=='saved';a=hc.new_page();z=gc.new_page();a.goto(link);z.goto(link);a.wait_for_timeout(3500)
   if os.environ.get('WAR'):
    a.screenshot(path='/downloads/viewport242/duel/prepromotion.png');move(a,'a7','a8');a.wait_for_timeout(1500);a.screenshot(path='/downloads/viewport242/duel/postpromotion.png');print('PROMOTION',a.locator('body').inner_text(),flush=True);a.get_by_text('You queened a pawn - pawn star!',exact=False).wait_for()
   else:move(z,'d8','h4',True);a.locator('.saved-duel-status').filter(has_text='Black wins by mate.').wait_for()
   a.reload();a.wait_for_timeout(3000);a.locator('.saved-duel-status').filter(has_text='wins by').wait_for();
   if os.environ.get('WAR'):a.get_by_text('You queened a pawn - pawn star!',exact=False).wait_for();a.locator('.tapboard').get_by_role('button',name='a8 Q',exact=True).wait_for()
   a.screenshot(path='/downloads/viewport242/duel/end-restored.png');print('PASS actual end move,stored outcome survives immediate reload',flush=True)
  if os.environ.get('FAILURES'):
   a.route('**/rest/v1/rpc/preview_invite_host_v1',lambda route:route.fulfill(status=503,content_type='application/json',body='{"message":"QA duel save outage"}') if route.request.post_data_json.get('p_snapshot') else route.continue_());move(z,'b8','c6',True) if not os.environ.get('WAR') else move(z,'d7','d5',True);a.locator('.saved-duel-status').filter(has_text='QA duel save outage').wait_for();a.wait_for_timeout(500);assert 'QA duel save outage' in a.locator('.saved-duel-status').inner_text();a.unroute('**/rest/v1/rpc/preview_invite_host_v1');a.reload();a.wait_for_timeout(3000);r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_host_v1',headers=h,json={'p_game':'chess','p_room':'duel-'+room,'p_secret':secret});assert r.json()['snapshot']['state']['rev']==4;print('PASS persistent save outage,journal recovery exact fourth ply',flush=True)
   a.close();z.close();open('/tmp/gameinvite234-test.sql','w').write("update public.preview_invites_v1 set expires_at=now()-interval '1 second' where game='chess' and room_id='duel-"+room+"';");subprocess.run(['python','/tmp/gameinvite234-db.py','test'],check=True);z=gc.new_page();z.goto(link);z.get_by_role('alert').filter(has_text='expired').wait_for();assert not z.locator('canvas').count() and not z.locator('.tapboard').count();print('PASS expired refusal,no reset',flush=True)
  if os.environ.get('CLOCK_AWAY'):
   a.close();z.close();v=r.json();state=v['snapshot'];state['state']['b']=1000;state['at']=int(time.time()*1000);state.pop('__inviteWrite',None);r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_host_v1',headers=h,json={'p_game':'chess','p_room':'duel-'+room,'p_secret':secret,'p_expected':v['revision'],'p_snapshot':state,'p_phase':'playing'});assert r.ok and r.json()['status']=='saved';time.sleep(2);a=hc.new_page();a.goto(link);a.get_by_text('⚡ FLAG FALL - rival ran out of time. You win on the clock!',exact=True).wait_for();a.screenshot(path='/downloads/viewport242/duel/clock-recovered.png');print('PASS actual both-away clock flagfall settled on return',flush=True)
  r=requests.post(cfg['url']+'/rest/v1/rpc/preview_invite_delete_v1',headers=h,json={'p_game':'chess','p_room':'duel-'+room,'p_secret':secret});print('Exact QA deleted',r.ok,r.text,flush=True);assert not errors,errors;assert not paid,paid;b.close()
finally:os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
