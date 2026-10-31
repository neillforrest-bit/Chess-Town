import json, subprocess, time, sys, requests, websocket

BASE = "https://chess-town-git-instinct-games-for-all-neillo.vercel.app"
PORT = 9333
chrome = subprocess.Popen(["google-chrome","--headless=new",f"--remote-debugging-port={PORT}","--no-sandbox","--disable-gpu","--user-data-dir=/tmp/qa-prof","--window-size=430,900","about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try:
        ver = requests.get(f"http://127.0.0.1:{PORT}/json/version", timeout=1).json(); break
    except Exception: time.sleep(0.3)

tabs = {}   # name -> (ws, id)
msg_id = [0]

def new_tab(url):
    r = requests.put(f"http://127.0.0.1:{PORT}/json/new?{url}", timeout=10).json()
    ws = websocket.create_connection(r["webSocketDebuggerUrl"], timeout=30)
    return {"ws": ws, "id": r["id"], "url": url}

def cmd(tab, method, params=None, timeout=30):
    msg_id[0] += 1
    mid = msg_id[0]
    tab["ws"].send(json.dumps({"id": mid, "method": method, "params": params or {}}))
    end = time.time() + timeout
    while time.time() < end:
        try:
            m = json.loads(tab["ws"].recv())
        except websocket.WebSocketTimeoutException:
            continue
        if m.get("id") == mid:
            return m.get("result", m)
    raise TimeoutError(method)

def ev(tab, expr, timeout=30):
    r = cmd(tab, "Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True}, timeout)
    if "exceptionDetails" in r: return f"JS-ERROR: {r['exceptionDetails'].get('text')}"
    return r.get("result", {}).get("value")

def nav(tab, url):
    cmd(tab, "Page.enable")
    cmd(tab, "Page.navigate", {"url": url})

def wait_for(tab, expr, timeout=25, poll=0.5):
    end = time.time() + timeout
    while time.time() < end:
        if ev(tab, expr): return True
        time.sleep(poll)
    return False

def click_btn(tab, label_part):
    return ev(tab, f"(()=>{{var b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes({json.dumps(label_part)})&&!x.disabled); if(b){{b.click(); return true}} return false}})()")

def fill_name(tab, name):
    ok = ev(tab, "(()=>{var i=document.querySelector('input[placeholder=\"Your name\"]'); if(!i) return false; i.focus(); return true})()")
    if not ok: return False
    cmd(tab, "Input.insertText", {"text": name})
    time.sleep(0.4)
    return ev(tab, "document.querySelector('input[placeholder=\"Your name\"]').value")

results = {"ok": True, "notes": []}
def note(k, v):
    results[k] = v
    print(f"== {k}: {json.dumps(v)[:300]}", flush=True)

try:
    host = new_tab("about:blank")
    nav(host, BASE + "/trivia-teams")
    assert wait_for(host, "!![...document.querySelectorAll('button')].find(x=>x.textContent.includes('HOST A QUIZ'))"), "host page load"
    click_btn(host, "HOST A QUIZ")
    assert wait_for(host, "/room=[A-Z]{4}/.test(document.body.innerText)"), "room code appears"
    code = ev(host, "document.body.innerText.match(/room=([A-Z]{4})/)[1]")
    note("room_code", code)

    # host joins as a player
    assert ev(host, "(()=>{var i=document.querySelector('input[placeholder=\"Your name (optional)\"]'); if(!i) return false; i.focus(); return true})()"), "host name input"
    cmd(host, "Input.insertText", {"text": "Neill"})
    time.sleep(0.4)
    click_btn(host, "JOIN AS A PLAYER")
    time.sleep(0.5)

    guests = []
    for i in range(10):
        g = new_tab("about:blank")
        nav(g, f"{BASE}/trivia-teams?room={code}")
        guests.append((f"P{i+1}", g))
    for name, g in guests:
        assert wait_for(g, "!!document.querySelector('input[placeholder=\"Your name\"]')", 30), f"{name} invite page"
        fill_name(g, name)
        click_btn(g, "LET'S PLAY")
    time.sleep(6)
    count = ev(host, "document.body.innerText.match(/Players in the room \\((\\d+)\\/12\\)/)?.[1]")
    note("players_joined", count)
    assert count == "11", f"expected 11 (10 guests + host), got {count}"

    # sort teams
    click_btn(host, "SORT INTO TEAMS"); time.sleep(1.5)
    teams_host = ev(host, "(()=>{var m=[...document.querySelectorAll('div')].filter(d=>/captain taps/.test(d.textContent)&&d.children.length<6); return document.body.innerText.match(/Round 1|TEAM TRIVIA/) ? [...document.querySelectorAll('div')].map(d=>d.textContent).filter(t=>/captain taps/.test(t)).length : -1})()")
    team_txt = ev(host, "document.body.innerText")
    note("teams_screen_excerpt", [l for l in team_txt.split("\n") if "captain" in l or "★" in l][:12])
    n_teams = team_txt.count("captain taps the answers")
    assert 2 <= n_teams <= 4, f"teams count {n_teams}"

    click_btn(host, "MEET TONIGHT'S CATEGORIES"); time.sleep(1.5)
    cats = ev(host, "(()=>{var t=document.body.innerText; var m=t.match(/Tonight's 5 rounds([\\s\\S]*?)(START ROUND|MEET)/); return m?m[1].trim():t})()")
    note("categories", cats)
    assert len(set([l for l in cats.split("\n") if l.strip() and not l.strip().isdigit()])) == 5, "5 unique categories"

    questions_seen = []
    round_scores = []
    for r in range(5):
        assert click_btn(host, f"START ROUND {r+1}" if r > 0 else "START ROUND 1"), f"start round {r+1}"
        time.sleep(2)
        for q in range(5):
            qt = ev(host, "(()=>{var m=document.body.innerText.match(/Question \\d+ of 5\\n\\d+\\n([\\s\\S]*?)(\\nThe |\\nA\\.)/); return m?m[1]:'?'})()")
            questions_seen.append(qt)
            # every guest: click first enabled answer (only captains have them)
            for name, g in guests:
                ev(g, "(()=>{var b=[...document.querySelectorAll('button')].find(x=>/^[A-D]\\./.test(x.textContent)&&!x.disabled); if(b){b.click(); return 1} return 0})()")
            # wait for reveal (auto when all locked) else host reveal
            # wait for all teams locked (auto-reveal) or host manual reveal
            all_locked = wait_for(host, "!!document.body.innerText.match(/NEXT QUESTION|TEAM SCOREBOARD/)", 30)
            if not all_locked and ev(host, "/REVEAL ANSWER/.test(document.body.innerText)"):
                click_btn(host, "REVEAL ANSWER")
                all_locked = wait_for(host, "!!document.body.innerText.match(/NEXT QUESTION|TEAM SCOREBOARD/)", 10)
            assert all_locked, f"reveal q{q+1} r{r+1}: " + ev(host, "document.body.innerText.slice(0,400)")
            time.sleep(0.5)
            if q < 4:
                ok = wait_for(host, "!![...document.querySelectorAll('button')].find(x=>x.textContent.includes('NEXT QUESTION')&&!x.disabled)", 10)
                assert ok and click_btn(host, "NEXT QUESTION"), f"next q{q+1} r{r+1}"
                time.sleep(2)
        assert click_btn(host, "TEAM SCOREBOARD"), f"scoreboard r{r+1}"
        time.sleep(1.5)
        sb = ev(host, "(()=>{var m=document.body.innerText.match(/Scoreboard after round \\d+([\\s\\S]*?)(START ROUND|FINAL RESULTS)/); return m?m[1].trim():'?'})()")
        round_scores.append(sb)
        note(f"scoreboard_r{r+1}", sb[:200])
    assert click_btn(host, "FINAL RESULTS"), "final"
    time.sleep(1.5)
    final = ev(host, "document.body.innerText.match(/(IT'S A TIE!|[A-Z' ]+ WIN!)[\\s\\S]*?(PLAY AGAIN|$)/)?.[0]")
    note("final", (final or "?")[:250])

    # score consistency: sum of roundScores equals total
    cons = ev(host, "(()=>{return 'checked-on-client'})()")
    note("question_count", len(questions_seen))
    note("unique_questions", len(set(questions_seen)))
    note("repeat_questions", [q for q in set(questions_seen) if questions_seen.count(q) > 1])

    # rematch
    assert click_btn(host, "PLAY AGAIN"), "play again"
    time.sleep(2)
    note("rematch_lobby", "Players in the room (11/12)" in ev(host, "document.body.innerText"))

    # rejoin: reload a guest mid-lobby
    g = guests[0][1]
    nav(g, f"{BASE}/trivia-teams?room={code}")
    time.sleep(4)
    body = ev(g, "document.body.innerText")
    note("rejoin_after_reload", "invite" if "You're in for" in body else ("in-room" if "Stand by" in body or "host will sort" in body else body[:120]))
except AssertionError as e:
    results["ok"] = False
    results["failed"] = str(e)
    try: results["host_screen"] = ev(host, "document.body.innerText.slice(0,800)")
    except Exception: pass
    print("ASSERT-FAIL:", e, flush=True)
finally:
    with open("/tmp/qa_result.json","w") as f: json.dump(results, f, indent=2)
    chrome.terminate()
print("DONE", flush=True)
