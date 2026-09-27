'use client';

import { useState } from 'react';
import { encodeVerdict, type VerdictCard } from '@/lib/verdict';
import type { GradedMove } from './ChesterReportCard';

// SHARE YOUR VERDICT - builds the shareable report card and its public link.
// Chester voices the card through /api/verdict; if that call fails the
// deterministic lines below keep sharing alive offline.

type Props = {
  grades: GradedMove[];
  pgn?: string;
  opponentLabel: string;
  difficulty?: string;
  summary?: { grade?: string; score?: number; accuracy?: number; openingName?: string | null };
};

function moveNo(ply?: number) {
  return Math.max(1, Math.ceil((ply || 1) / 2));
}

export default function VerdictShare({ grades, pgn, opponentLabel, difficulty, summary }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [url, setUrl] = useState('');
  const [shareText, setShareText] = useState('');
  const [copied, setCopied] = useState(false);
  const [cardLines, setCardLines] = useState<{ headline: string; turningPoint: string; funniestMoment: string; lesson: string } | null>(null);

  const result: VerdictCard['r'] = /1-0\s*$/.test(pgn || '') ? 'won' : /0-1\s*$/.test(pgn || '') ? 'lost' : 'drew';
  const mine = grades.filter((g) => g.player === 'You');
  const goodRatio = mine.length ? mine.filter((g) => g.grade === 'A' || g.grade === 'B').length / mine.length : 0;
  const grade = summary?.grade || (goodRatio >= 0.8 ? 'A' : goodRatio >= 0.65 ? 'B' : goodRatio >= 0.5 ? 'C' : goodRatio >= 0.35 ? 'D' : 'F');
  const score = summary?.score ?? Math.round(goodRatio * 100);
  const moves = grades.length ? Math.max(...grades.map((g) => g.ply || 1)) : 0;

  const localLines = () => {
    const worst = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b)) : null;
    const best = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 999) <= (b.centipawnLoss ?? 999) ? a : b)) : null;
    const resultWord = result === 'won' ? 'beat' : result === 'drew' ? 'held' : 'fought';
    return {
      headline: `You ${resultWord} ${opponentLabel} and lived to tell the tale.`,
      turningPoint: best ? `Move ${moveNo(best.ply)} was your cleanest decision of the whole game.` : 'The middlegame tug-of-war decided everything.',
      funniestMoment: worst && (worst.centipawnLoss ?? 0) >= 200 ? `Move ${moveNo(worst.ply)} was magnificently weird - technically a blunder, but Chester respects the audacity.` : 'Chester checked twice: no howlers. Frankly, he is a little disappointed.',
      lesson: 'Next game, win the race to castle - king safety first, heroics second.',
    };
  };

  const build = async () => {
    setState('loading');
    let lines = localLines();
    try {
      const res = await fetch('/api/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeHistory: grades, difficulty, result, score, grade, accuracy: summary?.accuracy, openingName: summary?.openingName || undefined, moves, opponentLabel }),
      });
      if (res.ok) {
        const data = await res.json() as Partial<{ headline: string; turningPoint: string; funniestMoment: string; lesson: string }>;
        lines = {
          headline: data.headline || lines.headline,
          turningPoint: data.turningPoint || lines.turningPoint,
          funniestMoment: data.funniestMoment || lines.funniestMoment,
          lesson: data.lesson || lines.lesson,
        };
      }
    } catch {
      // Offline or API down: the deterministic card still shares.
    }
    setCardLines(lines);
    const card: VerdictCard = { v: 1, g: grade, s: score, r: result, o: opponentLabel, m: moves, acc: summary?.accuracy, h: lines.headline, tp: lines.turningPoint, fm: lines.funniestMoment, l: lines.lesson };
    const link = `${window.location.origin}/verdict?c=${encodeVerdict(card)}`;
    setUrl(link);
    setShareText(`Chester graded my game ${grade} (${score}/100) vs ${opponentLabel} - ${link}`);
    setState('ready');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your verdict:', shareText);
    }
  };

  const saveImage = () => {
    if (!cardLines) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#07090a'; ctx.fillRect(0, 0, 1080, 1080);
    ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 10; ctx.strokeRect(24, 24, 1032, 1032);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22d3ee'; ctx.font = '900 34px Arial';
    ctx.fillText('C H E S S - T O W N   V E R D I C T', 540, 110);
    ctx.fillStyle = grade === 'A' ? '#ffd84d' : grade === 'F' ? '#f43f7a' : '#efffff';
    ctx.font = '900 280px Georgia, serif';
    ctx.fillText(grade, 540, 400);
    ctx.fillStyle = '#efffff'; ctx.font = '900 46px Arial';
    ctx.fillText(`${score}/100 vs ${opponentLabel}`, 540, 478);
    ctx.fillText(result === 'won' ? 'VICTORY' : result === 'drew' ? 'DRAW' : 'DEFEAT', 540, 536);
    const wrap = (text: string, y: number, font = '400 30px Arial', color = '#d7e3e5') => {
      ctx.font = font; ctx.fillStyle = color;
      let line = ''; let yy = y;
      for (const w of text.split(' ')) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > 900 && line) { ctx.fillText(line, 540, yy); yy += 44; line = w; } else line = test;
      }
      ctx.fillText(line, 540, yy);
      return yy + 44;
    };
    let yy = wrap(cardLines.headline, 630, '900 34px Georgia, serif', '#efffff');
    yy = wrap(`STAR MOVE: ${cardLines.turningPoint}`, yy + 26);
    yy = wrap(`CHESTER'S MOMENT: ${cardLines.funniestMoment}`, yy + 12);
    yy = wrap(`LESSON: ${cardLines.lesson}`, yy + 12);
    ctx.fillStyle = '#ffd84d'; ctx.font = 'italic 900 32px Georgia, serif';
    ctx.fillText('- Chester', 540, Math.min(yy + 34, 990));
    ctx.fillStyle = '#4b5d62'; ctx.font = '400 24px Arial';
    ctx.fillText('C H E S S - T O W N', 540, 1032);
    const a = document.createElement('a');
    a.download = `chess-town-verdict-${grade}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'My Chess-Town verdict', text: shareText, url });
    } catch {
      // dismissed or unsupported - no-op
    }
  };

  if (state === 'idle') {
    return <button type="button" className="verdict-share__cta" onClick={() => void build()}>📣 SHARE YOUR VERDICT<small>get a link for the group chat</small></button>;
  }
  if (state === 'loading') {
    return <div className="verdict-share__cta is-loading">Chester is signing your report card…</div>;
  }
  return <div className="verdict-share__box">
    <span className="verdict-share__label">YOUR VERDICT LINK - paste it anywhere</span>
    <code className="verdict-share__url" onClick={() => void copy()}>{url.replace(/^https?:\/\//, '').slice(0, 64)}…</code>
    <div className="verdict-share__row">
      {'share' in navigator && <button type="button" onClick={() => void nativeShare()}>📤 SHARE</button>}
      <button type="button" onClick={() => void copy()}>{copied ? '✓ COPIED' : '🔗 COPY LINK'}</button>
      <button type="button" onClick={saveImage}>🖼 SAVE IMAGE</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">💬 WHATSAPP</a>
    </div>
  </div>;
}
