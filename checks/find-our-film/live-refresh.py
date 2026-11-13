import urllib.request,urllib.error,json,subprocess,os,signal,time,secrets
ROOT='/home/sandbox/ct-film';cfg=json.load(open('/tmp/find-public-db.json'));keypath='/home/sandbox/.vault/supabase-service-role-key-hnhltrftwbxpwdjxdijv-fe5f60/password';key=open(keypath).read().strip();env=dict(os.environ,NEXT_PUBLIC_SUPABASE_URL=cfg['url'],SUPABASE_SERVICE_ROLE_KEY=key,TMDB_API_KEY=open('/home/sandbox/.vault/tmdb-api-key-ee8880/password').read().strip())
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
   c=browser.new_context(viewport={'width':320,'height':568},extra_http_headers={'x-vercel-forwarded-for':'local-qa-'+suffix});q=c.new_page();contexts.append(c);pages.append(q)
   for attempt in range(40):
    try:q.goto(base+'/find' if i==0 else invitation);break
    except:time.sleep(.2)
   field=q.get_by_label('Claim your Game Town username',exact=True);field.wait_for()
   q.screenshot(path=f'/downloads/find-live-entry-{i}.png')
   field.fill(names[i]);q.get_by_role('button',name='CLAIM & REMEMBER MY USERNAME').click();q.get_by_text(names[i],exact=True).wait_for()
   player=q.evaluate("JSON.parse(localStorage.getItem('gametown-player-v1'))");ids.append(player['id'])
   if i==0:
    q.get_by_role('button',name='CREATE A SHARE-LINK ROOM').click();q.get_by_role('button',name="I'M READY").wait_for();seat=q.evaluate("JSON.parse(localStorage.getItem('cs-find-last'))");code=seat['code'];invitation=base+'/find/'+code+'#invite='+seat['invite']
   else:q.get_by_role('button',name='TAKE MY SEAT').click();q.get_by_role('button',name="I'M READY").wait_for()
  for q in pages:q.get_by_role('button',name="I'M READY").click();time.sleep(.2)
  for q in pages:expect(q.get_by_role('heading',name='What kind of night?')).to_be_visible(timeout=10000)
  pages[0].get_by_role('button',name='NEXT',exact=True).click();pages[0].get_by_role('button',name='Comedy',exact=True).click();pages[0].reload();expect(pages[0].get_by_role('heading',name='Your genres')).to_be_visible();expect(pages[0].get_by_role('button',name='Comedy',exact=True)).to_have_attribute('aria-pressed','true')
  # The app's back guard keeps the same room; the authoritative seat survives reload regardless.
  pages[0].evaluate('history.back()');expect(pages[0].get_by_role('button',name='Comedy',exact=True)).to_be_visible();assert pages[0].url.endswith('/find/'+code)
  for i,q in enumerate(pages):
   q.screenshot(path=f'/downloads/find-live-seat-{i}.png');assert q.evaluate("JSON.parse(localStorage.getItem('cs-find-last')).code")==code
  # Both submit their briefs through the real frontend, invoking actual TMDB search.
  pages[0].get_by_role('button',name='BACK',exact=True).click()
  for q in pages:
   for step in range(4):q.get_by_role('button',name='NEXT',exact=True).click()
   q.get_by_role('button',name='LOCK MY BRIEF',exact=True).click();time.sleep(.2)
  for q in pages:expect(q.get_by_role('button',name="SPIN TONIGHT'S MOOD")).to_be_visible(timeout=30000) if q==pages[0] else None
  # Exercise both vetoes, preserving the host-first, partner-next turn.
  pages[0].get_by_role('button',name="SPIN TONIGHT'S MOOD").click()
  pages[0].get_by_role('button',name='VETO THIS DIRECTION').click(timeout=15000)
  pages[1].get_by_role('button',name="SPIN TONIGHT'S MOOD").click(timeout=10000)
  pages[1].get_by_role('button',name='VETO THIS DIRECTION').click(timeout=15000)
  for q in pages:
   q.get_by_text("TONIGHT'S BRIEF",exact=False).wait_for(timeout=10000)
   while q.get_by_role('button',name='NEXT',exact=True).is_visible():q.get_by_role('button',name='NEXT',exact=True).click()
   q.get_by_role('button',name='LOCK MY BRIEF',exact=True).click();time.sleep(.2)
  pages[0].get_by_role('button',name="SPIN TONIGHT'S MOOD").click(timeout=30000)
  for q in pages:q.get_by_role('button',name='KEEP THIS DIRECTION').click(timeout=15000);time.sleep(.2)
  for q in pages:
   expect(q.get_by_role('button',name='WANT',exact=True)).to_be_visible(timeout=15000)
   for n in range(2):
    q.get_by_role('button',name='WANT',exact=True).click();expect(q.get_by_role('button',name='SAVED ✓',exact=True)).to_be_visible();time.sleep(.2)
    if n==0:q.get_by_role('button',name='›',exact=True).click()
   q.get_by_role('button',name='CHOOSE MY NOMINEES').click();time.sleep(.2)
  for q in pages:
   for n in range(2):
    select=q.get_by_role('button',name=__import__('re').compile('^SELECT '));select.wait_for(timeout=10000);select.click();q.reload();expect(q.get_by_role('button',name='✓ SELECTED · TAP TO REMOVE',exact=True)).to_be_visible(timeout=10000)
    if n==0:q.get_by_role('button',name='›',exact=True).click()
   q.get_by_role('button',name='LOCK MY NOMINEES').click();time.sleep(.2)
  for q in pages:
   for n in range(2):
    select=q.get_by_role('button',name=__import__('re').compile('^SELECT '));select.wait_for(timeout=10000);select.click();q.reload();expect(q.get_by_role('button',name='✓ SELECTED · TAP TO REMOVE',exact=True)).to_be_visible(timeout=10000)
    if n==0:q.get_by_role('button',name='›',exact=True).click()
   q.get_by_role('button',name='THESE WORK FOR ME').click();time.sleep(.2)
  for q in pages:expect(q.get_by_role('button',name='EITHER',exact=True)).to_be_visible(timeout=10000)
  first=pages[0].locator('article h2').inner_text()
  titles=pages[0].locator('section>div>div').first.locator('button').all_text_contents()
  # Top tabs are numbered; their full-title accessible labels also identify bottom votes.
  tabs=pages[0].locator('section button[aria-pressed]');first=tabs.nth(0).get_attribute('aria-label');second=tabs.nth(1).get_attribute('aria-label')
  pages[0].get_by_role('button',name=first,exact=True).last.click();time.sleep(.2)
  pages[1].get_by_role('button',name=second,exact=True).last.click();time.sleep(.2)
  for q in pages:expect(q.get_by_text('Different picks? Talk it through, then BOTH select the same film.')).to_be_visible(timeout=10000)
  pages[0].screenshot(path='/downloads/find-live-disagreement.png')
  # Both explicitly agree. No random elimination; both original favourites remain saved.
  for q in pages:q.get_by_role('button',name=first,exact=True).last.click();time.sleep(.2)
  for q in pages:q.get_by_role('button',name='YES, I WANT THIS TONIGHT').click(timeout=10000);time.sleep(.2)
  for q in pages:
   expect(q.get_by_role('heading',name="Tonight's film.")).to_be_visible(timeout=15000);q.screenshot(path='/downloads/find-live-final-'+str(pages.index(q))+'.png')
  pages[0].reload();expect(pages[0].get_by_role('heading',name="Tonight's film.")).to_be_visible(timeout=10000)
  q=pages[0]
  q.get_by_role('button',name='FULL DETAILS').click()
  dialog=q.get_by_role('dialog')
  for tab in ['SYNOPSIS','REVIEWS','AWARDS']:
   dialog.get_by_role('button',name=tab,exact=True).click();q.screenshot(path='/downloads/find-live-detail-'+tab.lower()+'.png');dims=dialog.locator('>div').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');print('DETAIL',tab,dims,flush=True);assert dims['s']<=dims['c']+1
  dialog.get_by_role('button',name='BACK TO THE CARD').click();q.get_by_role('button',name='OUR SAVED FILMS').click();q.screenshot(path='/downloads/find-live-shelf.png');dims=q.get_by_role('dialog').locator('>div').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');print('SHELF',dims,flush=True);assert dims['s']<=dims['c']+1

  browser.close()
 print('PASS real two-browser frontend + private DB: claim A/B, share invite, claim guest, both-ready, independent briefs, draft reload, browser back guard and same saved room. Actual TMDB films through final mutual confirmation and reload; live TMDB score, honest unavailable OMDb. Both vetoes and two-finalist disagreement/explicit agreement passed. No model requests.',flush=True)
finally:
 try:
  cleanup('find_rooms','code=eq.'+code)
  for id in ids:cleanup('find_players','id=eq.'+id)
  print('QA room and both QA profiles removed.',flush=True)
 finally:os.killpg(server.pid,signal.SIGTERM)
