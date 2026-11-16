from playwright.sync_api import sync_playwright,expect
import os,json,pathlib
base=os.environ.get('COVE_URL','http://localhost:3037');out=pathlib.Path('/downloads/cove3d');solutions=json.loads(pathlib.Path(__file__).with_name('journey-solutions.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);q=b.new_page(viewport={'width':320,'height':568});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 def ready():q.wait_for_selector('[data-cove-ready=true]',timeout=60000)
 def fit():
  assert q.evaluate("[...document.querySelectorAll('section')].filter(e=>e.offsetHeight>0).every(e=>e.scrollHeight<=e.clientHeight+1)"),'section overflows'
  assert q.evaluate("document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight"),'document overflows'
 def shot(a,power):
  q.get_by_label('Putt direction',exact=True).fill(str(a));q.get_by_label('Putt power',exact=True).fill(str(power));q.get_by_role('button',name=f'PUTT · {power}%',exact=True).click();q.wait_for_selector('[data-moving=true]');q.wait_for_selector('[data-moving=false]',timeout=25000)
 q.goto(base+'/golf-cove');ready();q.get_by_role('button',name='Cove passport').click();fit();q.screenshot(path=str(out/'solo-passport-empty320.png'));q.get_by_role('button',name='VOYAGE MEDALS',exact=True).click();fit();q.get_by_role('button',name='BACK TO THE COVE',exact=True).click();q.get_by_role('button',name='STEP INTO THE SUMMER').click();q.get_by_label('Play mode').select_option('solo');q.get_by_label('Challenge level').select_option('pro');q.get_by_role('button',name='GATHER THE CREW').click();q.get_by_role('button',name='LOCK IN & PUTT').click();q.get_by_role('button',name='USE SLIDERS INSTEAD').click()
 for hole in range(3):
  ready()
  for s in solutions[hole]:shot(s['angle'],s['power'])
  expected='between' if hole<2 else 'end';q.wait_for_selector('[data-cove-phase='+expected+']');fit();saved=q.evaluate("JSON.parse(localStorage.getItem('cove-passport-v1'))");assert len(saved['stamps'])==hole+1,saved;assert saved['completed']==(1 if hole==2 else 0),saved;assert saved['holeBest']['pro'][hole]==len(solutions[hole]),saved
  if hole<2:q.screenshot(path=str(out/f'solo-postcard{hole+1}-320.png'));q.get_by_role('button',name='FOLLOW THE LANTERNS').click()
 assert saved['soloRoutes']['pro']==4,saved;q.screenshot(path=str(out/'solo-legend-finish320.png'));expect(q.get_by_text('Harbour legend · 6/6 medals',exact=True)).to_be_visible();q.reload();ready();q.get_by_role('button',name='Cove passport').click();fit();q.screenshot(path=str(out/'solo-passport-holes320.png'));q.get_by_role('button',name='VOYAGE MEDALS',exact=True).click();fit();q.screenshot(path=str(out/'solo-passport-voyage320.png'));expect(q.get_by_role('heading',name='Harbour legend',exact=True)).to_be_visible();print('PASS all six solo medals from four real Pro strokes; per-hole stamps persist before next hole; completed once; rank survives reload; both320passport leaves and finish fit',flush=True)
 # Rescue prohibits new solo scores and route medals, but not postcards.
 q.evaluate('localStorage.clear()');q.reload();ready();q.get_by_role('button',name='STEP INTO THE SUMMER').click();q.get_by_label('Play mode').select_option('solo');q.get_by_label('Challenge level').select_option('pro');q.get_by_role('button',name='GATHER THE CREW').click();q.get_by_role('button',name='LOCK IN & PUTT').click();q.get_by_role('button',name='Open field guide').click();q.get_by_role('button',name='PRACTICE RESCUE').click();q.get_by_role('button',name='USE SLIDERS INSTEAD').click()
 for hole in range(3):
  ready()
  for s in solutions[hole]:shot(s['angle'],s['power'])
  if hole<2:q.wait_for_selector('[data-cove-phase=between]');q.get_by_role('button',name='FOLLOW THE LANTERNS').click()
 q.wait_for_selector('[data-cove-phase=end]');saved=q.evaluate("JSON.parse(localStorage.getItem('cove-passport-v1'))");assert saved['stamps']==[0,1,2] and not saved['holeBest'] and not saved['soloRoutes'] and not saved['best'],saved;print('PASS rescue preserves postcards but excludes every medal and personal best',flush=True)
 assert not errors,errors;q.close();b.close()
