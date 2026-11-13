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
   for phase in ['lobby','brief','wheel','nominate','accept','showdown','confirm','done']:
    state({'reset':True,'phase':phase,'real':True});c=context(w,h,'A');q=c.new_page()
    for i in range(25):
     try:q.goto('http://localhost:3011/find/TESTABCD');break
     except:time.sleep(.2)
    q.get_by_role('button',name='Leave',exact=True).wait_for();q.locator('section').get_by_text('Restoring your seat...').wait_for(state='hidden');q.screenshot(path=f'/downloads/find-{phase}-{w}.png');dims=q.locator('main').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');assert dims['s']<=dims['c']+1
    print(phase,w,'phone root fit',flush=True);c.close()
  b.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
