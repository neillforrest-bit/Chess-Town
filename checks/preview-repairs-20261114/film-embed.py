from playwright.sync_api import sync_playwright
from pathlib import Path
import urllib.request,json,secrets,time,uuid,hashlib,os
base=os.environ.get('BASE','http://localhost:3181');db=json.loads(Path('/tmp/stage1-public-db.json').read_text())['url'];key=Path('/home/sandbox/.vault/supabase-service-role-key-hnhltrftwbxpwdjxdijv-fe5f60/password').read_text().strip();ids=[];code='';h={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}
def delete(table,q):urllib.request.urlopen(urllib.request.Request(db+'/rest/v1/'+table+'?'+q,method='DELETE',headers=h)).read()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);pages=[];frames=[];suffix=secrets.token_hex(3)
  for i in range(2):
   token=secrets.token_hex(32);ident=str(uuid.uuid4());ids.append(ident);name='qa'+str(i)+'_'+suffix;row={'id':ident,'username':name,'username_key':name,'credential_hash':hashlib.sha256(token.encode()).hexdigest()};urllib.request.urlopen(urllib.request.Request(db+'/rest/v1/find_players',method='POST',headers=h,data=json.dumps(row).encode())).read();c=b.new_context(viewport={'width':390,'height':844});c.add_init_script('localStorage.setItem("gametown-player-v1",'+json.dumps(json.dumps({'id':ident,'username':name,'token':token}))+');');q=c.new_page();q.set_default_timeout(18000);q.goto(base+'/movie/find');q.frame_locator('iframe').get_by_role('button',name='CREATE A SHARE-LINK ROOM',exact=True).wait_for();f=q.frames[1];pages.append(q);frames.append(f)
   if i==0:
    f.get_by_role('button',name='CREATE A SHARE-LINK ROOM',exact=True).click();f.get_by_role('button',name="I'M READY",exact=True).wait_for();seat=f.evaluate("JSON.parse(localStorage.getItem('cs-find-last'))");code=seat['code'];invite='https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app/find/'+code+'#invite='+seat['invite']
   else:
    f.goto(invite);f.get_by_role('button',name='TAKE MY SEAT',exact=True).click();f.get_by_role('button',name="I'M READY",exact=True).wait_for()
  for f in frames:f.get_by_role('button',name="I'M READY",exact=True).click()
  for f in frames:f.get_by_role('button',name='Laugh',exact=False).wait_for();f.get_by_role('button',name='Laugh',exact=False).click();f.get_by_role('button',name='NEXT',exact=True).click()
  pages[0].locator('nav.global-nav').get_by_role('link',name='GAME TOWN',exact=True).click();pages[0].locator('#gt-game').wait_for();pages[0].goto(base+'/movie/find');pages[0].frame_locator('iframe').get_by_role('link',name='RESUME',exact=False).click();pages[0].frame_locator('iframe').get_by_role('button',name='NEXT',exact=True).wait_for();assert code in pages[0].frames[1].url;print('PASS outer canonical return, re-entry and RESUME retain same host seat/brief step',flush=True)
  pages[1].reload();pages[1].frame_locator('iframe').get_by_role('link',name='RESUME',exact=False).click();pages[1].frame_locator('iframe').get_by_role('button',name='NEXT',exact=True).wait_for();assert code in pages[1].frames[1].url;print('PASS guest outer reload/resume same room/seat/brief',flush=True)
  for i,q in enumerate(pages):q.screenshot(path=f'/downloads/repair-find-resume{i}390.png')
  # The actual Tonight catalogue and chosen film run inside the wrapper.
  q=pages[0];q.goto(base+'/movie/tonight');f=q.frame_locator('iframe');f.get_by_role('button',name="SHOW TONIGHT'S PICKS",exact=True).click();f.get_by_role('button',name='KEEP',exact=True).first.wait_for(timeout=45000);f.get_by_role('button',name='KEEP',exact=True).first.click();f.get_by_role('button',name="WE'RE WATCHING THIS",exact=True).first.click();f.get_by_role('button',name='AGAIN',exact=True).wait_for();q.screenshot(path='/downloads/repair-tonight-winner390.png');q.locator('nav.global-nav').get_by_role('link',name='GAME TOWN',exact=True).click();q.locator('#gt-game').wait_for();print('PASS embedded real catalogue -> keep -> Tonight winner -> canonical hub',flush=True)
  b.close()
finally:
 if code:delete('find_rooms','code=eq.'+code)
 for id in ids:delete('find_players','id=eq.'+id)
 print('Deleted exact temporary room and identities',flush=True)
