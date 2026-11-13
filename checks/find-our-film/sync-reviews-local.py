from playwright.async_api import async_playwright,expect
import subprocess,json,time,os,signal,asyncio
ROOT='/home/sandbox/ct-film'
server=subprocess.Popen(['npm','run','start','--','-p','3011'],cwd=ROOT,stdout=open('/tmp/find-sync-local-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
eng=subprocess.Popen(['node',ROOT+'/checks/find-our-film/harness.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def state(j={}):
 eng.stdin.write(json.dumps(j)+'\n');eng.stdin.flush();return json.loads(eng.stdout.readline())
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  c=await b.new_context(viewport={'width':320,'height':480});q=await c.new_page();held=asyncio.Event();holding=False;fail=False;gets=[];meta_calls=[];delay=0;meta_error=False
  await c.add_init_script('localStorage.setItem("cs-find-seat-TESTABCD",'+json.dumps(json.dumps({'code':'TESTABCD','pid':'A','name':'Forrest','token':'a'*64,'invite':'c'*64}))+');')
  async def room(r):
   nonlocal holding
   if r.request.method=='POST':
    body=json.loads(r.request.post_data or '{}');body['pid']='A';d=state(body)
   else:
    gets.append(r.request.headers);d=state()
    if fail:return await r.abort()
    if holding:
     holding=False;await held.wait()
   for m in d['movies']:
    for k in ['rt','mc','imdb']:m.pop(k,None)
   try:await r.fulfill(json=d,headers={'ETag':'"fixture-'+str(d['v'])+'"','Cache-Control':'no-store'})
   except:pass
  async def meta(r):
   meta_calls.append(json.loads(r.request.post_data)['id']);await asyncio.sleep(delay)
   try:await r.fulfill(status=503 if meta_error else 200,json={'error':'Fixture review source temporarily unavailable.'} if meta_error else {'rt':96,'mc':93,'imdb':8.2,'source':'OMDb'})
   except:pass
  await c.route('**/api/find-room/*',room);await c.route('**/api/find-meta',meta);await c.route('**/api/find-identity',lambda r:r.fulfill(status=403,json={'error':'fixture'}))
  d=state({'reset':True,'phase':'confirm','real':True})
  for _ in range(50):
   try:await q.goto('http://localhost:3011/find/TESTABCD');break
   except:await asyncio.sleep(.2)
  await expect(q.get_by_role('button',name='YES, I WANT THIS TONIGHT')).to_be_visible()
  holding=True
  await q.evaluate('window.dispatchEvent(new Event("focus"))');await asyncio.sleep(.1)
  state({'pid':'A','it':{'t':'confirm','yes':True,'id':d['champion']}});state({'pid':'B','it':{'t':'confirm','yes':True,'id':d['champion']}})
  await q.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
  await expect(q.get_by_role('heading',name="Tonight's film.")).to_be_visible(timeout=2000)
  held.set();await asyncio.sleep(.1)
  await expect(q.get_by_role('heading',name="Tonight's film.")).to_be_visible()
  assert gets[-1]['cache-control']=='no-cache';assert gets[-1].get('if-none-match')
  print('PASS suspended old poll cancelled on visibility resume, final mutual yes caught immediately, stale response cannot revert, conditional no-cache request retained',flush=True)
  fail=True;await q.evaluate('window.dispatchEvent(new Event("pageshow"))');await expect(q.locator('section [role=alert]')).to_be_visible();await expect(q.locator('footer')).to_contain_text('RECONNECTING')
  fail=False;await q.evaluate('window.dispatchEvent(new Event("online"))');await expect(q.locator('section [role=alert]')).not_to_be_visible();await expect(q.locator('footer')).to_contain_text('SAVED ROOM')
  print('PASS pageshow/online recovery and success200 clears old error without resetting seat or game',flush=True)
  state({'reset':True,'phase':'lounge','lstage':'bout','real':True});delay=13;meta_calls.clear();await q.reload()
  await expect(q.get_by_role('heading',name='Matchup Lounge',exact=True)).to_be_visible();await expect(q.get_by_text('Loading...',exact=True).first).to_be_visible()
  await q.get_by_role('button',name='FULL CARD & REVIEWS').first.click()
  await expect(q.get_by_role('dialog',name='Film details')).to_be_visible()
  await expect(q.get_by_role('dialog',name='Film details').get_by_text('96%',exact=True)).to_be_visible(timeout=16000)
  assert len(meta_calls)==2,meta_calls
  await q.get_by_role('button',name='BACK TO LOUNGE',exact=True).click();await expect(q.get_by_text('96%',exact=True).first).to_be_visible()
  await q.screenshot(path='/downloads/find-review-shared-success-320-480.png')
  print('PASS 13s review response survives former12s deadline, loading honest, fullcard and Lounge share exactly one request per film and live-update subscribers',flush=True)
  await c.close()
  c=await b.new_context(viewport={'width':320,'height':480});q=await c.new_page();await c.add_init_script('localStorage.setItem("cs-find-seat-TESTABCD",'+json.dumps(json.dumps({'code':'TESTABCD','pid':'A','name':'Forrest','token':'a'*64}))+');');await c.route('**/api/find-room/*',room);await c.route('**/api/find-meta',meta);delay=0;meta_error=True;state({'reset':True,'phase':'lounge','lstage':'bout','real':True});await q.goto('http://localhost:3011/find/TESTABCD');await q.get_by_role('button',name='SCORE SOURCE · WHY?').first.click();await expect(q.get_by_role('dialog',name='Score source status')).to_contain_text('Fixture review source');await q.screenshot(path='/downloads/find-review-reason-320-480.png');meta_error=False;await q.get_by_role('button',name='RETRY REVIEW SCORES').click();await expect(q.get_by_role('dialog',name='Score source status')).to_contain_text('Review scores updated.');await q.get_by_role('button',name='BACK TO MATCHUP').click();await expect(q.get_by_text('96%',exact=True)).to_be_visible();await q.screenshot(path='/downloads/find-review-retry-320-480.png')
  print('PASS real failure reason opens, retry refreshes shared subscribers without remount/room reset; phone pixels captured',flush=True)
  await b.close()
try:asyncio.run(main())
finally:eng.terminate();os.killpg(server.pid,signal.SIGTERM)
