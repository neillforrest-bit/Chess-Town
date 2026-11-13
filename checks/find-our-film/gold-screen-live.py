import urllib.request,urllib.error,json,subprocess,os,signal,time,secrets
ROOT='/home/sandbox/ct-film';cfg=json.load(open('/tmp/find-public-db.json'));keypath='/home/sandbox/.vault/supabase-service-role-key-hnhltrftwbxpwdjxdijv-fe5f60/password';key=open(keypath).read().strip();env=dict(os.environ,NEXT_PUBLIC_SUPABASE_URL=cfg['url'],SUPABASE_SERVICE_ROLE_KEY=key)
server=None
base='https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app';suffix=secrets.token_hex(3);names=['qa_a_'+suffix,'qa_b_'+suffix];ids=[];tokens=[secrets.token_hex(32),secrets.token_hex(32)];seats=[secrets.token_hex(32),secrets.token_hex(32)];invite=secrets.token_hex(32);code='QA'+''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
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
   import uuid,hashlib
   ident=str(uuid.uuid4());ids.append(ident)
   row={'id':ident,'username':names[i],'username_key':names[i].lower(),'credential_hash':hashlib.sha256(tokens[i].encode()).hexdigest()}
   req=urllib.request.Request(cfg['url']+'/rest/v1/find_players',method='POST',data=json.dumps(row).encode(),headers={'apikey':key,'Authorization':'Bearer '+key,'content-type':'application/json'})
   with urllib.request.urlopen(req) as r:assert r.status==201
   c=browser.new_context(viewport={'width':320,'height':568});c.add_init_script("localStorage.setItem('gametown-player-v1',"+json.dumps(json.dumps({'id':ident,'username':names[i],'token':tokens[i]}))+");");q=c.new_page();contexts.append(c);pages.append(q)
   for attempt in range(40):
    try:q.goto(base+'/find' if i==0 else invitation);break
    except:time.sleep(.2)
   q.get_by_text(names[i],exact=True).wait_for()
   if i==0:
    q.get_by_role('button',name='CREATE A SHARE-LINK ROOM').click();q.get_by_role('button',name="I'M READY").wait_for();seat=q.evaluate("JSON.parse(localStorage.getItem('cs-find-last'))");code=seat['code'];invitation=base+'/find/'+code+'#invite='+seat['invite']
   else:q.get_by_role('button',name='TAKE MY SEAT').click();q.get_by_role('button',name="I'M READY").wait_for()
  for q in pages:q.get_by_role('button',name="I'M READY").click();time.sleep(.2)
  for q in pages:expect(q.get_by_role('heading',name='What kind of night?')).to_be_visible(timeout=10000)
  pages[0].get_by_role('button',name='NEXT',exact=True).click();pages[0].get_by_role('button',name='Comedy',exact=True).click();pages[0].reload();expect(pages[0].get_by_role('heading',name='Your genres')).to_be_visible();expect(pages[0].get_by_role('button',name='Comedy',exact=True)).to_have_attribute('aria-pressed','true')
  # The app's back guard keeps the same room; the authoritative seat survives reload regardless.
  pages[0].evaluate('history.back()');expect(pages[0].get_by_role('button',name='Comedy',exact=True)).to_be_visible();assert pages[0].url.endswith('/find/'+code)
  for i,q in enumerate(pages):
   q.screenshot(path=f'/downloads/find-omdb-seat-{i}.png');assert q.evaluate("JSON.parse(localStorage.getItem('cs-find-last')).code")==code
  # Both submit their briefs through the real frontend, invoking actual TMDB search.
  pages[0].get_by_role('button',name='BACK',exact=True).click()
  for q in pages:
   for step in range(4):q.get_by_role('button',name='NEXT',exact=True).click()
   q.get_by_role('button',name='LOCK MY BRIEF',exact=True).click();time.sleep(.2)
  spinner=pages[0];spinner.get_by_role('button',name='SPIN ROUND 1',exact=True).click(timeout=30000);spinner.get_by_role('button',name='USE GOLDEN TICKET',exact=True).click(timeout=15000)
  expect(pages[1].get_by_role('button',name='VETO BLOCKED BY GOLD')).to_be_disabled(timeout=10000)
  spinner.reload();expect(spinner.get_by_role('button',name='GOLD USED')).to_be_disabled();expect(spinner.get_by_text('GOLDEN TICKET · Protected from veto. Both tap Keep to continue.',exact=True)).to_be_visible()
  spinner.screenshot(path='/downloads/find-wheel-settled-gold320.png');spinner.set_viewport_size({'width':390,'height':844});spinner.screenshot(path='/downloads/find-wheel-settled-gold390.png');browser.close();print('PASS protected golden-ticket pixels after reload',flush=True)

finally:
 try:
  cleanup('find_rooms','code=eq.'+code)
  for id in ids:cleanup('find_players','id=eq.'+id)
  print('QA room and both QA profiles removed.',flush=True)
 finally:os.killpg(server.pid,signal.SIGTERM) if server else None
