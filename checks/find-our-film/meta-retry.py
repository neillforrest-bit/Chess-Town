exec(open('/home/sandbox/ct-film/checks/find-our-film/ui.py').read().split('try:\n with sync_playwright()')[0])
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':320,'height':568});q=c.new_page();calls=[]
  c.add_init_script('localStorage.setItem(\'cs-find-seat-TESTABCD\','+json.dumps(json.dumps({'code':'TESTABCD','pid':'A','name':'Forrest','token':'a'*64}))+');')
  c.route('**/api/find-room/*',handler)
  def meta(r):
   calls.append(True);r.fulfill(status=503,json={'error':'Source unavailable'}) if len(calls)==1 else r.fulfill(json={'rt':77,'mc':63,'imdb':7.1})
  c.route('**/api/find-meta',meta);state({'reset':True,'phase':'cards','clean':True})
  for n in range(30):
   try:q.goto('http://localhost:3011/find/TESTABCD');break
   except:time.sleep(.2)
  q.get_by_role('button',name='FULL DETAILS').click();q.get_by_role('button',name='REVIEWS',exact=True).click();expect(q.get_by_role('button',name='RETRY REVIEW SCORES')).to_be_visible();q.screenshot(path='/downloads/find-meta-retry-before.png');q.get_by_role('button',name='RETRY REVIEW SCORES').click();expect(q.get_by_role('dialog').get_by_text('77%',exact=True)).to_be_visible();assert len(calls)==2;q.screenshot(path='/downloads/find-meta-retry-after.png');print('PASS metadata transient503 shows honest unavailable plus explicit retry; retry refreshes exact film without room reset. Fixture source responses, not actual scores.');b.close()
finally:eng.terminate();os.killpg(server.pid,signal.SIGTERM)
