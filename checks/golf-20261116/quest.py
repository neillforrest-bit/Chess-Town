import os,json,pathlib,re
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('GOLF_URL','http://localhost:3036');paths=json.load(open(str(pathlib.Path(__file__).with_name('solved-paths.json'))));out=pathlib.Path(os.environ.get('GOLF_SCREENSHOTS','/tmp/cove-screenshots'));out.mkdir(exist_ok=True)
def saved(q):return q.evaluate('JSON.parse(localStorage.getItem("captains-cove-v1"))')
def shot(q,a,p):
 q.get_by_label('Aim angle',exact=True).fill(str(a));q.get_by_label('Shot power',exact=True).fill(str(p));q.get_by_role('button',name=re.compile('^PUTT ·')).click();q.wait_for_selector('[data-animating=false]',timeout=12000)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':664});q=c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.goto(base+'/golf');q.get_by_role('button',name='✦ THE TREASURE TRAIL',exact=False).click();q.get_by_label('Captain name',exact=True).fill('Forrest');q.get_by_role('button',name='TAKE THE FIRST PUTT').click()
 for hole,path in enumerate(paths):
  if hole in [2,3,4,7,8]:q.wait_for_timeout(550);q.screenshot(path=str(out/f'course-{hole+1}-390.png'))
  for step in path:shot(q,step['angle'],step['power'])
  state=saved(q)['state'];assert state['players'][0]['done'],(hole,state);assert state['players'][0]['score'][hole]==len(path),(hole,state)
  print('holed',hole+1,'in',len(path),'XP',state['xp'])
  if hole<8:
   q.get_by_role('button',name='⌕ Spyglass',exact=False).click();q.get_by_role('button',name=re.compile('^NEXT HOLE ·')).click();assert saved(q)['state']['hole']==hole+1
  else:expect(q.get_by_role('heading',name='The treasure is yours.',exact=True)).to_be_visible();q.screenshot(path=str(out/'quest-complete-390.png'))
 q.get_by_role('button',name='VIEW THE SCORECARD',exact=True).click();q.screenshot(path=str(out/'quest-scorecard-390.png'));assert len(saved(q)['state']['players'][0]['score'])==9
 assert not errors,errors
 print('PASS full9hole actual UI quest,slopes,tunnels,pirates,gear,XP,finalscorecard')
 b.close()
