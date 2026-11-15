from playwright.sync_api import sync_playwright,expect
import subprocess,json,time,os
eng=subprocess.Popen(['node',str(__import__('pathlib').Path(__file__).with_name('harness.cjs'))],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,env=dict(os.environ,NODE_PATH=str(__import__('pathlib').Path(__file__).resolve().parents[2]/'node_modules')))
def state(j={}):
 eng.stdin.write(json.dumps(j)+'\n');eng.stdin.flush();return json.loads(eng.stdout.readline())
def handler(r):
 j=json.loads(r.request.post_data or '{}') if r.request.method=='POST' else {};j['pid']='B' if r.request.headers.get('x-find-seat')=='b'*64 else 'A';d=state(j)
 if d.get('wheel',{}).get('result'):d['wheel']['spunAt']-=5000
 r.fulfill(json=d)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);errors=[]
  def page(pid,w=390,h=844):
   c=b.new_context(viewport={'width':w,'height':h});c.add_init_script('localStorage.setItem("cs-find-seat-QATESTAB",'+json.dumps(json.dumps({'code':'QATESTAB','pid':pid,'name':'Forrest' if pid=='A' else 'Jemma','token':('a' if pid=='A' else 'b')*64}))+');localStorage.setItem("gametown-player-v1",'+json.dumps(json.dumps({'id':pid,'username':'Forrest' if pid=='A' else 'Jemma','token':pid.lower()*64}))+');');c.route('**/api/find-room/*',handler);c.route('**/api/find-identity',lambda r:r.fulfill(json={'id':pid,'username':'Forrest' if pid=='A' else 'Jemma'}));c.route('**/api/find-meta',lambda r:r.fulfill(json={'rt':80,'mc':70,'imdb':7.1}));q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.set_default_timeout(15000);q.goto(os.environ.get('BASE','http://localhost:3021')+'/find/QATESTAB');return q
  state({'reset':True,'phase':'wheel'});a=page('A');bq=page('B',320,568)
  import re
  bq.get_by_role('status').filter(has_text='WAITING FOR').wait_for();bq.screenshot(path='/downloads/wheel219-wait320.png');assert bq.get_by_role('img',name=re.compile('wheel. Watch only')).count()==1
  for i in range(4):
   q=[a,bq][i%2];q.get_by_role('button',name='Spin the wheel',exact=True).click();q.wait_for_timeout(400)
   if i==0:
    assert q.get_by_role('button',name=re.compile('^NO · SKIP ')).is_disabled(), 'late delivery unlocked while animation still running'
    q.screenshot(path='/downloads/wheel219-animating390.png')
   q.wait_for_timeout(2900)
   for qq in [a,bq]:qq.get_by_role('button',name=re.compile('^NO · SKIP ')).wait_for()
   if i==0:
    a.screenshot(path='/downloads/wheel219-both-choices390.png');bq.screenshot(path='/downloads/wheel219-both-choices320.png')
    # Spinner says Keep; partner can still say No, with clear waiting text.
    a.get_by_role('button',name=re.compile('^KEEP ')).click();a.get_by_role('button',name='KEPT · WAITING',exact=True).wait_for();a.get_by_text('Jemma is thinking...',exact=True).wait_for();a.wait_for_timeout(1200);a.screenshot(path='/downloads/wheel219-kept-wait390.png');bq.get_by_role('button',name=re.compile('^NO · SKIP ')).click()
   elif i==1:q.get_by_role('button',name=re.compile('^NO · SKIP ')).click()
   else:
    for qq in [a,bq]:qq.get_by_role('button',name=re.compile('^KEEP ')).click()
   print('UI wheel result',i+1,'passed',flush=True)
  for q in [a,bq]:q.get_by_role('button',name='YES · SHOW OUR FILMS',exact=True).wait_for()
  a.screenshot(path='/downloads/wheel218-review390.png');assert len(state()['wheel']['rejected'])==2
  # Stale final-list YES cannot approve a suggestion; either seat can return safely.
  a.get_by_role('button',name='TRY ANOTHER GENRE',exact=True).click()
  bq.get_by_role('button',name='USE CURRENT GENRES',exact=True).wait_for();bq.screenshot(path='/downloads/wheel219-suggest320.png');bq.get_by_role('button',name='USE CURRENT GENRES',exact=True).click()
  for qq in [a,bq]:qq.get_by_role('button',name='YES · SHOW OUR FILMS',exact=True).wait_for()
  assert not state()['wheel']['accepted']['A'] and not state()['wheel']['accepted']['B']
  for qq in [a,bq]:qq.get_by_role('button',name='YES · SHOW OUR FILMS',exact=True).click()
  assert not errors,errors
  print('PASS both seats have KEEP/NO, partner veto after spinner Keep, spinner No, mutual Keep, four-turn review, no JS errors',flush=True)
except Exception:
 for q in [a,bq]:print(q.locator('body').inner_text()[:2200])
 raise
finally:eng.terminate()
