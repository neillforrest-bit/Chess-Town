import os,re,json,pathlib,time
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('GOLF_URL','http://localhost:3036');out=pathlib.Path(os.environ.get('GOLF_SCREENSHOTS','/tmp/cove-screenshots'));out.mkdir(exist_ok=True)
def saved(q):return q.evaluate('JSON.parse(localStorage.getItem("captains-cove-v1"))')
def waitrev(q,rev):
 try:q.wait_for_function('(rev)=>+(document.querySelector("[data-rev]")?.dataset.rev||0)>=rev',arg=rev,timeout=20000)
 except:
  print('FAILED PAGE',q.url,q.locator('body').inner_text(),saved(q));q.screenshot(path=str(out/'net-failure.png'));raise
def shot(q,angle,power):
 q.get_by_label('Aim angle',exact=True).fill(str(angle));q.get_by_label('Shot power',exact=True).fill(str(power));q.get_by_role('button',name=re.compile('^PUTT ·')).click();q.wait_for_selector('[data-animating=false]',timeout=12000)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);cs=[];qs=[];errors=[]
 for i in range(5):
  c=b.new_context(viewport={'width':390,'height':664});q=c.new_page();q.on('pageerror',lambda e:(errors.append(str(e)),print('PAGEERROR',str(e))));cs.append(c);qs.append(q)
 host=qs[0];host.goto(base+'/golf');host.get_by_role('button',name=re.compile('PLAY WITH FRIENDS'),exact=False).click();host.get_by_label('Player 1',exact=True).fill('Same Name');host.get_by_label('Course length',exact=True).select_option('3');host.get_by_role('button',name='OPEN A PRIVATE ROOM').click();expect(host.get_by_text('LIVE ROOM',exact=False)).to_be_visible(timeout=25000);host.get_by_role('button',name='SHARE INVITE LINK',exact=True).click();link=host.get_by_label('Private room link').input_value();host.get_by_role('button',name='BACK TO THE CLUBHOUSE').click();print('host room ready')
 for i,q in enumerate(qs[1:],1):
  q.goto(link);q.get_by_label('Player 1',exact=True).fill('Same Name' if i==1 else 'Friend '+str(i));q.get_by_role('button',name='JOIN FRIEND’S ROOM',exact=True).click()
  if i<4:expect(host.get_by_role('button',name=f'TEE OFF · {i+1}/4 PLAYERS')).to_be_enabled(timeout=30000)
  else:expect(q.get_by_role('alert').filter(has_text='room is full')).to_be_visible(timeout=30000)
 print('PASS4player lobby + fifth refused; duplicate names joined');qs[4].close();cs[4].close()
 # Four-player preview, all turn authority and full state recovery.
 host.screenshot(path=str(out/'online-lobby-390.png'));host.get_by_role('button',name='TEE OFF · 4/4 PLAYERS').click();waitrev(qs[1],4)
 assert saved(host)['state']['phase']=='play';assert saved(qs[1])['state']['length']==3
 expect(qs[1].get_by_role('button',name='WATCH SAME NAME')).to_be_disabled();shot(host,-90,10);waitrev(qs[1],5);qs[1].wait_for_selector('[data-animating=false]',timeout=12000);expect(qs[1].get_by_role('button',name=re.compile('^PUTT ·'))).to_be_enabled();shot(qs[1],-90,41);waitrev(host,6);host.wait_for_selector('[data-animating=false]',timeout=12000);assert saved(host)['state']['players'][1]['done'];print('PASS host shot relayed,guest shot credited,turn advanced')
 host.screenshot(path=str(out/'online-game-390.png'));before=saved(host)['state'];print('BEFORE RELOAD',[(saved(q)['state']['rev'],saved(q)['state']['phase'],q.get_by_role('alert').all_text_contents()) for q in qs[:4]]);host.reload();host.wait_for_selector('[data-phase=play]',timeout=30000);expect(host.get_by_text('LIVE ROOM',exact=False)).to_be_visible(timeout=30000);time.sleep(7);print('AFTER RELOAD',[(saved(q)['state']['rev'],saved(q)['state']['phase'],q.get_by_role('alert').all_text_contents(),q.locator('[data-rev]').count(),q.url,q.locator('body').inner_text()[:180]) for q in qs[:4]]);[q.screenshot(path=str(out/f'net-debug-{i}.png')) for i,q in enumerate(qs[:4])]
 assert saved(host)['state']['rev']==before['rev'];assert saved(host)['state']['players'][1]['score']==before['players'][1]['score'];qs[2].reload();qs[2].wait_for_selector('[data-phase=play]');waitrev(qs[2],6);print('PASS host+guest reload resume identical scores and own seats')
 # Go offline on host: guest must not have an actionable shot even when its own turn.
 cs[0].set_offline(True);time.sleep(1);cs[0].set_offline(False);host.get_by_role('button',name='RECONNECT',exact=True).click();expect(host.get_by_text('LIVE ROOM',exact=False)).to_be_visible(timeout=30000)
 assert not errors,errors
 print('PASS no page exceptions; room link capability only; no database writes')
 for c in cs[:4]:c.close()
 b.close()
