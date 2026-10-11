import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard", { cache: "no-store" });
    if (!sb.ok) throw new Error("scoreboard " + sb.status);
    const data = await sb.json();
    const events: any[] = data.events || [];
    const inProg = events.filter((e) => e.status?.type?.state === "in");
    if (!inProg.length) {
      const pre = events.filter((e) => e.status?.type?.state === "pre");
      return NextResponse.json({ live: false, reason: "no-game", next: pre[0]?.name || null, at: new Date().toISOString() });
    }
    const ev = inProg[0];
    const sum = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${ev.id}`, { cache: "no-store" });
    if (!sum.ok) throw new Error("summary " + sum.status);
    const s = await sum.json();
    const comp = ev.competitions[0];
    const home = comp.competitors.find((c: any) => c.homeAway === "home");
    const away = comp.competitors.find((c: any) => c.homeAway === "away");
    const drives = s.drives || {};
    const cur = drives.current || null;

    let drive = null;
    if (cur && !cur.result) {
      const plays: any[] = cur.plays || [];
      // last real snap (skip timeouts/penalties/kicks for state purposes)
      let lastPlay: any = null;
      for (let i = plays.length - 1; i >= 0; i--) {
        const tt = (plays[i]?.type?.text || "").toLowerCase();
        if (/timeout|end of|coin toss|kickoff|extra point/.test(tt)) continue;
        lastPlay = plays[i];
        break;
      }
      if (!lastPlay && plays.length) lastPlay = plays[plays.length - 1];
      let offense = cur.team?.displayName || null;
      for (let i = plays.length - 1; i >= 0; i--) {
        const t = plays[i]?.start?.team?.id;
        if (t) {
          const match = comp.competitors.find((c: any) => String(c.team.id) === String(t));
          if (match) { offense = match.team.displayName; break; }
        }
      }
      drive = {
        id: cur.id,
        offense,
        description: cur.description || "",
        lastPlay: lastPlay ? {
          id: lastPlay.id,
          typeText: lastPlay.type?.text || "",
          text: lastPlay.text || "",
          endDown: lastPlay.end?.down ?? null,
          endDist: lastPlay.end?.distance ?? null,
          downDist: lastPlay.end?.downDistanceText || lastPlay.start?.downDistanceText || "",
        } : null,
      };
    }
    return NextResponse.json({
      live: true,
      game: {
        id: ev.id,
        name: ev.name,
        home: home?.team?.displayName, away: away?.team?.displayName,
        hs: +(home?.score || 0), as: +(away?.score || 0),
        status: ev.status?.type?.shortDetail || ev.status?.type?.description || "",
        halftime: /half/i.test((ev.status?.type?.description || "") + (ev.status?.type?.shortDetail || "")),
        final: ev.status?.type?.completed === true,
      },
      drive,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ live: false, reason: "error", error: String(e) }, { status: 200 });
  }
}
