import os,re,json,pathlib,time
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('GOLF_URL','http://localhost:3036');out=pathlib.Path(os.environ.get('GOLF_SCREENSHOTS','/tmp/cove-screenshots'));paths=json.load(open(str(pathlib.Path(__file__).with_name('solved-paths.json'))))
def state(q):return q.evaluate('JSON.parse(localStorage.getItem("captains-cove-v1")).state')
def waitrev(q,rev):q.wait_for_function('rev=>+(document.querySelector("[data-rev]")?.dataset.rev||0)>=rev',arg=rev,timeout=25000)
def shot(q,a,p):
 q.wait_for_selector('[data-animating=false]',timeout=12000);rev=state(q)['rev'];q.get_by_label('Aim angle',exact=True).fill(str(a));q.get_by_label('Shot power',exact=True).fill(str(p));q.get_by_role('button',name=re.compile('^PUTT ·')).click();waitrev(q,rev+1);q.wait_for_selector('[data-animating=false]',timeout=12000)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);cs=[b.new_context(viewport={'width':390,'height':664}) for _ in range(2)];qs=[c.new_page() for c in cs];host,guest=qs
 host.goto(base+'/golf');host.get_by_role('button',name=re.compile('PLAY WITH FRIENDS')).click();host.get_by_label('Player 1',exact=True).fill('Forrest');host.get_by_label('Course length',exact=True).select_option('3');host.get_by_role('button',name='OPEN A PRIVATE ROOM').click();expect(host.get_by_text('LIVE ROOM',exact=False)).to_be_visible(timeout=25000);host.get_by_role('button',name='SHARE INVITE LINK',exact=True).click();link=host.get_by_label('Private room link').input_value();host.get_by_role('button',name='BACK TO THE CLUBHOUSE').click();guest.goto(link);guest.get_by_label('Player 1',exact=True).fill('Sean');guest.get_by_role('button',name='JOIN FRIEND’S ROOM').click();expect(host.get_by_role('button',name='TEE OFF · 2/4 PLAYERS')).to_be_enabled(timeout=25000);host.get_by_role('button',name='TEE OFF · 2/4 PLAYERS').click()
 for hole in range(3):
  for step in paths[hole]:
   for q in qs:
    s=state(host);waitrev(q,s['rev']);q.wait_for_selector('[data-animating=false]',timeout=12000);expect(q.get_by_role('button',name=re.compile('^PUTT ·'))).to_be_enabled(timeout=15000);shot(q,step['angle'],step['power']);waitrev(host,state(q)['rev']);waitrev(guest,state(q)['rev'])
  for q in qs:q.wait_for_selector('[data-animating=false]',timeout=12000)
  assert state(host)==state(guest),(state(host),state(guest));assert all(pl['done'] for pl in state(host)['players'])
  if hole<2:host.get_by_role('button',name=re.compile('^NEXT HOLE ·')).click();waitrev(guest,state(host)['rev'])
 assert state(host)['phase']=='end';assert [p['score'] for p in state(host)['players']]==[[1,2,1],[1,2,1]];host.screenshot(path=str(out/'online-tie-390.png'));guest.screenshot(path=str(out/'online-guest-end-390.png'));host.get_by_role('button',name='VIEW THE SCORECARD').click();host.screenshot(path=str(out/'online-scorecard-390.png'));print('PASS actual2browser entire3hole online round,all turns,exact syncedscores,tie,end')
 for c in cs:c.close()
 # Actual same-phone round with a deliberate missed putt and state resume.
 c=b.new_context(viewport={'width':320,'height':568});q=c.new_page();q.goto(base+'/golf');q.get_by_role('button',name=re.compile('PASS & PLAY')).click();q.get_by_label('Player count').select_option('4');q.get_by_label('Course length').select_option('3');q.screenshot(path=str(out/'couch-setup-320.png'));q.get_by_role('button',name='LET THE RIVALRY BEGIN').click();shot(q,-90,10);assert state(q)['turn']==1;shot(q,-160,50);assert state(q)['players'][1]['done'];q.reload();q.get_by_role('button',name=re.compile('RESUME SAVED ROUND')).click();assert state(q)['turn']==2;q.get_by_role('button',name='Open scorecard').click();q.screenshot(path=str(out/'couch-card-320.png'));c.close();print('PASS actual4player couch turn,score,resume,320setup+scorecard')
 # Failure cases: malformed local save does not become a game; storage refused does not block play.
 c=b.new_context(viewport={'width':320,'height':568});q=c.new_page();q.add_init_script('localStorage.setItem("captains-cove-v1",JSON.stringify({state:{version:1,players:[{}],hole:99}}))');q.goto(base+'/golf');expect(q.get_by_role('button',name=re.compile('RESUME'))).to_have_count(0);c.close()
 c=b.new_context(viewport={'width':320,'height':568});q=c.new_page();q.add_init_script('Storage.prototype.setItem=function(){throw new Error("blocked")}');q.goto(base+'/golf');q.get_by_role('button',name=re.compile('THE TREASURE TRAIL')).click();q.get_by_role('button',name='TAKE THE FIRST PUTT').click();expect(q.get_by_text('This browser could not save.',exact=False)).to_be_visible();expect(q.get_by_role('button',name=re.compile('^PUTT ·'))).to_be_enabled();q.screenshot(path=str(out/'storage-blocked-320.png'));c.close();print('PASS malformedsave+blockedstorage safe playable fallback')
 b.close()
