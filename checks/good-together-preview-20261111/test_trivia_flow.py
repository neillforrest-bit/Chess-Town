import base64
import json
import subprocess
import time
from pathlib import Path

import requests
import websocket

BASE = 'http://127.0.0.1:3100'
PORT = 9445
CHROME = None
msg_id = 0


def start_chrome():
    global CHROME
    profile = Path('/tmp/ct-trivia-chrome-profile')
    CHROME = subprocess.Popen([
        'google-chrome', '--headless=new', f'--remote-debugging-port={PORT}', '--no-sandbox', '--disable-gpu',
        '--disable-dev-shm-usage', f'--user-data-dir={profile}', 'about:blank',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(80):
        try:
            requests.get(f'http://127.0.0.1:{PORT}/json/version', timeout=1).json()
            return
        except Exception:
            time.sleep(.25)
    raise RuntimeError('Chrome did not start')


def cmd(tab, method, params=None, timeout=30):
    global msg_id
    msg_id += 1
    mid = msg_id
    tab['ws'].send(json.dumps({'id': mid, 'method': method, 'params': params or {}}))
    end = time.time() + timeout
    while time.time() < end:
        data = json.loads(tab['ws'].recv())
        if data.get('id') == mid:
            if 'error' in data:
                raise RuntimeError(f"{method}: {data['error']}")
            return data.get('result', {})
    raise TimeoutError(method)


def new_tab(width=390, height=844):
    target = requests.put(f'http://127.0.0.1:{PORT}/json/new?about:blank', timeout=10).json()
    ws = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=30)
    tab = {'ws': ws, 'id': target['id']}
    cmd(tab, 'Page.enable')
    cmd(tab, 'Runtime.enable')
    cmd(tab, 'Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': width < 600})
    return tab


def goto(tab, url):
    cmd(tab, 'Page.navigate', {'url': url})


def evaluate(tab, expression):
    result = cmd(tab, 'Runtime.evaluate', {'expression': expression, 'awaitPromise': True, 'returnByValue': True})
    if result.get('exceptionDetails'):
        raise RuntimeError(result['exceptionDetails'])
    return result.get('result', {}).get('value')


def wait_for(tab, expression, timeout=20, label=None):
    end = time.time() + timeout
    last = None
    while time.time() < end:
        last = evaluate(tab, expression)
        if last:
            return last
        time.sleep(.2)
    raise TimeoutError(f"{label or expression}; last={last!r}; body={evaluate(tab, 'document.body.innerText')[:1200]}")


def click_text(tab, text, timeout=15):
    script = """(() => {
      const wanted = %s;
      const item = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().toUpperCase().includes(wanted.toUpperCase()) && !b.disabled);
      if (!item) return false;
      item.click();
      return true;
    })()""" % json.dumps(text)
    end = time.time() + timeout
    while time.time() < end:
        if evaluate(tab, script):
            return True
        time.sleep(.2)
    raise TimeoutError(f'button {text}; body={evaluate(tab, "document.body.innerText")[:1200]}')


def shot(tab, path):
    data = cmd(tab, 'Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False}, timeout=30)['data']
    Path(path).write_bytes(base64.b64decode(data))


def body(tab):
    return evaluate(tab, 'document.body.innerText')


def set_input(tab, label, value):
    script = """(() => {
      const input = [...document.querySelectorAll('input')].find((i) => (i.getAttribute('aria-label') || i.placeholder || '').toLowerCase().includes(%s));
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, %s);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()""" % (json.dumps(label.lower()), json.dumps(value))
    return evaluate(tab, script)


def answer_indices(tab, index):
    script = """(() => {
      const buttons = [...document.querySelectorAll('.trivia-brawl-answers button')].filter((b) => !b.disabled);
      if (!buttons.length) return false;
      buttons[Math.min(%d, buttons.length - 1)].click();
      return true;
    })()""" % index
    return evaluate(tab, script)


def question_info(tab):
    return evaluate(tab, """(() => ({
      text: document.body.innerText,
      answers: [...document.querySelectorAll('.trivia-brawl-answers button')].length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      url: location.href,
    }))()""")


def run():
    start_chrome()
    tabs = []
    try:
        # Lobby and focused solo, mobile.
        solo = new_tab(390, 844); tabs.append(solo)
        goto(solo, f'{BASE}/trivia-brawl')
        wait_for(solo, "document.body.innerText.includes('MATCH SETUP')", 25, 'lobby setup')
        click_text(solo, '🏀 NBA')
        click_text(solo, 'MASTER')
        wait_for(solo, "document.body.innerText.includes('🏀 NBA · MASTER')", 10, 'lobby selected setup')
        shot(solo, '/downloads/trivia-185-lobby-mobile.png')
        click_text(solo, 'PLAY SOLO VS CHESTER')
        wait_for(solo, "document.body.innerText.includes('Focused solo: 🏀 NBA')", 15, 'solo focus draft')
        click_text(solo, 'START 🏀 NBA · MASTER')
        wait_for(solo, "document.body.innerText.includes('NBA') && document.querySelectorAll('.trivia-brawl-answers button').length === 4", 15, 'solo NBA question')
        solo_info = question_info(solo)
        assert 'NBA' in solo_info['text'], solo_info
        assert solo_info['answers'] == 4, solo_info
        assert not solo_info['overflow'], solo_info
        shot(solo, '/downloads/trivia-185-solo-nba-master-mobile.png')

        # Focused Pass & Play, mobile.
        pp = new_tab(390, 844); tabs.append(pp)
        goto(pp, f'{BASE}/trivia-brawl?pass=1')
        wait_for(pp, "document.body.innerText.includes('MATCH SETUP')", 20, 'pass setup')
        click_text(pp, '⚽ PREMIER LEAGUE')
        click_text(pp, 'HARD')
        assert set_input(pp, 'player one name', 'NEILL')
        assert set_input(pp, 'player two name', 'JEMMA')
        click_text(pp, 'PULL UP A STOOL')
        wait_for(pp, "document.body.innerText.includes('confirm ⚽ PREMIER LEAGUE')", 10, 'pass A confirm')
        click_text(pp, 'PASS TO JEMMA')
        wait_for(pp, "document.body.innerText.includes('START ⚽ PREMIER LEAGUE · HARD')", 10, 'pass B confirm')
        click_text(pp, 'START ⚽ PREMIER LEAGUE · HARD')
        wait_for(pp, "document.body.innerText.includes('Premier League') && document.querySelectorAll('.trivia-brawl-answers button').length === 4", 20, 'pass PL question')
        pp_info = question_info(pp)
        assert 'HARD HEAT' in pp_info['text'], pp_info
        assert not pp_info['overflow'], pp_info
        shot(pp, '/downloads/trivia-185-pass-pl-hard-mobile.png')

        # Standalone Last Call Quiz gets the same controls.
        quiz = new_tab(390, 844); tabs.append(quiz)
        goto(quiz, f'{BASE}/trivia')
        wait_for(quiz, "document.body.innerText.includes('MATCH SETUP')", 20, 'last call setup')
        click_text(quiz, '🏈 NFL')
        click_text(quiz, 'EASY')
        wait_for(quiz, "document.body.innerText.includes('NFL') && document.body.innerText.includes('EASY') && document.querySelectorAll('.trivia-answers button').length === 4", 20, 'last call NFL easy')
        quiz_info = evaluate(quiz, "({text: document.body.innerText, overflow: document.documentElement.scrollWidth > window.innerWidth})")
        assert not quiz_info['overflow'], quiz_info
        shot(quiz, '/downloads/trivia-185-lastcall-nfl-easy-mobile.png')

        # Hosted brawl: host and guest agree to an NBA Master match, then play to finish.
        host = new_tab(390, 844); guest = new_tab(390, 844); tabs.extend([host, guest])
        goto(host, f'{BASE}/trivia-brawl?host=1')
        wait_for(host, "document.body.innerText.includes('MATCH SETUP')", 25, 'host setup')
        click_text(host, '🏀 NBA')
        click_text(host, 'MASTER')
        invite = wait_for(host, "document.querySelector('input[aria-label=\\\"Invite link for Player 2\\\"]')?.value", 30, 'invite link')
        assert '/trivia-brawl?match=' in invite and 'role=p2' in invite, invite
        goto(guest, invite)
        wait_for(guest, "document.body.innerText.includes('🏀 NBA · MASTER')", 45, 'guest room setup')
        click_text(host, 'LOCK 🏀 NBA · MASTER')
        click_text(guest, 'LOCK 🏀 NBA · MASTER')
        wait_for(host, "document.body.innerText.includes('The categories are locked')", 45, 'host intro')
        wait_for(guest, "document.body.innerText.includes('The categories are locked')", 45, 'guest intro')
        click_text(host, 'START THE BRAWL', 45)
        wait_for(host, "document.body.innerText.includes('MASTER HEAT') && document.querySelectorAll('.trivia-brawl-answers button').length === 4", 30, 'host first master question')
        wait_for(guest, "document.body.innerText.includes('MASTER HEAT') && document.querySelectorAll('.trivia-brawl-answers button').length === 4", 30, 'guest first master question')
        shot(host, '/downloads/trivia-185-hosted-nba-master-host.png')
        shot(guest, '/downloads/trivia-185-hosted-nba-master-guest.png')

        # Play the hosted match to a result. Host takes option 1, guest option 2;
        # flashes are settled through their real controls, including The Twenty.
        for step in range(180):
            htext = body(host)
            if 'wins the tab' in htext or ('A dead heat' in htext and 'rematch' in htext.lower()):
                break
            if 'START THE BRAWL' in htext:
                click_text(host, 'START THE BRAWL')
                time.sleep(.3)
                continue
            if 'The Twenty' in htext and 'SETTLED' not in htext:
                # Try host, then guest; an out-of-turn click is rejected harmlessly.
                for tab in (host, guest):
                    evaluate(tab, """(() => {
                      const button = [...document.querySelectorAll('.trivia-duel-grid button')].find((b) => !b.disabled);
                      if (button) button.click();
                    })()""")
                    time.sleep(.2)
                    if 'SETTLED' in body(host) or 'ROUND SUMMARY' in body(host):
                        break
                continue
            if '⚡' in htext and 'SETTLED' not in htext and evaluate(host, "document.querySelectorAll('.trivia-brawl-answers button').length"):
                answer_indices(host, 0)
                time.sleep(.15)
                if 'SETTLED' not in body(host):
                    answer_indices(guest, 1)
                time.sleep(.25)
                continue
            if 'ROUND SUMMARY' in htext:
                click_text(host, 'ROUND SUMMARY')
                time.sleep(.3)
                continue
            if 'NEXT ROUND' in htext or 'LAST CALL - SUDDEN DEATH' in htext or 'FINAL CALL' in htext:
                for label in ('NEXT ROUND', 'LAST CALL - SUDDEN DEATH', 'FINAL CALL'):
                    try:
                        click_text(host, label, 1)
                        break
                    except Exception:
                        pass
                time.sleep(.3)
                continue
            if evaluate(host, "document.querySelectorAll('.trivia-brawl-answers button').length") and 'The answer was' not in htext:
                answer_indices(host, 0)
                time.sleep(.15)
                answer_indices(guest, 1)
                time.sleep(.25)
                continue
            if 'The answer was' in htext:
                for label in ('NEXT QUESTION', '⚡ FLASH FINALE', 'NEXT DECIDER'):
                    try:
                        click_text(host, label, 1)
                        break
                    except Exception:
                        pass
                time.sleep(.3)
                continue
            time.sleep(.4)
        else:
            raise TimeoutError('hosted match did not finish')
        final_text = body(host)
        assert 'wins the tab' in final_text or 'A dead heat' in final_text, final_text[-1000:]
        assert 'REMATCH' in final_text, final_text[-1000:]
        shot(host, '/downloads/trivia-185-hosted-finished-mobile.png')

        # Tablet lobby evidence.
        tablet = new_tab(820, 1180); tabs.append(tablet)
        goto(tablet, f'{BASE}/trivia-brawl')
        wait_for(tablet, "document.body.innerText.includes('MATCH SETUP')", 20, 'tablet setup')
        tablet_info = evaluate(tablet, "({text: document.body.innerText, overflow: document.documentElement.scrollWidth > window.innerWidth})")
        assert not tablet_info['overflow'], tablet_info
        shot(tablet, '/downloads/trivia-185-lobby-tablet.png')

        print(json.dumps({'ok': True, 'solo': solo_info, 'pass': pp_info, 'final': final_text[-500:]}, indent=2))
    finally:
        for tab in tabs:
            try: tab['ws'].close()
            except Exception: pass
        if CHROME:
            CHROME.terminate()
            try: CHROME.wait(timeout=5)
            except Exception: CHROME.kill()


if __name__ == '__main__':
    run()
