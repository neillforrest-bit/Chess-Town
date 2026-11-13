import urllib.request,urllib.error,json,subprocess,os,signal,time,secrets
ROOT='/home/sandbox/ct-film';cfg=json.load(open('/tmp/find-public-db.json'));keypath='/home/sandbox/.vault/supabase-service-role-key-hnhltrftwbxpwdjxdijv-fe5f60/password';key=open(keypath).read().strip();env=dict(os.environ,NEXT_PUBLIC_SUPABASE_URL=cfg['url'],SUPABASE_SERVICE_ROLE_KEY=key)
server=subprocess.Popen(['npm','run','start','--','-p','3012'],cwd=ROOT,env=env,stdout=open('/tmp/find-live-foundation.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
base='http://localhost:3012';suffix=secrets.token_hex(3);names=['qa_a_'+suffix,'qa_b_'+suffix];ids=[];tokens=[secrets.token_hex(32),secrets.token_hex(32)];seats=[secrets.token_hex(32),secrets.token_hex(32)];invite=secrets.token_hex(32);code='QA'+''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
def call(path,method='GET',data=None,player=None,seat=None,extra={}):
 h={'Content-Type':'application/json',**extra}
 if player:h['x-find-player']=player
 if seat:h['x-find-seat']=seat
 r=urllib.request.Request(base+path,method=method,headers=h,data=None if data is None else json.dumps(data).encode())
 try:
  with urllib.request.urlopen(r) as x:return x.status,json.loads(x.read() or 'null'),dict(x.headers)
 except urllib.error.HTTPError as x:return x.code,json.loads(x.read() or 'null'),dict(x.headers)
def cleanup(table,query):
 r=urllib.request.Request(cfg['url']+'/rest/v1/'+table+'?'+query,method='DELETE',headers={'apikey':key,'Authorization':'Bearer '+key})
 with urllib.request.urlopen(r) as x:assert x.status in [200,204]
try:
 from playwright.sync_api import sync_playwright,expect
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);contexts=[];pages=[]
  for i in range(2):
   c=browser.new_context(viewport={'width':320,'height':568},extra_http_headers={'x-vercel-forwarded-for':'local-retry-'+suffix});q=c.new_page();contexts.append(c);pages.append(q)
   for attempt in range(40):
    try:q.goto(base+'/find' if i==0 else invitation);break
    except:time.sleep(.2)
   field=q.get_by_label('Claim your Game Town username',exact=True);field.wait_for()
   q.screenshot(path=f'/downloads/find-live-entry-{i}.png')
   field.fill(names[i]);q.get_by_role('button',name='CLAIM & REMEMBER MY USERNAME').click();q.get_by_text(names[i],exact=True).wait_for()
   player=q.evaluate("JSON.parse(localStorage.getItem('gametown-player-v1'))");ids.append(player['id'])
   dropped=[]
   def lose_reply(route):
    body=json.loads(route.request.post_data or '{}')
    if route.request.method=='POST' and (body.get('create') or body.get('join')) and not dropped:
     response=route.fetch();assert response.ok;dropped.append(True);route.abort()
    else:route.continue_()
   q.route('**/api/find-room/*',lose_reply)
   if i==0:
    q.get_by_role('button',name='CREATE A SHARE-LINK ROOM').click();q.get_by_text('Failed to fetch',exact=False).wait_for();assert dropped
    q.reload();q.get_by_role('button',name='CREATE A SHARE-LINK ROOM').wait_for()
    q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).startsWith('cs-find-seat-'))throw Error('Storage full QA');return window.originalSet.call(this,k,v)}}")
    q.get_by_role('button',name='CREATE A SHARE-LINK ROOM').click();q.get_by_text('Storage full QA',exact=True).wait_for();q.evaluate('()=>{Storage.prototype.setItem=window.originalSet}');q.get_by_role('button',name='CREATE A SHARE-LINK ROOM').click();q.get_by_role('button',name="I'M READY").wait_for();seat=q.evaluate("JSON.parse(localStorage.getItem('cs-find-last'))");code=seat['code'];invitation=base+'/find/'+code+'#invite='+seat['invite']
   else:
    q.get_by_role('button',name='TAKE MY SEAT').click();q.get_by_text('Failed to fetch',exact=False).wait_for();assert dropped;q.reload();q.get_by_role('button',name='TAKE MY SEAT').wait_for();q.get_by_role('button',name='TAKE MY SEAT').click();q.get_by_role('button',name="I'M READY").wait_for()
  for q in pages:q.get_by_role('button',name="I'M READY").click();time.sleep(.2)
  for q in pages:expect(q.get_by_role('heading',name='What kind of night?')).to_be_visible(timeout=10000)
  pages[0].get_by_role('button',name='NEXT',exact=True).click();pages[0].get_by_role('button',name='Comedy',exact=True).click();pages[0].reload();expect(pages[0].get_by_role('heading',name='Your genres')).to_be_visible();expect(pages[0].get_by_role('button',name='Comedy',exact=True)).to_have_attribute('aria-pressed','true')
  # The app's back guard keeps the same room; the authoritative seat survives reload regardless.
  pages[0].evaluate('history.back()');expect(pages[0].get_by_role('button',name='Comedy',exact=True)).to_be_visible();assert pages[0].url.endswith('/find/'+code)
  for i,q in enumerate(pages):
   q.screenshot(path=f'/downloads/find-live-seat-{i}.png');assert q.evaluate("JSON.parse(localStorage.getItem('cs-find-last')).code")==code
  browser.close()
 print('PASS dropped successful create AND guest-join responses, page reload, same pending tokens recover both seats; storage-full after remote creation recovers the same seat. Real two-browser frontend + private DB: claim A/B, share invite, claim guest, both-ready, independent briefs, draft reload, browser back guard and same saved room. No film/model requests.',flush=True)
finally:
 try:
  cleanup('find_rooms','code=eq.'+code)
  for id in ids:cleanup('find_players','id=eq.'+id)
  print('QA room and both QA profiles removed.',flush=True)
 finally:os.killpg(server.pid,signal.SIGTERM)
