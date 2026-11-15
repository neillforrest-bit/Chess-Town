import subprocess,time,requests,os,signal
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
os.makedirs('/downloads/viewport242/crossgame',exist_ok=True)
s=subprocess.Popen(['npm','run','start','--','-p','3122'],cwd='/home/sandbox/ct-fit',stdout=open('/tmp/viewport242-server.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(100):
  try:
   if requests.get('http://localhost:3122/api/build').ok:break
  except:pass
  time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);errors=[]
  paths=['/arena','/play-checkers','/logic-brawl','/haywire','/trivia-brawl','/trivia','/training','/daily-challenge','/movie/find']
  for i,path in enumerate(paths):
   q=b.new_page(viewport={'width':320,'height':568});q.on('pageerror',lambda e:errors.append(str(e)));q.route('**/api/chester*',lambda r:r.abort());q.route('**/api/trivia-commentary*',lambda r:r.abort());q.goto(os.environ.get('BASE','http://localhost:3122')+path);q.wait_for_timeout(1000);q.screenshot(path='/downloads/viewport242/crossgame/'+str(i)+'.png');print(path,q.locator('body').inner_text()[:180].replace('\n',' '),flush=True);q.close()
  print('ERRORS',errors);b.close()
 canvas=Image.new('RGB',(320*3,598*3),'#f4f4f4');d=ImageDraw.Draw(canvas)
 for i,path in enumerate(paths):
  x=(i%3)*320;y=(i//3)*598;d.text((x+10,y+8),path,fill='#000');canvas.paste(Image.open('/downloads/viewport242/crossgame/'+str(i)+'.png'),(x,y+30))
 canvas.save('/downloads/viewport242/crossgame/contact.png')
finally:os.killpg(os.getpgid(s.pid),signal.SIGTERM);s.wait()
