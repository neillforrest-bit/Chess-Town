import { NextResponse } from "next/server";
import { genQuestions } from "../../../lib/nfl";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard", { cache: "no-store" });
    if (!r.ok) throw new Error("espn " + r.status);
    const data = await r.json();
    const questions = genQuestions(data.events || []);
    if (questions.length < 12) throw new Error("thin slate");
    return NextResponse.json({ questions, live: true, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ questions: [], live: false, error: String(e) }, { status: 200 });
  }
}
