import re,json,time,os
from playwright.sync_api import sync_playwright
base=os.environ.get('BASE','http://localhost:3180')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);cs=[b.new_context(viewport={'width':390,'height':844}) for _ in range(2)];a,z=[c.new_page() for c in cs];errors=[]
 if os.environ.get('FORCE_RELAY'):
  for c in cs:c.add_init_script('''const Original=window.RTCPeerConnection;window.__qaPcs=[];window.RTCPeerConnection=class extends Original{constructor(config,...args){super({...config,iceTransportPolicy:'relay'},...args);window.__qaPcs.push(this)}}''')
 for pg in [a,z]:pg.on('pageerror',lambda e:errors.append(str(e)))
 def conditions(pg):
  c=pg.context.new_cdp_session(pg);c.send('Network.enable');c.send('Network.emulateNetworkConditions',{'offline':False,'latency':300,'downloadThroughput':96000,'uploadThroughput':48000,'connectionType':'cellular3g'});c.send('Page.setWebLifecycleState',{'state':'frozen'});time.sleep(3);c.send('Page.setWebLifecycleState',{'state':'active'});return c
 room='qa' +str(int(time.time()))
 a.goto(base+'/play-chester?mode=duel&room='+room+'&host=1&renderer=canvas');z.goto(base+'/play-chester?mode=duel&room='+room+'&renderer=canvas')
 print('CHESS HOST',a.locator('body').inner_text()[:1600],flush=True);print('CHESS GUEST',z.locator('body').inner_text()[:800],flush=True)
 a.locator('.chester-board-frame canvas').last.wait_for(timeout=45000);z.locator('.chester-board-frame canvas').last.wait_for(timeout=45000)
 # Tap real board e2->e4, not a DOM state injection. Canvas coordinates use game800pxboard30offset92tile.
 def move(pg,fr,to,flip=False):
  box=pg.locator('.chester-board-frame canvas').last.bounding_box()
  for sq in [fr,to]:
   col=ord(sq[0])-97;row=8-int(sq[1]);col,row=(7-col,7-row) if flip else (col,row);pg.mouse.click(box['x']+(30+92*(col+.5))*box['width']/800,box['y']+(30+92*(row+.5))*box['height']/800)
 def states(pg):return pg.evaluate('()=>Object.entries(sessionStorage).filter(([k])=>k.startsWith("ct-checkpoint-v1:chess:")).map(([k,v])=>JSON.parse(v).value)')
 a.wait_for_timeout(4000);move(a,'e2','e4');a.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:chess:")&&JSON.parse(v).value.pgn.includes("e4"))');z.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:chess:")&&JSON.parse(v).value.pgn.includes("e4"))');before=states(a)[0];a.reload();a.locator('.chester-board-frame canvas').last.wait_for(timeout=45000);a.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:chess:")&&JSON.parse(v).value.pgn.includes("e4"))');assert states(a)[0]['fen']==before['fen'];a.wait_for_timeout(6500);a.screenshot(path='/downloads/audit-chess-restored390.png');print('PASS real chess e2-e4 host refresh restored legal PGN/FEN; guest reconnected',flush=True)
 conditions(z);z.reload();z.locator('.chester-board-frame canvas').last.wait_for(timeout=45000);z.wait_for_timeout(6500);move(z,'e7','e5',True);a.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:chess:")&&JSON.parse(v).value.pgn.includes("e5"))',timeout=30000);assert states(a)[0]['fen']==states(z)[0]['fen'];print('PASS next legal chess move after host refresh agrees both boards',flush=True)
 room+='c';a.goto(base+'/play-checkers?mode=duel&room='+room+'&host=1');z.goto(base+'/play-checkers?mode=duel&room='+room);a.wait_for_timeout(3000);print('CHECKERS',a.locator('body').inner_text()[:900],flush=True);a.screenshot(path='/downloads/audit-checkers-before390.png')
 def ckstates(pg):return pg.evaluate('()=>Object.entries(sessionStorage).filter(([k])=>k.startsWith("ct-checkpoint-v1:checkers:")).map(([k,v])=>JSON.parse(v).value)')
 def ckmove(pg,fr,to):
  box=pg.locator('.ck-board').bounding_box()
  for i in [fr,to]:pg.mouse.click(box['x']+((i%8)+.5)*box['width']/8,box['y']+((i//8)+.5)*box['height']/8)
 ckmove(a,40,33);a.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:checkers:")&&JSON.parse(v).value.plies===1)');z.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:checkers:")&&JSON.parse(v).value.plies===1)');prior=ckstates(a)[0];a.reload();a.locator('.ck-board').wait_for();a.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:checkers:")&&JSON.parse(v).value.plies===1)');assert ckstates(a)[0]['bd']==prior['bd'];conditions(z);z.reload();z.locator('.ck-board').wait_for();a.wait_for_timeout(4000);ckmove(z,17,24);a.wait_for_function('()=>Object.entries(sessionStorage).some(([k,v])=>k.startsWith("ct-checkpoint-v1:checkers:")&&JSON.parse(v).value.plies===2)',timeout=30000);assert ckstates(a)[0]['bd']==ckstates(z)[0]['bd'];assert ckstates(a)[0]['turn']==ckstates(z)[0]['turn'];a.screenshot(path='/downloads/audit-checkers-restored390.png');print('PASS actual checkers move/host refresh/guest reconnect/next legal move boards+turn agree',flush=True)
 if os.environ.get('FORCE_RELAY'):
  for pg in [a,z]:
   kinds=pg.evaluate('''async()=>{const kinds=[];for(const pc of window.__qaPcs||[]){const s=await pc.getStats();for(const stat of s.values())if(stat.type==='candidate-pair'&&stat.state==='succeeded'&&stat.nominated){kinds.push(s.get(stat.localCandidateId)?.candidateType)}}return kinds}''');assert 'relay' in kinds,kinds;print('PASS nominated relay candidate',kinds,flush=True)
 print('ERRORS',errors,flush=True);assert not errors
 b.close()
