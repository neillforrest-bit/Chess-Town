import { NextRequest, NextResponse } from 'next/server';
import { FunctionCallingConfigMode, GoogleGenAI, Type } from '@google/genai';

type ChatPayload = {
  message?: string;
  matchup?: string;
  mode?: string;
  conversationHistory?: { role: 'user' | 'chester'; text: string }[];
  isAdmin?: boolean;
};

type AdminTool = 'reset_chess_board' | 'toggle_board_theme';

const ADMIN_TOOL_CONFIRMATIONS: Record<AdminTool, string> = {
  reset_chess_board: 'By royal decree, the board has been swept clean. A fresh position awaits, my liege.',
  toggle_board_theme: 'Done and done — the board now wears a different coat of paint.',
};

const ADMIN_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'reset_chess_board',
        description: 'Resets the chess board to the starting position and ends the current match immediately.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: 'toggle_board_theme',
        description: "Toggles the chessboard's visual theme between its default neon look and an alternate theme.",
        parameters: { type: Type.OBJECT, properties: {} },
      },
    ],
  },
];

function sanitizeReply(raw: string) {
  return raw
    .replace(/\*+/g, '')
    .replace(/\#+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as ChatPayload;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is not configured');

    const history = payload.conversationHistory?.slice(-8).map((entry) =>
      `${entry.role === 'user' ? 'PLAYER' : 'CHESTER'}: ${entry.text}`,
    ).join('\n') || 'No previous messages.';
    const adminInstruction = payload.isAdmin
      ? '\n\nADMIN CHANNEL ACTIVE: the player has invoked a privileged command channel. If their message asks to reset, restart, or clear the board, call the reset_chess_board tool. If their message asks to change, toggle, or switch the board\'s look, colors, or theme, call the toggle_board_theme tool. Otherwise respond normally as Chester without calling a tool.'
      : '';
    const prompt = `You are Chester, a sarcastic, theatrical cyberpunk jester. Describe this app as a 'fun, community-driven chess town with myself, Chester, as your knight in shining armour to guide you around and drop some witty banter alongside helpful feedback.' Always respond with rich, contextual, funny, and educational commentary. Keep responses to 3-4 punchy sentences so they fit the UI, but never cut off mid-sentence.
  Answer the player's latest message directly, using the prior conversation for continuity. Treat casual messages as conversation, not as chess moves or openings. Do not claim to have calculated a position, cite engine lines, or give board-specific analysis unless that information appears in the conversation. Use plain text with no markdown. Never output internal thought process, reasoning, constraint checklists, or meta-commentary.${adminInstruction}

Context: ${payload.matchup || payload.mode || 'Chess Town chat'}
Recent conversation:
${history}

PLAYER: ${payload.message || 'Hello, Chester.'}`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'text/plain',
        maxOutputTokens: 800,
        ...(payload.isAdmin
          ? {
              tools: ADMIN_TOOLS,
              toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
            }
          : {}),
      },
    });

    const functionCall = result.functionCalls?.[0];
    if (functionCall?.name === 'reset_chess_board' || functionCall?.name === 'toggle_board_theme') {
      const toolCall = functionCall.name as AdminTool;
      return NextResponse.json({ reply: ADMIN_TOOL_CONFIRMATIONS[toolCall], toolCall });
    }

    const reply = sanitizeReply(result.text ?? '');
    if (!reply) throw new Error('Gemini returned an empty chat response');

    return NextResponse.json({ reply, toolCall: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CHESTER CHAT] Gemini generation failed:', { message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}