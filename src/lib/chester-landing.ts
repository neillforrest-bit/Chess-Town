export const CHESTER_LANDING_COPY = {
  introGreeting: "Welcome to Chess-Town. I'm Chester. Are we launching a Halloween Gambit today, or are you just here to stare at the board? Click anywhere to begin.",
  dailyLeaderboard: "See who's ruling the board today. Think you can bump them off?",
  dailyChallenge: "I set up a new puzzle every single day. Solve it fast, and your name goes up on my personal top 10 wall.",
  training: "Master the basics and beyond. Score passing marks to unlock the next tier of my chess gauntlet.",
  gameplay: "Take me on at any skill level, send a link to crush a friend 1-on-1, or try out our wild 2v2 team format.",
  league: "Your private arena. Track the long-term rivalries and see who truly owns the bragging rights this season.",
};

export const PORTALS = [
  { title: 'Daily Leaderboard', icon: '♛', href: '/chester-challenge', dialogue: "See who's ruling the board today. Think you can bump them off?", accent: 'gold' },
  { title: 'Daily Chester Challenge', icon: '♞', href: '/chester-challenge', dialogue: "A Trompowsky setup went wrong. Find the mate in three to get on my wall of fame.", accent: 'pink' },
  { title: 'Chess Town Gameplay', icon: '♜', href: '/arena?view=play', dialogue: "Choose your difficulty and take a seat. I have prepared some deeply educational consequences.", accent: 'cyan' },
  { title: 'Player Challenges', icon: '♟', href: '/arena?view=matchups', dialogue: "Send the invite. Rivalries do not build themselves, despite what your group chat claims.", accent: 'acid' },
  { title: 'League Play', icon: '♚', href: '/arena?view=leagues', dialogue: "The 12-player arena. Let's see who's actually studying their endgames.", accent: 'violet' },
] as const;

export const DAILY_LEADERS = [
  { rank: 1, name: "Brendan", points: 980, form: "W5" },
  { rank: 2, name: "Z-Man", points: 920, form: "W4" },
  { rank: 3, name: "Gabe", points: 860, form: "W3" },
  { rank: 4, name: "Neill", points: 810, form: "W2" },
  { rank: 5, name: "Sam", points: 760, form: "L1" },
];

export const LEAGUE_STANDINGS = [
  ["Queenside United", 10, 1, "W5"], ["Knight Riders", 9, 2, "W4"], ["Bongcloud FC", 8, 3, "W3"],
  ["The Forks", 8, 3, "W2"], ["Castle Crashers", 7, 4, "L1"], ["Rook & Roll", 6, 5, "W1"],
  ["Tempo Titans", 6, 5, "W2"], ["Pawn Stars", 5, 6, "L2"], ["Bishop Brigade", 4, 7, "L1"],
  ["Checkmates", 3, 8, "W1"], ["Draw Merchants", 2, 9, "L3"], ["En Passant Club", 1, 10, "L4"],
] as const;
