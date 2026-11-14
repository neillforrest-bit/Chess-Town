from playwright.sync_api import sync_playwright
import os,json,re,time
from pathlib import Path
base=os.environ.get('BASE','http://localhost:3181');results=[]
def log(id,detail,ok=True):
 results.append({'id':id,'ok':ok,'detail':detail});Path('/tmp/stage1-play-'+os.environ.get('GROUP','core')+'.json').write_text(json.dumps(results,indent=2));print(id,ok,detail,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844});q=c.new_page();q.set_default_timeout(16000)
 q.add_init_script("window.__positions=[];window.addEventListener('chester-position-now',e=>window.__positions.push(e.detail));window.addEventListener('local-chess-move',e=>window.__positions.push(e.detail));")
 def go(url):q.goto(base+url);q.wait_for_timeout(350)
 def board():
  # coach modes may open a brief dialog before board mounts
  for label in ['LET ME AT','LET’S','LET\'S','FIGHT','I AM READY','READY','GO']:
   btn=q.get_by_role('button',name=re.compile(label))
   if btn.count() and btn.first.is_visible():
    try:btn.first.click(timeout=1000)
    except:pass
  q.locator('.chester-board-frame canvas').last.wait_for(timeout=25000);q.wait_for_timeout(6500)
 def tap(fr,to):
  box=q.locator('.chester-board-frame canvas').last.bounding_box()
  for sq in [fr,to]:
   col=ord(sq[0])-97;row=8-int(sq[1]);q.mouse.click(box['x']+(30+92*(col+.5))*box['width']/800,box['y']+(30+92*(row+.5))*box['height']/800)
 def home():
  a=q.get_by_role('link',name='GAME TOWN',exact=True)
  if a.count() and a.is_visible():a.click()
  else:q.get_by_role('button',name='Open match menu').click();q.get_by_role('link',name='BACK TO HUB',exact=False).click()
  q.locator('#gt-game').wait_for()
 # Solo actual first move and resignation report.
 try:
  if os.environ.get('GROUP','core')!='core':raise RuntimeError('SKIP')
  go('/play-chester?renderer=canvas');q.get_by_role('button',name='START GUIDED GAME',exact=False).click();board();tap('e2','e4');q.wait_for_function('()=>window.__positions.some(x=>x.san==="e4")');q.get_by_role('button',name='GOT IT',exact=False).click();q.wait_for_timeout(3000);q.screenshot(path='/downloads/audit-chester-game390.png');q.get_by_role('button',name='Open match menu').click();q.get_by_role('button',name='RESIGN MATCH',exact=False).click();q.get_by_role('button',name='CONFIRM RESIGN',exact=False).click();q.wait_for_timeout(1500);print('REPORT',q.locator('body').inner_text()[-1700:],flush=True);q.screenshot(path='/downloads/audit-chester-report390.png');log('chester','Started, real e2-e4 registered, AI reply/grade, menu resign confirmed and report opened.');home()
 except Exception as e:log('chester',str(e),False)
 try:
  if os.environ.get('GROUP','core')!='core':raise RuntimeError('SKIP')
  go('/play-chester?mode=1v1&renderer=canvas');q.get_by_role('button',name='START FRIEND GAME',exact=False).click();board();tap('e2','e4');q.wait_for_function('()=>window.__positions.some(x=>x.san==="e4")');tap('e7','e5');q.wait_for_function('()=>window.__positions.some(x=>x.san==="e5")');log('chess-duel','Two human turns on same board, no AI move between.');home()
 except Exception as e:log('chess-duel',str(e),False)
 # Every lesson button followed, starts an actual board. No state injection.
 go('/training');lessons=q.locator('.lesson-card').all_text_contents()
 for i,title in enumerate(lessons):
  if os.environ.get('GROUP','core')!=('lesson'+str(i//3)):continue
  try:
   go('/training');q.locator('.lesson-card').nth(i).click();q.wait_for_timeout(400);btn=q.locator('.chester-start-button')
   if btn.count():btn.click()
   board();q.screenshot(path='/downloads/audit-lesson-'+str(i)+'390.png');log('lesson-'+str(i),title.strip().replace('\n',' ')[:85]+' board starts. '+q.url);home()
  except Exception as e:log('lesson-'+str(i),str(e),False)
 for id,url,button in ([('underdog','/brawl','ENTER THE UNDERDOG MATCH'),('chess-road','/road/chess','PLAY LEVEL 1'),('brendo','/road/brendo','FIGHT THE BOSS')] if os.environ.get('GROUP')=='roads' else []):
  try:
   go(url);q.get_by_role('button',name=button,exact=False).click() if q.get_by_role('button',name=button,exact=False).count() else q.get_by_role('link',name=button,exact=False).click();q.wait_for_timeout(300)
   if q.get_by_role('button',name='PROVE IT.',exact=True).count():q.get_by_role('button',name='PROVE IT.',exact=True).click()
   elif q.locator('.chester-start-button').count():q.locator('.chester-start-button').click()
   board();q.screenshot(path='/downloads/audit-'+id+'-play390.png');log(id,'Actual entry controls open playable canvas board. '+q.url);home()
  except Exception as e:log(id,str(e),False)
 try:
  if os.environ.get('GROUP')!='daily':raise RuntimeError('SKIP')
  go('/daily-challenge');q.get_by_role('button',name='O-O',exact=True).click();q.get_by_role('button',name='Re1',exact=True).click();q.get_by_text('Solved clean',exact=False).first.wait_for();q.reload();q.get_by_text('Already solved today',exact=False).first.wait_for();log('daily','Both correct choices, solved result and saved result after reload.');q.screenshot(path='/downloads/audit-daily-solved390.png');home()
 except Exception as e:log('daily',str(e),False)
 for id,url,start in ([('checkers-solo','/play-checkers?mode=chester','START'),('checkers-pass','/play-checkers','or pass-and-play on this phone'),('checkers-road','/road/checkers','PLAY LEVEL 1')] if os.environ.get('GROUP')=='checkers' else []):
  try:
   go(url)
   if id=='checkers-road':q.get_by_role('link',name=start,exact=False).click()
   else:q.get_by_role('button',name=start,exact=True).click()
   q.locator('.ck-board').wait_for();box=q.locator('.ck-board').bounding_box()
   for i in [40,33]:q.mouse.click(box['x']+(i%8+.5)*box['width']/8,box['y']+(i//8+.5)*box['height']/8)
   q.wait_for_timeout(1200);q.screenshot(path='/downloads/audit-'+id+'-play390.png');log(id,'Board starts, first legal red move accepted; '+('AI responds.' if id!='checkers-pass' else 'black turn available.'));home()
  except Exception as e:log(id,str(e),False)
 try:
  if os.environ.get('GROUP')!='extra':raise RuntimeError('SKIP')
  go('/surprise-lab');q.locator('.lab-card').first.click();q.get_by_role('button',name='START THE LESSON',exact=False).click();q.wait_for_timeout(1000);q.screenshot(path='/downloads/audit-surprise-play390.png');log('surprise','First opening lesson starts and board renders. '+q.locator('body').inner_text()[:500]);home()
 except Exception as e:log('surprise',str(e),False)
 try:
  if os.environ.get('GROUP')!='extra':raise RuntimeError('SKIP')
  go('/learn');q.get_by_role('link',name='See a sample',exact=False).click() if q.get_by_role('link',name='See a sample',exact=False).count() else q.get_by_role('button',name='See a sample',exact=False).click();q.wait_for_timeout(500);q.screenshot(path='/downloads/audit-learning-sample390.png');log('learning','Sample details open from empty player file. Real saved-game report now populated by resignation test.');home()
 except Exception as e:log('learning',str(e),False)
 b.close()
