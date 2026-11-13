from playwright.sync_api import sync_playwright,expect
import subprocess,json,time,os,signal
ROOT='/home/sandbox/ct-film'
server=subprocess.Popen(['npm','run','start','--','-p','3011'],cwd=ROOT,stdout=open('/tmp/find-local.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
eng=subprocess.Popen(['node',ROOT+'/checks/find-our-film/harness.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def state(j={}):
 eng.stdin.write(json.dumps(j)+'\n');eng.stdin.flush();return json.loads(eng.stdout.readline())
def handler(r):
 if r.request.method=='POST':
  body=json.loads(r.request.post_data or '{}');body['pid']='B' if r.request.headers.get('x-find-seat')=='b'*64 else 'A';r.fulfill(json=state(body))
 else:r.fulfill(json=state())
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);errors=[];paid=[]
  def context(w,h,pid):
   c=b.new_context(viewport={'width':w,'height':h});token=('b' if pid=='B' else 'a')*64
   c.add_init_script('localStorage.setItem(\'cs-find-seat-TESTABCD\','+json.dumps(json.dumps({'code':'TESTABCD','pid':pid,'name':'Jem' if pid=='B' else 'Forrest','token':token,'invite':'c'*64}))+');')
   c.route('**/api/find-room/*',handler);c.route('**/api/find-meta',lambda r:r.fulfill(json={'rt':92,'mc':81,'imdb':8.1,'awards':'Won 1 Oscar.'}));c.route('**/api/orson',lambda r:(paid.append(r.request.url),r.fulfill(json={'error':'disabled'})))
   return c
  for w,h in [(390,844),(375,667),(320,568)]:
   state({'reset':True,'phase':'cards'});c=context(w,h,'A');q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
   for i in range(25):
    try:q.goto('http://localhost:3011/find/TESTABCD');break
    except:time.sleep(.2)
   q.get_by_role('button',name='WANT',exact=True).wait_for();q.screenshot(path=f'/downloads/find-cards-{w}.png');dims=q.locator('main').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight,w:e.scrollWidth,cw:e.clientWidth})');print('FIT',w,dims,flush=True);assert dims['s']<=dims['c']+1 and dims['w']<=dims['cw']+1
   control=q.get_by_role('button',name='FULL DETAILS');box=control.bounding_box();assert box and box['y']+box['height']<h-15,(w,box);control.click();q.get_by_role('button',name='REVIEWS',exact=True).click();q.screenshot(path=f'/downloads/find-details-{w}.png');q.get_by_role('button',name='BACK TO THE CARD').click()
   q.get_by_role('button',name='WANT',exact=True).click();expect(q.get_by_role('button',name='SAVED ✓')).to_be_visible();q.reload();expect(q.get_by_role('button',name='SAVED ✓')).to_be_visible();q.get_by_role('button',name='NOT TONIGHT',exact=True).click();assert state()['saved']['A']
   q.get_by_role('button',name='Leave',exact=True).click();q.get_by_role('button',name='STAY IN GAME').click();c.close()
  state({'reset':True,'phase':'cards','clean':True});ca=context(390,844,'A');cb=context(390,844,'B');a=ca.new_page();g=cb.new_page()
  for q in [a,g]:q.goto('http://localhost:3011/find/TESTABCD');q.get_by_role('button',name='WANT',exact=True).wait_for();q.get_by_role('button',name='WANT',exact=True).click();q.get_by_role('button',name='CHOOSE MY NOMINEES').click()
  for q in [a,g]:
   q.get_by_role('button',name='SELECT Film 900000',exact=True).wait_for(timeout=10000);q.get_by_role('button',name='SELECT Film 900000',exact=True).click();q.get_by_role('button',name='LOCK MY NOMINEES').click()
  for q in [a,g]:
   q.get_by_role('button',name='SELECT Film 900000',exact=True).wait_for(timeout=10000);q.get_by_role('button',name='SELECT Film 900000',exact=True).click();q.get_by_role('button',name='THESE WORK FOR ME').click()
  for q in [a,g]:q.get_by_role('button',name='YES, I WANT THIS TONIGHT').wait_for(timeout=10000);q.get_by_role('button',name='YES, I WANT THIS TONIGHT').click()
  expect(a.get_by_role('heading',name="Tonight's film.")).to_be_visible(timeout=10000);expect(g.get_by_role('heading',name="Tonight's film.")).to_be_visible(timeout=10000);assert state()['saved']['A'] and state()['saved']['B'];assert not paid;assert not errors,errors
  print('PASS two-session cards -> saved -> nominations -> mutual acceptance -> both final confirm; no paid model requests',flush=True);b.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
