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
  for round in range(4):
   i=round%2;spinner=pages[i];partner=pages[1-i]
   spinner.get_by_role('button',name='SPIN ROUND '+str(round+1),exact=True).click(timeout=30000)
   if round<2:
    spinner.get_by_role('button',name='USE GOLDEN TICKET',exact=True).click(timeout=15000)
    if round==0:
     spinner.set_viewport_size({'width':390,'height':844});spinner.screenshot(path='/downloads/find-wheel-live-gold390.png');spinner.set_viewport_size({'width':320,'height':568});spinner.screenshot(path='/downloads/find-wheel-live-gold320.png');expect(partner.get_by_role('button',name='VETO BLOCKED BY GOLD')).to_be_disabled();spinner.reload();expect(spinner.get_by_role('button',name='GOLD USED')).to_be_disabled()
    partner.get_by_role('button',name='KEEP THIS DIRECTION').click(timeout=15000)
   else:spinner.get_by_role('button',name='USE MY VETO',exact=True).click(timeout=15000)
   time.sleep(.3)
  for q in pages:expect(q.get_by_role('button',name='WANT',exact=True)).to_be_visible(timeout=15000)
  # Host finishes and nominates before guest, proving the former hidden barrier is gone.
  for i,q in enumerate(pages):
   expect(q.get_by_role('button',name='WANT',exact=True)).to_be_visible(timeout=15000)
   q.wait_for_timeout(1200);q.screenshot(path='/downloads/find-feedback-cards-'+str(i)+'.png');q.set_viewport_size({'width':390,'height':844});q.screenshot(path='/downloads/find-feedback-cards390-'+str(i)+'.png');q.set_viewport_size({'width':320,'height':568})
   for n in range(2):
    before=q.locator('article h2').inner_text();q.get_by_role('button',name='WANT',exact=True).click();expect(q.locator('article h2')).not_to_have_text(before);time.sleep(.25)
   q.get_by_role('button',name='CHOOSE MY NOMINEES').click();time.sleep(.25)
   expect(q.get_by_role('button',name='LOCK MY NOMINEES')).to_be_visible(timeout=10000)
   q.screenshot(path='/downloads/find-feedback-nominees-'+str(i)+'.png');q.set_viewport_size({'width':390,'height':844});q.screenshot(path='/downloads/find-feedback-nominees390-'+str(i)+'.png');q.set_viewport_size({'width':320,'height':568})
   for n in range(2):
    q.get_by_role('button',name=__import__('re').compile('^SELECT ')).click()
    if n==0:q.get_by_role('button',name='›',exact=True).click()
   q.get_by_role('button',name='LOCK MY NOMINEES').click();time.sleep(.25)
   if i==0:
    expect(q.get_by_text('Waiting for '+names[1],exact=False)).to_be_visible();q.screenshot(path='/downloads/find-feedback-wait.png')
  for q in pages:
   for n in range(2):
    select=q.get_by_role('button',name=__import__('re').compile('^SELECT '));select.wait_for(timeout=10000);select.click()
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
  pages[0].screenshot(path='/downloads/find-omdb-disagreement.png')
  # Collect real metadata via the owned-seat endpoint for each film in this actual room.
  q=pages[0];metadata=q.evaluate("""async()=>{const p=JSON.parse(localStorage.getItem('gametown-player-v1')),s=JSON.parse(localStorage.getItem('cs-find-last'));const headers={'content-type':'application/json','x-find-seat':s.token,'x-find-player':p.token};const room=await(await fetch('/api/find-room/'+s.code,{headers})).json();let out=[];for(const m of room.movies){const r=await fetch('/api/find-meta',{method:'POST',headers,body:JSON.stringify({code:s.code,id:m.id})});out.push({title:m.t,year:m.y,im:m.im,status:r.status,...await r.json()});}return out;}""")
  print('ACTUAL PREVIEW METADATA',json.dumps(metadata),flush=True);json.dump(metadata,open('/downloads/find-omdb-metadata.json','w'),indent=2);assert any(m.get('rt') is not None and m.get('mc') is not None and m.get('imdb') is not None for m in metadata),metadata
  # Both explicitly agree. No random elimination; both original favourites remain saved.
  for q in pages:q.get_by_role('button',name=first,exact=True).last.click();time.sleep(.2)
  for q in pages:q.get_by_role('button',name='YES, I WANT THIS TONIGHT').click(timeout=10000);time.sleep(.2)
  for q in pages:
   expect(q.get_by_role('heading',name="Tonight's film.")).to_be_visible(timeout=15000);q.screenshot(path='/downloads/find-omdb-final-'+str(pages.index(q))+'.png')
  pages[0].reload();expect(pages[0].get_by_role('heading',name="Tonight's film.")).to_be_visible(timeout=10000)
  q=pages[0]
  q.get_by_role('button',name='FULL SYNOPSIS & DETAILS').click()
  dialog=q.get_by_role('dialog')
  for tab in ['SYNOPSIS','REVIEWS','AWARDS']:
   dialog.get_by_role('button',name=tab,exact=True).click();q.screenshot(path='/downloads/find-omdb-detail-'+tab.lower()+'.png');dims=dialog.locator('>div').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');print('DETAIL',tab,dims,flush=True);assert dims['s']<=dims['c']+1
  dialog.get_by_role('button',name='BACK TO THE CARD').click();q.get_by_role('button',name='OUR SAVED FILMS').click();q.screenshot(path='/downloads/find-omdb-shelf.png');dims=q.get_by_role('dialog').locator('>div').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');print('SHELF',dims,flush=True);assert dims['s']<=dims['c']+1

  browser.close()
 print('PASS real two-browser frontend + private DB: seeded disposable QA identities, share invite, guest seat, both-ready, independent briefs, draft reload, browser back guard and same saved room. Actual TMDB films through final mutual confirmation and reload; actual OMDb metadata verified. Four alternating rounds, both golden tickets, both vetoes, protected reload and two-finalist disagreement/explicit agreement passed. No model requests.',flush=True)
finally:
 try:
  cleanup('find_rooms','code=eq.'+code)
  for id in ids:cleanup('find_players','id=eq.'+id)
  print('QA room and both QA profiles removed.',flush=True)
 finally:os.killpg(server.pid,signal.SIGTERM) if server else None
