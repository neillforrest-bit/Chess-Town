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
 status,d,h=call('/api/find-room/'+code,player=tokens[0],seat=seats[0]);assert status==200 and d['phase']=='brief';tag=h.get('etag') or h.get('ETag');assert tag
 status,d,_=call('/api/find-room/'+code,player=tokens[0],seat=seats[0],extra={'if-none-match':tag});assert status==304
 status,d,_=call('/api/find-room/'+code,player=tokens[1],seat=seats[0]);assert status==403
 status,d,_=call('/api/find-room/'+code);assert status==403
 status,d,_=call('/api/find-room/'+code+'?invite='+invite);assert status==200 and d['host']==names[0] and 'movies' not in d
 status,d,_=call('/api/find-room/'+code,'POST',{'join':True,'invite':invite},tokens[1],secrets.token_hex(32));assert status==409
 status,d,_=call('/api/orson','POST',{});assert status==403
 print('PASS live foundation via local production server + actual private DB: two usernames remembered, case-insensitive duplicate denied, host/guest seats owned, both-ready persists, authenticated resume, swapped credentials denied, bare code denied, invite metadata only, occupied-seat takeover denied, 304, model endpoint hard 403. No film/model provider calls.',flush=True)
finally:
 try:
  cleanup('find_rooms','code=eq.'+code)
  for id in ids:cleanup('find_players','id=eq.'+id)
  print('QA room and both QA profiles removed.',flush=True)
 finally:os.killpg(server.pid,signal.SIGTERM)
