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
  for w,h in [(320,480),(320,568),(390,664),(390,844),(768,1024)]:
   for phase in ['lobby','lounge']:
    before=state({'reset':True,'phase':phase,'lstage':'bout','real':True});ctx=browser.new_context(viewport={'width':w,'height':h})
    seat={'code':'TESTABCD','pid':'A','name':'Forrest','token':'a'*64,'invite':'c'*64}
    ctx.add_init_script('localStorage.setItem(\'cs-find-seat-TESTABCD\','+json.dumps(json.dumps(seat))+');Object.defineProperty(navigator,\'share\',{configurable:true,writable:true,value:async data=>{window.sharedData=data;}});Object.defineProperty(navigator,\'clipboard\',{configurable:true,writable:true,value:{writeText:async text=>{window.copiedText=text;}}});')
    ctx.route('**/api/find-room/*',handler);ctx.route('**/api/find-meta',lambda r:r.fulfill(json={'rt':92,'mc':81,'imdb':8.1}));q=ctx.new_page()
    for _ in range(30):
     try:q.goto('http://localhost:3011/find/TESTABCD');break
     except:time.sleep(.2)
    q.get_by_role('button',name='Send invite link',exact=True).first.click();dialog=q.get_by_role('dialog',name='Send invite link');expect(dialog).to_be_visible();expect(dialog.get_by_text('Share this link with your partner',exact=False) if phase=='lobby' else dialog.get_by_text('Both seats are already claimed.',exact=False)).to_be_visible();expected='http://localhost:3011/find/TESTABCD#invite='+'c'*64;assert dialog.get_by_label('Join link',exact=True).input_value()==expected
    dialog.get_by_role('button',name='SHARE INVITE LINK',exact=True).click();assert q.evaluate('window.sharedData')=={'url':expected};dialog.get_by_role('button',name='COPY LINK',exact=True).click();expect(dialog.get_by_role('button',name='COPIED ✓',exact=True)).to_be_visible();assert q.evaluate('window.copiedText')==expected
    q.screenshot(path=f'/downloads/find-invite-{phase}-{w}-{h}.png')
    for el in q.locator('main,header,[role=dialog]>div').all():
     d=el.evaluate('(e)=>[e.scrollHeight,e.clientHeight,e.scrollWidth,e.clientWidth]');assert d[0]<=d[1]+2 and d[2]<=d[3]+2,(phase,w,h,d)
    q.evaluate("()=>{navigator.share=async()=>{throw new DOMException('Cancelled','AbortError')};}");dialog.get_by_role('button',name='SHARE INVITE LINK',exact=True).click();expect(dialog).to_be_visible()
    q.evaluate("()=>{navigator.share=undefined;navigator.clipboard.writeText=async()=>{throw new Error('blocked')};}");dialog.get_by_role('button',name='SHARE INVITE LINK',exact=True).click();expect(dialog.get_by_text('Use COPY LINK, then paste it into your message.',exact=True)).to_be_visible();dialog.get_by_role('button',name='COPIED ✓',exact=True).click();expect(dialog.get_by_text('Copy is unavailable. Select the link below and copy it manually.',exact=True)).to_be_visible();dialog.get_by_label('Join link').focus();assert q.evaluate('document.activeElement.selectionEnd-document.activeElement.selectionStart')==len(expected)
    dialog.get_by_role('button',name='BACK TO THE GAME',exact=True).click();expect(dialog).not_to_be_visible();assert state()['v']==before['v'];q.screenshot(path=f'/downloads/find-invite-header-{phase}-{w}-{h}.png');ctx.close()
   print('PASS invite share/copy/cancel/unavailable/manual selection;unchanged game;fit',w,h,flush=True)
  # Guest whose older seat never saved the invite must not receive a fabricated join link.
  state({'reset':True,'phase':'lounge','real':True});ctx=browser.new_context(viewport={'width':320,'height':568});ctx.add_init_script('localStorage.setItem(\'cs-find-seat-TESTABCD\','+json.dumps(json.dumps({'code':'TESTABCD','pid':'B','name':'Jem','token':'b'*64}))+');');ctx.route('**/api/find-room/*',handler);q=ctx.new_page();q.goto('http://localhost:3011/find/TESTABCD');q.get_by_role('heading',name='Matchup Lounge',exact=True).wait_for();assert q.get_by_role('button',name='Send invite link',exact=True).count()==0;print('PASS old guest seat without invite does not fabricate token',flush=True);browser.close()
finally:
 eng.terminate();os.killpg(server.pid,signal.SIGTERM)
