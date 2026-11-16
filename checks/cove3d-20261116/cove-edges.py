from playwright.sync_api import sync_playwright,expect
import os,pathlib
base=os.environ.get('COVE_URL','http://localhost:3037');out=pathlib.Path('/downloads/cove3d')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':320,'height':568},has_touch=True,is_mobile=True);q=c.new_page();q.goto(base+'/golf-cove');q.wait_for_selector('[data-cove-ready=true]',timeout=60000);q.get_by_role('button',name='STEP INTO THE SUMMER').click();q.get_by_label('Number of golfers').select_option('4');q.screenshot(path=str(out/'setup-four-320.png'));start=q.get_by_role('button',name='LET’S MAKE A MEMORY');r=start.bounding_box();assert r['y']+r['height']<568, r;start.click();q.get_by_role('button',name='FULL GRAPHICS',exact=True).click();q.wait_for_timeout(1800)
 # True touch pointer sequence, low-power shot to check non-scoring continuation and turn rotation.
 client=c.new_cdp_session(q);r=q.get_by_role('button',name='Pull down to charge your putt',exact=False).bounding_box();x=r['x']+r['width']/2;y=r['y']+10
 client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+20}]});client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});q.wait_for_selector('[data-moving=true]');q.wait_for_selector('[data-moving=false]',timeout=20000);assert q.locator('[data-turn]').get_attribute('data-turn')=='1';assert q.locator('[data-cove-phase]').get_attribute('data-cove-phase')=='play';q.screenshot(path=str(out/'touch-four-320.png'));print('PASS genuine CDP touch stroke, four-golfer rotation, narrow-screen setup CTA')
 q.get_by_role('button',name='Open field guide').click();q.screenshot(path=str(out/'guide-320.png'));q.keyboard.press('Escape');c.close();b.close()
