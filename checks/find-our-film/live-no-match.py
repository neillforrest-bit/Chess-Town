import urllib.request,urllib.error,json,subprocess,os,signal,time,secrets
ROOT='/home/sandbox/ct-film';cfg=json.load(open('/tmp/find-public-db.json'));keypath='/home/sandbox/.vault/supabase-service-role-key-hnhltrftwbxpwdjxdijv-fe5f60/password';key=open(keypath).read().strip();env=dict(os.environ,NEXT_PUBLIC_SUPABASE_URL=cfg['url'],SUPABASE_SERVICE_ROLE_KEY=key,TMDB_API_KEY=open('/home/sandbox/.vault/tmdb-api-key-ee8880/password').read().strip())
server=subprocess.Popen(['npm','run','start','--','-p','3012'],cwd=ROOT,env=env,stdout=open('/tmp/find-live-foundation.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
base='http://localhost:3012';suffix=secrets.token_hex(3);names=['qa_a_'+suffix,'qa_b_'+suffix];ids=[];tokens=[secrets.token_hex(32),secrets.token_hex(32)];seats=[secrets.token_hex(32),secrets.token_hex(32)];invite=secrets.token_hex(32);code='QA'+''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
def call(path,method='GET',data=None,player=None,seat=None,extra={}):
 h={'Content-Type':'application/json','x-vercel-forwarded-for':'qa-race-'+suffix,**extra}
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
 for i in range(40):
  try:call('/api/build');break
  except:time.sleep(.2)
 for i in range(2):
  status,d,_=call('/api/find-identity','POST',{'username':names[i]},tokens[i]);assert status==200,(status,d);ids.append(d['id'])
  status,d,_=call('/api/find-identity',player=tokens[i]);assert status==200 and d['username']==names[i]
 status,d,_=call('/api/find-identity','POST',{'username':names[0].upper()},secrets.token_hex(32));assert status==409,(status,d)
 status,d,_=call('/api/find-room/'+code,'POST',{'create':True,'invite':invite},tokens[0],seats[0]);assert status==200,(status,d);assert d['players']['A']['name']==names[0];assert not d['players']['A']['tokenHash'];assert 'inviteHash' not in d
 status,d,_=call('/api/find-room/'+code,'POST',{'join':True,'invite':invite},tokens[1],seats[1]);assert status==200,(status,d)
 time.sleep(.2)
 for i in range(2):
  status,d,_=call('/api/find-room/'+code,'POST',{'it':{'t':'ready','ready':True}},tokens[i],seats[i]);assert status==200,(status,d);time.sleep(.2)
 assert d['phase']=='brief'
 from concurrent.futures import ThreadPoolExecutor
 brief={'kind':'any','mood':'open','genres':[],'exclude':[],'actors':['Definitely Not A Real Actor QZXVP'],'requireActor':True,'ready':True}
 time.sleep(.2)
 def submit(i):return call('/api/find-room/'+code,'POST',{'it':{'t':'brief','brief':brief}},tokens[i],seats[i])
 with ThreadPoolExecutor(2) as pool:results=list(pool.map(submit,[0,1]))
 # CAS preserves concurrent submissions or refuses an action honestly; retries use the same player/seat.
 for i,result in enumerate(results):
  if result[0] in [409,429]:time.sleep(.2);results[i]=submit(i)
 assert all(r[0]==200 for r in results),[(r[0],r[1].get('error')) for r in results]
 status,d,_=call('/api/find-room/'+code,player=tokens[0],seat=seats[0]);assert status==200;assert d['phase']=='brief';assert d['issue'];assert not d['pool'];assert all(d['brief'][p]['actors']==brief['actors'] for p in ['A','B']);assert all(not d['brief'][p]['ready'] for p in ['A','B'])
 assert any('required actor' in n for n in d.get('searchNotes',[])),d.get('searchNotes')
 from playwright.sync_api import sync_playwright,expect
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
  for w,h in [(320,568),(375,667),(390,844)]:
   c=browser.new_context(viewport={'width':w,'height':h},extra_http_headers={'x-vercel-forwarded-for':'qa-race-'+suffix})
   c.add_init_script("localStorage.setItem('gametown-player-v1',"+json.dumps(json.dumps({'id':ids[0],'username':names[0],'token':tokens[0]}))+");localStorage.setItem('cs-find-seat-"+code+"',"+json.dumps(json.dumps({'code':code,'pid':'A','name':names[0],'token':seats[0],'invite':invite}))+');')
   q=c.new_page();q.goto(base+'/find/'+code);expect(q.get_by_role('heading',name='What kind of night?')).to_be_visible();q.get_by_role('button',name='BRIEF NEEDS REVIEW · DETAILS').click();q.screenshot(path='/downloads/find-live-no-match-note-'+str(w)+'.png');q.get_by_role('button',name='BACK TO THE GAME').click();q.screenshot(path='/downloads/find-live-no-match-'+str(w)+'.png');dims=q.locator('[class*=briefPage]').evaluate('(e)=>({s:e.scrollHeight,c:e.clientHeight})');assert dims['s']<=dims['c']+1,(w,dims);c.close()
  browser.close()
 print('PASS actual concurrent brief POSTs preserve both actor rules; unresolved required actor yields no pool, both reopen, honest source note, no substitute. Actual private DB + TMDB, no model. Frontend no-match fits320/375/390.',flush=True)

finally:
 try:
  cleanup('find_rooms','code=eq.'+code)
  for id in ids:cleanup('find_players','id=eq.'+id)
  print('QA room and both QA profiles removed.',flush=True)
 finally:os.killpg(server.pid,signal.SIGTERM)
