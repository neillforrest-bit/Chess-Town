from playwright.sync_api import sync_playwright
import re,os,time,json
from pathlib import Path
base=os.environ.get('BASE','http://localhost:3181')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox']);cs=[b.new_context(viewport={'width':390,'height':844}) for _ in range(2)];a,z=[c.new_page() for c in cs]
 for q in [a,z]:q.set_default_timeout(12000)
 a.goto(base+'/logic-brawl');a.get_by_role('button',name='HOST A BATTLE',exact=False).click();a.get_by_label('Battle invite link').wait_for();z.goto(a.get_by_label('Battle invite link').input_value())
 for q in [a,z]:q.get_by_role('button',name='I AM READY',exact=True).click()
 a.get_by_role('button',name='START FIVE ROUNDS',exact=True).click()
 for n in range(30):
  for q in [a,z]:q.locator('.logic-options button').first.click()
  a.get_by_text('ANSWER & REASON',exact=False).wait_for()
  a.get_by_role('button',name=re.compile('^(NEXT QUESTION|OPEN THE BONUS LOCKBOX|ROUND LEDGER)$')).click()
  if n%6==5:a.get_by_role('button',name=re.compile('^(NEXT ROUND|REVEAL THE WINNER)$')).click()
  print('question',n+1,flush=True)
 a.get_by_text('The final ledger',exact=True).wait_for();z.get_by_text('The final ledger',exact=True).wait_for();assert a.locator('.logic-ledger').inner_text()==z.locator('.logic-ledger').inner_text();a.screenshot(path='/downloads/audit-logic-final390.png');a.get_by_role('button',name='REMATCH · NEW PUZZLES',exact=True).click();a.get_by_role('button',name='I AM READY',exact=True).wait_for();z.get_by_role('button',name='I AM READY',exact=True).wait_for();print('PASS Logic30 questions,5 bonus/round ledgers,shared final scores,rematch',flush=True)
 # Local pass-and-play hides previous player's answer until hand-off.
 a.goto(base+'/logic-brawl');a.get_by_role('button',name='PASS & PLAY',exact=False).click();a.get_by_role('button',name='START PASS & PLAY',exact=True).click();a.get_by_role('button',name=re.compile('SHOW QUESTION')).click();a.locator('.logic-options button').first.click();assert a.locator('.logic-options button').count()==0;a.get_by_role('button',name=re.compile('SHOW QUESTION')).click();a.locator('.logic-options button').last.click();a.get_by_text('ANSWER & REASON',exact=False).wait_for();print('PASS Logic pass-and-play handoff/reveal',flush=True)
 a.goto(base+'/logic-brawl');a.get_by_role('button',name='VS CHESTER',exact=False).click();a.locator('.logic-options button').first.click();a.get_by_text('ANSWER & REASON',exact=False).wait_for();print('PASS Logic solo answer/reveal',flush=True)
 a.goto(base+'/road/logic');a.get_by_role('link',name='PLAY LEVEL 1',exact=False).click();a.get_by_role('button',name='ENTER ROAD MATCH',exact=True).click();a.locator('.logic-options button').first.click();a.get_by_text('ANSWER & REASON',exact=False).wait_for();print('PASS Logic road level1 answer/reveal',flush=True);b.close()
