from playwright.sync_api import sync_playwright
import os,subprocess,time,requests,signal,json,secrets,re
from urllib.parse import urlparse,parse_qs
os.makedirs('/downloads/haywire242',exist_ok=True);cfg=json.load(open('/tmp/gameinvite234-public.json'));h={'apikey':cfg['key'],'Authorization':'Bearer '+cfg['key']};room=None;secret=None;base=os.environ.get('BASE','http://localhost:3121')
server=subprocess.Popen(['npm','run','start','--','-p','3121'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/haywire242-duet-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
def rpc(n,b):return requests.post(cfg['url']+'/rest/v1/rpc/'+n,headers=h,json=b)
def machine():
 r=rpc('preview_invite_host_v1',{'p_game':'haywire','p_room':room,'p_secret':secret});assert r.ok,r.text;return r.json()['snapshot']['machine']
try:
 for _ in range(80):
  try:
   if requests.get('http://localhost:3121/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);ha=b.new_context(viewport={'width':390,'height':844});ga=b.new_context(viewport={'width':320,'height':568});a=ha.new_page();z=ga.new_page();errors=[]
  for q in [a,z]:q.set_default_timeout(20000);q.on('pageerror',lambda e:errors.append(str(e)))
  a.goto(base+'/haywire');a.get_by_label('Your name',exact=True).fill('Host QA');a.get_by_label('Shift mode',exact=True).select_option(os.environ['MODE']);a.get_by_role('button',name='CREATE TWO-PLAYER INVITE',exact=True).click();a.get_by_label('Duet invite').wait_for();link=a.get_by_label('Duet invite').input_value();room=parse_qs(urlparse(link).query)['room'][0];secret=a.evaluate('(r)=>localStorage.getItem("gt-durable-invite-v1:haywire:"+r+":host")',room);json.dump({'room':room,'secret':secret},open('/tmp/haywire242-cleanup.json','w'));assert machine()['rules']==2 and machine()['mode']==os.environ['MODE']
  a.close();z.goto(link);z.get_by_label('Your name',exact=True).fill('Guest QA');z.get_by_role('button',name='JOIN / RESTORE THIS MACHINE',exact=True).click();z.get_by_role('heading',name='Your place is saved').wait_for();z.wait_for_timeout(17000);z.screenshot(path='/downloads/haywire242/duet-host-away320.png');a=ha.new_page();a.goto(link);a.get_by_role('button',name='JOIN / RESTORE THIS MACHINE',exact=True).click();a.wait_for_function('document.querySelector(".hay").innerText.includes("2 / 2 connected")');z.wait_for_function('document.querySelector(".hay").innerText.includes("2 / 2 connected")');
  def fail_save(route):
   data=route.request.post_data_json
   if data.get('p_snapshot') is not None:route.fulfill(status=503,content_type='application/json',body='{"message":"QA storage outage"}')
   else:route.continue_()
  a.route('**/rpc/preview_invite_host_v1',fail_save);a.get_by_role('button',name='I AM READY',exact=True).click();a.get_by_role('status').filter(has_text='could not').wait_for(timeout=3000) if False else a.wait_for_timeout(500);assert a.evaluate('(r)=>!!localStorage.getItem("gt-durable-invite-v1:journal:haywire:"+r)',room);a.unroute('**/rpc/preview_invite_host_v1',fail_save);a.reload();a.get_by_role('button',name='JOIN / RESTORE THIS MACHINE',exact=True).click();a.get_by_role('button',name='READY · WAITING FOR PARTNER',exact=True).wait_for();z.get_by_role('button',name='I AM READY',exact=True).click();print('PASS host-away17s,same-link private host/new tab,Ready immediate reload',flush=True)
  for q in [a,z]:
   
   q.locator('.hay-guide-nav').wait_for()
   while q.get_by_role('button',name='NEXT',exact=True).is_enabled():q.get_by_role('button',name='NEXT',exact=True).click()
  names=['PRESSURE','HAY FLOW','DOOR','CONVEYOR','CARROT','VENT']
  for level in range(int(os.environ.get('LEVELS','8'))):
   for q in [a,z]:
    q.locator('.hay-guide-nav').wait_for()
    while q.get_by_role('button',name='NEXT',exact=True).is_enabled():q.get_by_role('button',name='NEXT',exact=True).click()
    q.get_by_role('button',name='START THE MACHINE',exact=True).click()
   a.get_by_role('button',name=re.compile('LEVER A')).wait_for();a.screenshot(path=f'/downloads/haywire242/duet-level{level+1}-390.png');z.screenshot(path=f'/downloads/haywire242/duet-level{level+1}-320.png')
   cycles=0
   while True:
    for controller,target in [(a,z),(z,a)]:
     if controller.locator('.hay-swap').count():break
     buttons=controller.locator('.hay-levers button')
     for i in range(3):
      if not buttons.count():break
      text=buttons.nth(i).locator('small').inner_text();pair=[n for n in names if n in text];red=target.locator('.hay-gauges .is-red span').all_inner_texts()
      if any(n in red for n in pair):
       buttons.nth(i).click();controller.wait_for_timeout(400)
    if a.locator('.hay-swap').count() or z.locator('.hay-swap').count():
     for q in [a,z]:q.get_by_role('button',name='TAKE THE OTHER STATION',exact=True).wait_for();q.get_by_role('button',name='TAKE THE OTHER STATION',exact=True).click()
     a.get_by_role('button',name=re.compile('LEVER A')).wait_for();cycles+=1;continue
    if a.get_by_role('button',name='ALL GREEN · TAP SEAL TOGETHER',exact=True).count():break
    if cycles>4:raise Exception('Unexpected swap loop')
    a.wait_for_timeout(350)
   for q in [a,z]:q.get_by_role('button',name='ALL GREEN · TAP SEAL TOGETHER',exact=True).click()
   a.get_by_text('SEALED!',exact=True).wait_for();a.screenshot(path=f'/downloads/haywire242/duet-level{level+1}-result.png');assert machine()['level']==level and machine()['wins']==level+1;print('PASS actual two-device level',level+1,'swaps',cycles,'saved wins',level+1,flush=True)
   if level==2:
    a.close();a=ha.new_page();a.goto(link);a.get_by_role('button',name='JOIN / RESTORE THIS MACHINE',exact=True).click();a.get_by_text('SEALED!',exact=True).wait_for();print('PASS level3 result same-link fresh host restoration',flush=True)
   a.get_by_role('button',name='NEXT LEVEL / FINISH',exact=True).click()
   if level<7:
    a.locator('.hay-guide-nav').wait_for()
    while a.get_by_role('button',name='NEXT',exact=True).is_enabled():a.get_by_role('button',name='NEXT',exact=True).click()
  if os.environ.get('LEVELS','8')=='8':a.get_by_text('SHIFT COMPLETE!',exact=True).wait_for();a.screenshot(path='/downloads/haywire242/campaign-complete390.png');z.screenshot(path='/downloads/haywire242/campaign-complete320.png');assert machine()['phase']=='finished'
  assert not errors,errors;b.close()
finally:
 if room and secret:
  r=rpc('preview_invite_delete_v1',{'p_game':'haywire','p_room':room,'p_secret':secret});print('Exact expansion QA removed',r.status_code,r.text,flush=True);assert r.ok and r.json()==True
  os.remove('/tmp/haywire242-cleanup.json')
 os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
