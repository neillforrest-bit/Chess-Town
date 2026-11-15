import requests,json,pathlib,secrets,hashlib,uuid
from playwright.sync_api import sync_playwright,expect
base='https://chess-town-piu9f608j-neillo.vercel.app';url='https://hnhltrftwbxpwdjxdijv.supabase.co';key=pathlib.Path('/home/sandbox/.vault/supabase-service-role-key-hnhltrftwbxpwdjxdijv-fe5f60/password').read_text().strip();h={'apikey':key,'Authorization':'Bearer '+key};pid=str(uuid.uuid4());token=secrets.token_hex(32);name='QA'+secrets.token_hex(4);row={'id':pid,'username':name,'username_key':name.lower(),'credential_hash':hashlib.sha256(token.encode()).hexdigest()}
r=requests.post(url+'/rest/v1/find_players',headers=h,json=row);r.raise_for_status()
try:
 r=requests.get(base+'/api/find-identity',headers={'x-find-player':token});r.raise_for_status();assert r.json()=={'id':pid,'username':name};r=requests.post(base+'/api/find-identity',headers={'x-find-player':token},json={'username':'Any New Name'});r.raise_for_status();assert r.json()['id']==pid
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);q=b.new_page(viewport={'width':390,'height':664});q.add_init_script('localStorage.setItem("gametown-player-v1",'+json.dumps(json.dumps({'id':pid,'username':name,'token':token}))+')');q.goto(base+'/find');expect(q.get_by_role('button',name='CREATE A SHARE-LINK ROOM',exact=True)).to_be_enabled();assert name in q.content();q.screenshot(path='/downloads/name-fix/legacy-player.png');b.close()
 print('PASS existing database identity resumes same id/name,POST retry preserves owner,legacy local credential restores UI')
finally:
 r=requests.delete(url+'/rest/v1/find_players',headers=h,params={'id':'eq.'+pid,'credential_hash':'eq.'+row['credential_hash']});r.raise_for_status();print('Deleted exact QA legacy identity only')
codes=['S4H5QV6F']+pathlib.Path('/tmp/name-fix-qa-codes.txt').read_text().splitlines()
for code in set(codes):
 r=requests.delete(url+'/rest/v1/find_rooms',headers=h,params={'code':'eq.'+code});r.raise_for_status();print('Deleted exact task QA room',code)
