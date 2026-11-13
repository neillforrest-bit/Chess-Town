from playwright.sync_api import sync_playwright,expect
import subprocess,json,time,os,signal
ROOT='/home/sandbox/ct-film'
server=subprocess.Popen(['npm','run','start','--','-p','3011'],cwd=ROOT,stdout=open('/tmp/find-invite-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
eng=subprocess.Popen(['node',ROOT+'/checks/find-our-film/harness.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def state(j={}):
 eng.stdin.write(json.dumps(j)+'\n');eng.stdin.flush();return json.loads(eng.stdout.readline())
def handler(r):
 if r.request.method=='POST':
  body=json.loads(r.request.post_data or '{}');body['pid']='B' if r.request.headers.get('x-find-seat')=='b'*64 else 'A';r.fulfill(json=state(body))
 else:
  data=state()
  if data['phase']=='lobby':data['players']['B']['joined']=False
  r.fulfill(json=data)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(320,480),(390,664)]:
   for transient in ['503','network','permanent']:
    ctx=browser.new_context(viewport={'width':w,'height':h});calls=[]
    def identity(route):
     calls.append(route.request)
     if len(calls)==1 or transient=='permanent':
      if transient=='network':route.abort('failed')
      else:route.fulfill(status=503,json={'error':'Temporary username-check failure. Please retry.'})
     else:route.fulfill(json={'id':'qa-user','username':'Forrest'})
    ctx.add_init_script("localStorage.setItem('gametown-player-v1',"+json.dumps(json.dumps({'id':'qa-user','username':'Forrest','token':'a'*64}))+');')
    ctx.route('**/api/find-identity',identity);q=ctx.new_page()
    for _ in range(30):
     try:q.goto('http://localhost:3011/find');break
     except:time.sleep(.2)
    if transient=='permanent':expect(q.get_by_role('button',name='RETRY USERNAME CHECK',exact=True)).to_be_visible();assert len(calls)==2
    else:expect(q.get_by_role('button',name='CREATE A SHARE-LINK ROOM',exact=True)).to_be_enabled(timeout=10000);assert len(calls)==2;assert q.get_by_role('button',name='RETRY USERNAME CHECK',exact=True).count()==0
    ctx.close()
   ctx=browser.new_context(viewport={'width':w,'height':h});q=ctx.new_page();q.goto('http://localhost:3011/find');expect(q.get_by_text('No spaces:',exact=False)).to_be_visible();q.screenshot(path=f'/downloads/find-batch-username-{w}-{h}.png')
   for e in q.locator('main,section,section>div').all():
    d=e.evaluate('(e)=>[e.scrollHeight,e.clientHeight]');assert d[0]<=d[1]+2,(w,h,d)
   ctx.close();print('PASS username transient503/network automatic recovery, bounded persistentfailure and no-spaces hint',w,h,flush=True)
  browser.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
