import { NextRequest, NextResponse } from 'next/server';

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
type ChaosEvent = 'NEON_BLINDNESS' | 'MULLIGAN' | 'TROJAN_PAWN' | null;
type BrawlRoom = {
  fen: string;
  turn: 'w' | 'b';
  p1Difficulty: Difficulty;
  p2Difficulty: Difficulty;
  activeChaosEvent: ChaosEvent;
  trojanPawnArmed: boolean;
  trojanPawnSquare: string | null;
  updatedAt: number;
};

const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const rooms = new Map<string, BrawlRoom>();

function validMatchId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{6,24}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!validMatchId(body.matchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  const room: BrawlRoom = {
    fen: initialFen,
    turn: 'w',
    p1Difficulty: body.p1Difficulty,
    p2Difficulty: body.p2Difficulty,
    activeChaosEvent: null,
    trojanPawnArmed: false,
    trojanPawnSquare: null,
    updatedAt: Date.now(),
  };
  rooms.set(body.matchId, room);
  return NextResponse.json(room, { status: 201 });
}

export function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('match');
  if (!validMatchId(matchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  const room = rooms.get(matchId);
  return room ? NextResponse.json(room) : NextResponse.json({ error: 'Brawl room not found' }, { status: 404 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!validMatchId(body.matchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  const room = rooms.get(body.matchId);
  if (!room) return NextResponse.json({ error: 'Brawl room not found' }, { status: 404 });
  if (typeof body.fen === 'string') {
    room.fen = body.fen;
    room.turn = body.turn === 'b' ? 'b' : 'w';
  }
  if (body.activeChaosEvent === 'NEON_BLINDNESS' || body.activeChaosEvent === 'MULLIGAN' || body.activeChaosEvent === 'TROJAN_PAWN' || body.activeChaosEvent === null) {
    room.activeChaosEvent = body.activeChaosEvent;
  }
  if (typeof body.trojanPawnArmed === 'boolean') room.trojanPawnArmed = body.trojanPawnArmed;
  if (typeof body.trojanPawnSquare === 'string' || body.trojanPawnSquare === null) room.trojanPawnSquare = body.trojanPawnSquare;
  room.updatedAt = Date.now();
  return NextResponse.json(room);
}