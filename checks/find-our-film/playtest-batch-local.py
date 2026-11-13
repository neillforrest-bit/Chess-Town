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
  for w,h in [(320,480),(320,568),(390,664),(390,844),(768,1024)]:
   for kept in ['none','partner','you']:
    base=state({'reset':True,'phase':'wheel','real':True});base['slices']=[{'id':'genre:Drama','name':'Drama','description':'Stories','ids':base['pool']}];base['wheel'].update({'setup':'spin','kept':[],'rejected':[],'protectPick':{'A':'genre:Drama','B':None},'spinCount':2 if kept=='none' else 3,'result':None if kept=='none' else 'genre:Drama','spunAt':int(time.time()*1000)-10000,'accepted':{'A':kept=='you','B':kept=='partner'}})
    c=context(w,h,'A');c.unroute('**/api/find-room/*');c.route('**/api/find-room/*',lambda r:r.fulfill(json=base));q=c.new_page()
    for _ in range(30):
     try:q.goto('http://localhost:3011/find/TESTABCD');break
     except:time.sleep(.2)
    q.get_by_role('button',name='GENRES & RULES',exact=True).wait_for();q.wait_for_timeout(100)
    if kept=='partner':expect(q.get_by_text('Jem kept Drama. Your turn: tap KEEP to continue.',exact=True)).to_be_visible()
    if kept=='you':expect(q.get_by_text('You kept Drama. Waiting for Jem to tap KEEP.',exact=True)).to_be_visible()
    # Sum static SVG group + outer rotations: one slice stays upright before and after landing.
    svg=q.locator('svg[viewBox="0 0 300 300"]');rotation=svg.get_attribute('style');label=svg.locator('g>g').get_attribute('transform');assert ('rotate(0' in label) if kept=='none' else ('rotate(-4140' in label),(rotation,label)
    for el in q.locator('main,section,section>div,[class*=wheelStage]').all():
     d=el.evaluate('(e)=>[e.scrollHeight,e.clientHeight,e.scrollWidth,e.clientWidth]');assert d[0]<=d[1]+2 and d[2]<=d[3]+2,(kept,w,h,d)
    q.wait_for_timeout(3100);q.screenshot(path=f'/downloads/find-batch-wheel-{kept}-{w}-{h}.png');c.close()
   print('PASS singlegenre upright/waiting cues/fit',w,h,flush=True)
  b.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
