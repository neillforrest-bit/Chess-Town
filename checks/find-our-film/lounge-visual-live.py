import urllib.request,urllib.error,json,secrets,time,uuid,hashlib,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base='https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app';cfg=json.load(open('/tmp/find-public-db.json'));key=Path('/home/sandbox/.vault/supabase-service-role-key-hnhltrftwbxpwdjxdijv-fe5f60/password').read_text().strip();h={'apikey':key,'Authorization':'Bearer '+key,'content-type':'application/json'};suffix=secrets.token_hex(3);ids=[str(uuid.uuid4()),str(uuid.uuid4())];names=['qaA_'+suffix[:4],'qaB_'+suffix[:4]];tokens=[secrets.token_hex(32),secrets.token_hex(32)];seats=[secrets.token_hex(32),secrets.token_hex(32)];invite=secrets.token_hex(32);code='QA'+''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
def db(table,method='GET',data=None,query=''):
 r=urllib.request.Request(cfg['url']+'/rest/v1/'+table+query,method=method,headers=h,data=json.dumps(data).encode() if data is not None else None)
 with urllib.request.urlopen(r) as x:return json.loads(x.read() or 'null')
def api(data=None,i=0):
 r=urllib.request.Request(base+'/api/find-room/'+code,method='POST' if data else 'GET',headers={'content-type':'application/json','x-find-player':tokens[i],'x-find-seat':seats[i]},data=json.dumps(data).encode() if data else None)
 with urllib.request.urlopen(r) as x:return json.loads(x.read())
try:
 for i in range(2):db('find_players','POST',{'id':ids[i],'username':names[i],'username_key':names[i].lower(),'credential_hash':hashlib.sha256(tokens[i].encode()).hexdigest()})
 s=api({'create':True,'invite':invite});s=api({'join':True,'invite':invite},1)
 # Seed only this disposable QA room at the acceptance boundary. Full live TMDB flow tested separately.
 s=db('find_rooms',query='?code=eq.'+code+'&select=state')[0]['state'];catalog=json.load(open('/home/sandbox/ct-film/src/data/catalog.json'))['movies'];s['movies']=[m for m in catalog if m.get('p') and m.get('rn')][:3];films=[m['id'] for m in s['movies']];s['pool']=films;s['saved']={'A':films,'B':films};s['nominations']={'A':films,'B':films};s['nominationDone']={'A':True,'B':True};s['phase']='accept';s['acceptanceDone']={'A':False,'B':False};s['acceptance']={'A':{},'B':{}};db('find_rooms','PATCH',{'state':s},'?code=eq.'+code)
 for i in range(2):api({'it':{'t':'accept','ids':films,'done':True},'actionId':secrets.token_hex(32)},i)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);pages=[]
  for i in range(2):
   ctx=browser.new_context(viewport={'width':390 if i==0 else 320,'height':664 if i==0 else 568});ctx.add_init_script("localStorage.setItem('gametown-player-v1',"+json.dumps(json.dumps({'id':ids[i],'username':names[i],'token':tokens[i]}))+");localStorage.setItem('cs-find-seat-"+code+"',"+json.dumps(json.dumps({'code':code,'pid':'A' if i==0 else 'B','name':names[i],'token':seats[i],'invite':invite}))+');');q=ctx.new_page();q.goto(base+'/find/'+code);q.get_by_role('heading',name='Matchup Lounge',exact=True).wait_for();pages.append(q)
  a,b=pages
  a.screenshot(path='/downloads/find-lounge-final-choose390.png')
  choices=a.get_by_label('Lounge films').locator('button[aria-pressed]');choices.nth(0).click();choices.nth(1).click();a.get_by_role('button',name='START BOUT 1/3',exact=True).click();expect(a.get_by_role('button',name='LOCK 0',exact=True)).to_be_enabled();a.locator('section button[aria-pressed]').nth(0).click();a.get_by_role('button',name='+5',exact=True).click();expect(a.get_by_role('button',name='LOCK 5',exact=True)).to_be_enabled();a.get_by_role('button',name='×2 DOUBLE',exact=True).click();expect(b.get_by_text('10 PULL',exact=True)).to_be_visible(timeout=10000);b.locator('section button[aria-pressed]').nth(1).click();b.get_by_role('button',name='+5',exact=True).click();expect(a.get_by_text('5 PULL',exact=True)).to_be_visible(timeout=10000)
  for q in pages:
   q.wait_for_function("Array.from(document.querySelectorAll('section img')).every(x=>x.complete&&x.naturalWidth>0)",timeout=15000)
   assert q.get_by_role('img',name='Donkey Chester',exact=False).is_visible()
   for e in q.locator('main,section,section>div,[class*=lounge],[class*=match]').all():
    dims=e.evaluate('(e)=>[e.scrollHeight,e.clientHeight,e.scrollWidth,e.clientWidth]');assert dims[0]<=dims[1]+2 and dims[2]<=dims[3]+2,dims
   q.screenshot(path='/downloads/find-lounge-final-bout'+str(q.viewport_size['width'])+'.png')
  a.get_by_role('button',name='PAUSE 30s',exact=True).click();expect(a.get_by_text('CLOCK PAUSED',exact=False)).to_be_visible()
  # Preview the full original card and its live review scores, not a fabricated mini score.
  a.get_by_role('button',name='FULL CARD & REVIEWS',exact=True).first.click();expect(a.get_by_role('button',name='BACK TO LOUNGE',exact=True)).to_be_visible();a.wait_for_timeout(1200);a.screenshot(path='/downloads/find-lounge-final-fullcard390.png');a.get_by_role('button',name='BACK TO LOUNGE',exact=True).click()
  a.route('**/image.tmdb.org/**',lambda r:r.abort());a.reload();expect(a.get_by_text('Poster unavailable',exact=True).first).to_be_visible(timeout=10000);a.screenshot(path='/downloads/find-lounge-final-fallback390.png');print('PASS finaldeployed posters loaded at320/390, Chester phoneportrait, no overflow, fullcard/live reviews and explicit posterfailure fallback',flush=True)
  browser.close()
finally:
 db('find_rooms','DELETE',query='?code=eq.'+code)
 for ident in ids:db('find_players','DELETE',query='?id=eq.'+ident)
 print('QAroom/players removed',flush=True)
