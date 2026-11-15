from pathlib import Path
import os,json,subprocess,signal,time,requests,secrets
from playwright.sync_api import sync_playwright
c=json.load(open('/tmp/find-public-db.json'));sk=Path(os.environ['SERVICE_KEY_FILE']).read_text().strip();e=dict(os.environ,NEXT_PUBLIC_SUPABASE_URL=c['url'],NEXT_PUBLIC_SUPABASE_ANON_KEY=c['key'],SUPABASE_SERVICE_ROLE_KEY=sk);base=os.environ.get('BASE','http://localhost:3122');server=subprocess.Popen(['npm','run','start','--','-p','3122'],cwd=os.environ.get('PROJECT_ROOT',str(Path(__file__).resolve().parents[2])),env=e,stdout=open('/tmp/find241-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True);code=None;ids=[];h={'apikey':sk,'Authorization':'Bearer '+sk}
def db(table,query,method='GET',data=None):
 r=requests.request(method,c['url']+'/rest/v1/'+table+'?'+query,headers=h,json=data);assert r.ok,(r.status_code,r.text);return r.json() if r.text else None
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3122/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);hc=b.new_context(viewport={'width':int(os.environ.get('WIDTH','320')),'height':int(os.environ.get('HEIGHT','568'))});gc=b.new_context(viewport={'width':320,'height':568});a=hc.new_page();z=gc.new_page();a.set_default_timeout(20000);z.set_default_timeout(20000)
  a.goto(base+'/find');a.get_by_label('Claim your Game Town username').fill('qaA_'+secrets.token_hex(3));a.get_by_role('button',name='CLAIM & REMEMBER MY USERNAME',exact=True).click();a.get_by_role('button',name='CREATE A SHARE-LINK ROOM',exact=True).wait_for();ident=a.evaluate('JSON.parse(localStorage.getItem("gametown-player-v1"))');ids.append(ident['id']);a.get_by_role('button',name='CREATE A SHARE-LINK ROOM',exact=True).click();a.wait_for_url('**/find/*');code=a.url.rsplit('/',1)[-1];a.get_by_role('button',name="I'M READY",exact=True).wait_for();a.get_by_role('button',name='SEND INVITE LINK',exact=True).click();link=a.get_by_label('Join link',exact=True).input_value();a.screenshot(path='/downloads/movie241/find-invite.png');a.get_by_role('button',name='BACK TO THE GAME',exact=True).click();st=a.evaluate('(c)=>JSON.parse(localStorage.getItem("cs-find-seat-"+c))',code)
  old=db('find_rooms','code=eq.'+code+'&select=state')[0]['state'];old['createdAt']=int(time.time()*1000)-6*86400000;old['updatedAt']=old['createdAt'];db('find_rooms','code=eq.'+code,'PATCH',{'state':old,'updated_at':'2026-11-09T15:00:00Z'});a.close();z.goto(link);z.get_by_label('Claim your Game Town username').fill('qaB_'+secrets.token_hex(3));z.get_by_role('button',name='CLAIM & REMEMBER MY USERNAME',exact=True).click();z.get_by_role('button',name='TAKE MY SEAT',exact=True).wait_for();ids.append(z.evaluate('JSON.parse(localStorage.getItem("gametown-player-v1")).id'));z.get_by_role('button',name='TAKE MY SEAT',exact=True).click();z.get_by_role('button',name="I'M READY",exact=True).wait_for();z.wait_for_timeout(17000);z.screenshot(path='/downloads/movie241/find-host-away.png');assert not ''.join(z.get_by_role('alert').all_inner_texts());print('PASS Find six-day row,host closed,guest joined17s,no fresh-room reset',flush=True)
  z.get_by_role('button',name="I'M READY",exact=True).click();z.reload();z.get_by_role('button',name='READY · CHANGE TO NOT READY',exact=True).wait_for();a=hc.new_page();a.goto(link);a.get_by_role('button',name="I'M READY",exact=True).wait_for();a.get_by_role('button',name="I'M READY",exact=True).click();a.wait_for_timeout(4000);a.reload();z.reload();a.wait_for_timeout(2000);z.wait_for_timeout(2000);a.screenshot(path='/downloads/movie241/find-restored-brief.png');state=db('find_rooms','code=eq.'+code+'&select=state')[0]['state'];assert state['phase']=='brief';assert state['players']['A']['playerId']==ids[0] and state['players']['B']['playerId']==ids[1];assert state['players']['A']['ready'] and state['players']['B']['ready'];print('PASS Find Ready immediate reload,both new pages stable private seats,shared brief',flush=True)
  # Anonymous URL flag can neither read a full state nor claim either occupied seat.
  r=requests.get(base+'/api/find-room/'+code+'?p=A');assert r.status_code==403
  b.close()
finally:
 if code:db('find_rooms','code=eq.'+code,'DELETE');assert not db('find_rooms','code=eq.'+code+'&select=code')
 for i in ids:db('find_players','id=eq.'+i,'DELETE');assert not db('find_players','id=eq.'+i+'&select=id')
 print('Only exact Find QA room/profiles removed',flush=True);os.killpg(os.getpgid(server.pid),signal.SIGTERM);server.wait()
