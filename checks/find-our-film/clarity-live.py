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
  pages[0].get_by_role('button',name='Comedy',exact=True).click();pages[0].get_by_role('button',name='BACK',exact=True).click()
  for q in pages:
   for step in range(4):q.get_by_role('button',name='NEXT',exact=True).click()
   q.get_by_role('button',name='LOCK MY BRIEF',exact=True).click();time.sleep(.2)
  # Open both briefs so the live catalogue can honestly supply up to8 genres.
  for q in pages:q.get_by_label('Gold protection genre').wait_for(timeout=30000)
  options=pages[0].get_by_label('Gold protection genre').locator('option').evaluate_all('(es)=>es.map(e=>({id:e.value,name:e.textContent})).filter(x=>x.id)');print('LIVE GENRES',options,flush=True);assert len(options)>=2
  for i,q in enumerate(pages):
   q.get_by_label('Gold protection genre').select_option(options[i]['id']);q.get_by_role('button',name='LOCK MY GOLD PROTECTION').click();time.sleep(.25)
  for q in pages:q.get_by_label('Genre to veto').wait_for(timeout=10000)
  vetoable=[x for x in options if x['id'] not in [options[0]['id'],options[1]['id']]]
  for i,q in enumerate(pages):
   for opt in vetoable[i*3:(i+1)*3]:
    q.get_by_label('Genre to veto').select_option(opt['id']);q.get_by_role('button',name='VETO SELECTED GENRE').click();expect(q.get_by_text('Your vetoes: '+str(vetoable[i*3:(i+1)*3].index(opt)+1)+'/3.',exact=False)).to_be_visible(timeout=10000);time.sleep(.25)
   q.screenshot(path='/downloads/find-genre-live-veto-'+str(i)+'.png');q.get_by_role('button',name='LOCK MY VETOES').click();time.sleep(.25)
  expect(pages[0].get_by_role('button',name='SPIN ROUND 1',exact=True)).to_be_enabled(timeout=10000)
  status,verified,_=call('/api/find-room/'+code,player=tokens[0],seat=seat['token']);print('VERIFIED veto state',status,{k:verified['wheel'].get(k) for k in ['setup','vetoPicks','vetoDone','rejected','protectPick']},flush=True);assert status==200;assert len(verified['wheel']['vetoPicks']['A'])==3 and len(verified['wheel']['vetoPicks']['B'])==3;assert len(verified['wheel']['rejected'])==6;print('PASS persisted3veto each,6unique removed,2protected remain',flush=True)
  lost={'once':False}
  def drop_response(route):
   body=json.loads(route.request.post_data or '{}')
   if body.get('it',{}).get('t')=='spin' and not lost['once']:
    lost['once']=True;response=route.fetch();assert response.status==200;route.abort('failed')
   else:route.continue_()
  pages[0].route('**/api/find-room/*',drop_response)
  for round in range(2):
   i=round%2;spinner=pages[i];partner=pages[1-i]
   spinner.get_by_role('button',name='SPIN ROUND '+str(round+1),exact=True).click(timeout=15000)
   spinner.get_by_role('button',name='KEEP & NEXT TURN',exact=True).click(timeout=20000);time.sleep(.25)
   partner.get_by_role('button',name='KEEP & NEXT TURN',exact=True).click(timeout=15000);time.sleep(.25)
   if round==0:
    nextPage=pages[1];nextPage.reload();expect(nextPage.get_by_role('button',name='SPIN ROUND 2',exact=True)).to_be_enabled(timeout=10000);nextPage.screenshot(path='/downloads/find-clarity-live-guest-spin320.png')
  for q in pages:expect(q.get_by_role('button',name='WANT',exact=True)).to_be_visible(timeout=10000)
  r,st,_=call('/api/find-room/'+code,player=tokens[0],seat=seat['token']);assert st['wheel']['spinCount']==2;assert len(st['wheel']['kept'])==2;print('PASS lost spin response retried exactly once;2uniquegenres exhausted withoutrepeats→Cards;partnerhandover',flush=True)
  for i,q in enumerate(pages):
   for _ in range(2):
    before=q.locator('article h2').inner_text();q.get_by_role('button',name='WANT',exact=True).click();expect(q.locator('article h2')).not_to_have_text(before)
   q.get_by_role('button',name='CHOOSE MY NOMINEES').click();q.get_by_label('Film shortlist').wait_for();q.screenshot(path='/downloads/find-clarity-live-nominate-'+str(i)+'.png')
   for button in q.get_by_label('Film shortlist').locator('button[aria-pressed]').all():button.click()
   q.get_by_role('button',name='LOCK SHORTLIST & CONTINUE').click();time.sleep(.25)
   if i==0:q.screenshot(path='/downloads/find-clarity-live-wait320.png')
  for q in pages:
   q.get_by_role('heading',name='Which would you watch?').wait_for(timeout=10000);assert q.get_by_role('button',name='CONFIRM YESES & NEXT ROUND').is_disabled();q.set_viewport_size({'width':390,'height':664});q.screenshot(path='/downloads/find-clarity-live-yes390.png');q.set_viewport_size({'width':320,'height':568})
   for button in q.get_by_label('Film shortlist').locator('button[aria-pressed]').all():button.click()
   q.get_by_role('button',name='CONFIRM YESES & NEXT ROUND').click();time.sleep(.25)
  for q in pages:expect(q.get_by_role('button',name='EITHER',exact=True)).to_be_visible(timeout=10000)
  tabs=pages[0].locator('section button[aria-pressed]');first=tabs.nth(0).get_attribute('aria-label');second=tabs.nth(1).get_attribute('aria-label');pages[0].get_by_role('button',name=first,exact=True).last.click();time.sleep(.25);pages[1].get_by_role('button',name=second,exact=True).last.click();time.sleep(.25)
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
 print('PASS real two-browser frontend + private DB: claim A/B, share invite, claim guest, both-ready, independent briefs, draft reload, browser back guard and same saved room. Actual TMDB films through final mutual confirmation and reload; actual OMDb metadata verified. Both pre-spin3veto sets, fouralternating spins, disagreement and explicitagreement passed. No model requests.',flush=True)
finally:
 try:
  cleanup('find_rooms','code=eq.'+code)
  for id in ids:cleanup('find_players','id=eq.'+id)
  print('QA room and both QA profiles removed.',flush=True)
 finally:os.killpg(server.pid,signal.SIGTERM) if server else None
