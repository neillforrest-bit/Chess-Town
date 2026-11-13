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
   c.route('**/api/find-room/*',handler);c.route('**/api/omdb',lambda r:r.fulfill(json={'rt':92,'mc':81,'imdb':8.1,'awards':'Won 1 Oscar.'}));c.route('**/api/orson',lambda r:(paid.append(r.request.url),r.fulfill(json={'error':'disabled'})))
   return c
  for w,h in [(390,844),(375,667),(320,568)]:
   state({'reset':True,'phase':'brief'});c=context(w,h,'A');q=c.new_page()
   for i in range(25):
    try:q.goto('http://localhost:3011/find/TESTABCD');break
    except:time.sleep(.2)
   q.get_by_role('button',name='NEXT',exact=True).wait_for()
   for step in range(5):
    if step==1:
     q.get_by_role('button',name='Comedy',exact=True).click();q.get_by_role('button',name='›',exact=True).click();q.get_by_role('button',name='Music',exact=True).click()
    if step==2:q.get_by_label('Actors',exact=True).fill('Viola Davis, Tom Hanks')
    if step==3:
     q.get_by_role('button',name='›',exact=True).click();q.get_by_role('button',name='Horror',exact=True).click()
    region=q.locator('[class*=briefPage]');dims=region.evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');print('BRIEF',w,step+1,dims,flush=True);assert dims['s']<=dims['c']+1
    q.screenshot(path=f'/downloads/find-brief-{step+1}-{w}.png')
    if step<4:q.get_by_role('button',name='NEXT',exact=True).click()
   # Reload uses this seat's draft rather than another room's global key.
   q.reload();expect(q.get_by_role('heading',name='Ready for the wheel?')).to_be_visible();expect(q.get_by_text('Actors: Viola Davis, Tom Hanks',exact=False)).to_be_visible();c.close()
  print('PASS five brief pages fit 320/375/390 and draft restores the right room/seat',flush=True);b.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
