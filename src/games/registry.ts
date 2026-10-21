// One app, one codebase. Each game is declared here; its code lives in its own folder under src/games/<id>/ as it is migrated.
export type GameId = 'chess' | 'checkers' | 'trivia' | 'movie';
export type GameEntry = {
  id: GameId; name: string; icon: string; accent: string;
  single?: string; road?: string; battle?: string; blurb: { single: string; road: string; battle: string };
  external?: boolean; // links out to a separate preview app
};
export const CINESYNC_URL = 'https://chess-town-git-movie-night-neillo.vercel.app';
export const GAMES: GameEntry[] = [
  { id: 'chess', name: 'Chess', icon: '♞', accent: '#4ade80', single: '/play-chester', road: '/road/chess', battle: '/battle',
    blurb: { single: 'A coached game against Chester.', road: '15 levels, 5 named bosses, one Joseph.', battle: 'Live arena against a friend.' } },
  { id: 'checkers', name: 'Checkers', icon: '🔴', accent: '#f87171', single: '/play-checkers?mode=chester', road: '/road/checkers', battle: '/play-checkers?mode=battle',
    blurb: { single: 'Forced jumps, kings, trash talk.', road: 'Climb the board, beat the bosses.', battle: 'Invite link, phone to phone.' } },
  { id: 'trivia', name: 'Pub Trivia', icon: '🍻', accent: '#22d3ee', single: '/trivia-brawl', battle: '/trivia-brawl',
    blurb: { single: 'Pub quiz vs Chester.', road: 'Coming soon.', battle: 'Quiz a friend by link.' } },
  { id: 'movie', name: 'Movie Night', icon: '🎬', accent: '#fbbf24', single: CINESYNC_URL, external: true,
    blurb: { single: 'CineSync: find a film you both want.', road: 'Coming soon.', battle: 'Coming soon.' } },
];
export type Door = 'play' | 'road' | 'battle';
export const DOORS: { id: Door | 'league'; href: string; icon: string; title: string; copy: string; accent: string }[] = [
  { id: 'play', href: '/play', icon: '🎮', title: 'PLAY CHESTER', copy: 'Single games: chess, checkers, trivia, movie night.', accent: '#4ade80' },
  { id: 'road', href: '/road', icon: '👑', title: 'ROAD TO JOSEPH', copy: 'The adventure. Beat the bosses, reach Joseph.', accent: '#ffb800' },
  { id: 'battle', href: '/battle-mode', icon: '⚔️', title: 'BATTLE MODE', copy: 'Take on a friend, live.', accent: '#ffd84d' },
  { id: 'league', href: '/league', icon: '🏆', title: 'LEAGUE TABLE', copy: 'Where the town ranks.', accent: '#b8a2ff' },
];
