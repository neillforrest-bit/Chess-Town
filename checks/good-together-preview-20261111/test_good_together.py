import sys,json,time,subprocess,requests
sys.path.insert(0,'/tmp');import test_trivia_flow as t
server=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--port','3100','--hostname','127.0.0.1'],cwd='/home/sandbox/ct',stdout=open('/tmp/gt-server.log','w'),stderr=subprocess.STDOUT)
def choose(tab,id,value):
 t.evaluate(tab,"(()=>{const e=document.getElementById(%s);Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,%s);e.dispatchEvent(new Event('change',{bubbles:true}))})()"%(json.dumps(id),json.dumps(value)))
 t.wait_for(tab,'document.getElementById('+json.dumps(id)+').value==='+json.dumps(value))
def fit(tab):
 x=t.evaluate(tab,"(()=>{let h=document.querySelector('.good-together-hub');return {scroll:h.scrollHeight>h.clientHeight+1,doc:document.documentElement.scrollHeight>innerHeight+1,horizontal:document.documentElement.scrollWidth>innerWidth,clipped:[...h.querySelectorAll('h1,h2,p,small,select,button,a,footer')].filter(e=>e.getBoundingClientRect().bottom>innerHeight+1||e.getBoundingClientRect().top<0).map(e=>e.innerText),intro:(()=>{let e=h.querySelector('section[aria-live]');return e.scrollHeight>e.clientHeight+1})()}})()")
 
 if any(x.values()):t.shot(tab,'/downloads/gt-failure.png');print(t.evaluate(tab,"document.body.innerText"),flush=True)
 assert not any(x.values()),x
try:
 for _ in range(50):
  try:
   if requests.get(t.BASE).ok:break
  except:pass
  time.sleep(.2)
 t.start_chrome();tab=t.new_tab();t.cmd(tab,'Network.enable');t.cmd(tab,'Network.setBlockedURLs',{'urls':['*/api/trivia-commentary*','*/api/chat*']})
 total=0
 for w,h in [(320,568),(390,844),(820,1180),(1280,800)]:
  t.cmd(tab,'Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':1,'mobile':w<600})
  t.goto(tab,t.BASE);t.wait_for(tab,"!!document.getElementById('gt-game')")
  for world in ['trivia','chess','movie','logic']:
   choose(tab,'gt-game',world);fit(tab);t.wait_for(tab,"(()=>{const e=document.querySelector('svg[aria-label=\"Chester, your animated game-night host\"]');return e&&getComputedStyle(e.parentElement).opacity==='1'})()");t.shot(tab,f'/downloads/good-together-live-hub-{world}-{w}.png')
   assert t.evaluate(tab,"location.pathname==='/' && !document.getElementById('gt-mode')")
   t.evaluate(tab,"[...document.querySelectorAll('button')].find(e=>e.innerText.startsWith('Enter')).click()")
   t.wait_for(tab,"!!document.getElementById('gt-mode')");fit(tab)
   ids=t.evaluate(tab,"[...document.getElementById('gt-mode').options].map(o=>o.value)")
   for mode in ids:
    choose(tab,'gt-mode',mode);fit(tab);total+=1
    assert t.evaluate(tab,"!!document.querySelector('a[data-launch]').getAttribute('href')")
   t.shot(tab,f'/downloads/good-together-live-modes-{world}-{w}.png')
   t.click_text(tab,'Back to all games');t.wait_for(tab,"!!document.getElementById('gt-game')");assert t.evaluate(tab,"document.getElementById('gt-game').value") == world
  print('PASS all worlds/select/Enter/modes/back',w,h,flush=True)
 t.goto(tab,t.BASE+'/arena');t.wait_for(tab,"!!document.getElementById('gt-game')");print('PASS arena route; mode viewport checks',total)
finally:
 if t.CHROME:t.CHROME.terminate();t.CHROME.wait(timeout=10)
 server.terminate();server.wait(timeout=10)
