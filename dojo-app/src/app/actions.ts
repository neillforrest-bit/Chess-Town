'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const SCRIPTED_ROASTS = [
  "Neill opens with e4! Pure unhinged confidence, like drafting a kicker in Round 3.",
  "Brendan mirrors with e5. Symmetrical warfare! He's looking at Neill like an easy Week 1 matchup.",
  "Neill develops Nf3. Standard play, but his endgame is more questionable than his waiver wire history.",
  "Brendan locks down c6. The League Hero is quietly setting up a tactical ambush.",
  "The Italian Game! Neill places the Bishop on the lethal diagonal.",
  "🚨 THE BLACKBURNE SHILLING GAMBIT! Brendan offers the e5 pawn on a silver platter! It's a trap!",
  "HE TOOK IT! Neill bit on the poisoned pawn! Gabe is in the group chat screaming right now.",
  "Brendan deploys Qg5! Double attack! Neill's defensive secondary is completely torched.",
  "Neill forks Queen and Rook with Nxf7! He thinks he's winning—he has no idea he just stepped into the guillotine!",
  "BOOM! Brendan destroys g2! Neill's h1 Rook is officially on life support!",
  "Neill scrambles with Rf1! Pure panic defense. Smells like a 4th-quarter blowout.",
  "CHECK! Brendan captures the center! Neill is completely suffocating in the pocket.",
  "Neill blocks with Be2. The executioner has taken the field.",
  "👑 SMOTHERED CHECKMATE! Brendan drops the Knight! Neill is headed to the Sacko Bowl!"
];

export async function askGrandmaster(payloadString: string) {
  try {
    const payload = JSON.parse(payloadString);
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      return SCRIPTED_ROASTS[payload.ply % SCRIPTED_ROASTS.length];
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const systemPrompt = `
      You are Chester, the rogue AI Commissioner of the Concord High School Chess League.
      CONTEXT: ${payload.context}
      LIVE EVENT: "${payload.message}"
      DIRECTIVE: React to this chess move! Compare their skills to fantasy football blunders or epic waiver pickups. Max 2 sentences. No asterisks.
    `;
    
    const result = await model.generateContent(String(systemPrompt));
    return result.response.text().replace(/\*/g, '').trim(); 
  } catch (error) {
    const fallbackPayload = JSON.parse(payloadString);
    return SCRIPTED_ROASTS[fallbackPayload.ply % SCRIPTED_ROASTS.length];
  }
}