import type { LocalCategory, LocalQuestion } from './trivia-local';
import type { QuestionDifficulty } from './trivia-settings';

// STATS LAB (20 Nov 2026, Forrest's urgent ask): advanced NBA + tennis stats
// trivia, 1990 to today, mixed on one shelf so classic mode rises easy to hard
// with both sports in every match. Every question is fact-checked against a
// cited source - see checks/trivia-stats-20261120/sources.md (one URL each).
// Records are framed so they stay true ("record", "first", named seasons).

const q = (level: QuestionDifficulty, question: string, correct: string, wrong: [string, string, string]): LocalQuestion => ({ level, question, correct, wrong });

export const STATS_CATEGORY_ID = -16;
export const STATS_CATEGORIES: LocalCategory[] = [
  { id: STATS_CATEGORY_ID, name: '📊 NBA & Tennis Stats' },
];

const NBA_EASY: LocalQuestion[] = [
  q('easy', 'Which team won the 2026 NBA championship, their first title since 1973?', 'New York Knicks', ['San Antonio Spurs', 'Boston Celtics', 'Oklahoma City Thunder']),
  q('easy', 'Who won back-to-back NBA MVP awards in 2024-25 and 2025-26?', 'Shai Gilgeous-Alexander', ['Nikola Jokić', 'Giannis Antetokounmpo', 'Luka Dončić']),
  q('easy', 'Who holds the NBA career record for triple-doubles?', 'Russell Westbrook', ['Magic Johnson', 'LeBron James', 'Jason Kidd']),
  q('easy', 'Which franchise has won the most NBA championships, with 18?', 'Boston Celtics', ['Los Angeles Lakers', 'Chicago Bulls', 'Golden State Warriors']),
];

const NBA_MEDIUM: LocalQuestion[] = [
  q('medium', 'Who sank an NBA-record 14 three-pointers in a single game in 2018?', 'Klay Thompson', ['Stephen Curry', 'Damian Lillard', 'Zach LaVine']),
  q('medium', 'Whose career three-point record did Stephen Curry break at Madison Square Garden in December 2021?', 'Ray Allen', ['Reggie Miller', 'Steve Kerr', 'Kyle Korver']),
  q('medium', 'Who is the youngest MVP in NBA history, winning in 2011 at age 22?', 'Derrick Rose', ['LeBron James', 'Kevin Durant', 'Tim Duncan']),
  q('medium', 'The 1995 Houston Rockets remain the lowest-seeded NBA champions. What seed were they?', 'Sixth seed', ['Fourth seed', 'Seventh seed', 'Eighth seed']),
  q('medium', 'How many official quadruple-doubles have been recorded in NBA history?', 'Four', ['Two', 'Six', 'Nine']),
  q('medium', 'Who scored an NBA All-Star Game record 55 points in 2023?', 'Jayson Tatum', ['Giannis Antetokounmpo', 'Stephen Curry', 'Anthony Davis']),
  q('medium', 'Who scored 71 points in the final game of the 1993-94 season to pip Shaquille O’Neal to the scoring title?', 'David Robinson', ['Hakeem Olajuwon', 'Patrick Ewing', 'Karl Malone']),
];

const NBA_HARD: LocalQuestion[] = [
  q('hard', 'What is the highest single-season points total since 1990: Kobe Bryant’s 2005-06 haul?', '2,832 points', ['2,618 points', '2,941 points', '3,011 points']),
  q('hard', 'Who holds the single-game assists record with 30, set on 30 December 1990?', 'Scott Skiles', ['John Stockton', 'Magic Johnson', 'Kevin Porter']),
  q('hard', 'Who holds the single-season record for technical fouls, with 41 in 2000-01?', 'Rasheed Wallace', ['Dennis Rodman', 'Draymond Green', 'Charles Barkley']),
  q('hard', 'Who owns the best career free-throw percentage in NBA history, above 91%?', 'Stephen Curry', ['Steve Nash', 'Mark Price', 'Ray Allen']),
  q('hard', 'Which team won 27 straight games in 2012-13, the longest single-season streak since 1972?', 'Miami Heat', ['Golden State Warriors', 'San Antonio Spurs', 'Houston Rockets']),
  q('hard', 'Who scored 83 points in March 2026, the second-highest single-game total in NBA history?', 'Bam Adebayo', ['Luka Dončić', 'Joel Embiid', 'Devin Booker']),
  q('hard', 'Who recorded the first 60-point triple-double in NBA history, in January 2018?', 'James Harden', ['Russell Westbrook', 'Luka Dončić', 'Nikola Jokić']),
  q('hard', 'Who set the record for the highest-scoring triple-double ever, with 61 points in April 2025?', 'Nikola Jokić', ['James Harden', 'Luka Dončić', 'Russell Westbrook']),
  q('hard', 'Whose 57 points in a 2020 playoff game are the most in a postseason game since 1990?', 'Donovan Mitchell', ['Michael Jordan', 'Allen Iverson', 'Jimmy Butler']),
  q('hard', 'Who grabbed the most rebounds in a season since 1990, with 1,530 in 1991-92?', 'Dennis Rodman', ['Dikembe Mutombo', 'Andre Drummond', 'Dwight Howard']),
];

const NBA_MASTER: LocalQuestion[] = [
  q('master', 'Who holds the single-season assists record with 1,164, set in 1990-91?', 'John Stockton', ['Magic Johnson', 'Isiah Thomas', 'Steve Nash']),
  q('master', 'Who owns the best single-season three-point percentage in a completed season: 53.6% in 2009-10?', 'Kyle Korver', ['Steve Kerr', 'Stephen Curry', 'Tim Legler']),
  q('master', 'Who has produced the most 50-40-90 shooting seasons, with four?', 'Steve Nash', ['Larry Bird', 'Kevin Durant', 'Stephen Curry']),
  q('master', 'Stephen Curry’s record run of consecutive games with a made three-pointer ended at how many?', '268 games', ['157 games', '311 games', '209 games']),
  q('master', 'James Harden’s streak of 30-point games, the longest since Wilt Chamberlain, ended at how many in 2019?', '32 games', ['25 games', '41 games', '28 games']),
  q('master', 'Who holds the NBA Finals record of 9 three-pointers in a single game, set in 2018?', 'Stephen Curry', ['Klay Thompson', 'Ray Allen', 'Kyrie Irving']),
  q('master', 'Who recorded the fastest triple-double in NBA history, in 14 minutes 33 seconds?', 'Nikola Jokić', ['Russell Westbrook', 'Magic Johnson', 'Luka Dončić']),
  q('master', 'Who is the oldest MVP in NBA history, winning in 1999 at age 35?', 'Karl Malone', ['Michael Jordan', 'Steve Nash', 'Hakeem Olajuwon']),
];

const TENNIS_EASY: LocalQuestion[] = [
  q('easy', 'Who holds the men’s record for Grand Slam singles titles, with 24?', 'Novak Djokovic', ['Rafael Nadal', 'Roger Federer', 'Pete Sampras']),
  q('easy', 'How many French Open singles titles has Rafael Nadal won?', '14', ['10', '12', '17']),
  q('easy', 'Who has spent the most weeks at WTA world No. 1, with 377?', 'Steffi Graf', ['Serena Williams', 'Martina Navratilova', 'Martina Hingis']),
  q('easy', 'Who beat Novak Djokovic in the 2021 US Open final to stop his calendar Grand Slam bid?', 'Daniil Medvedev', ['Alexander Zverev', 'Dominic Thiem', 'Stefanos Tsitsipas']),
  q('easy', 'Who became the first British man to win Wimbledon since 1936, in 2013?', 'Andy Murray', ['Tim Henman', 'Greg Rusedski', 'Cameron Norrie']),
];

const TENNIS_MEDIUM: LocalQuestion[] = [
  q('medium', 'Roger Federer’s record run of consecutive weeks at world No. 1 is how long?', '237 weeks', ['186 weeks', '270 weeks', '209 weeks']),
  q('medium', 'How many Grand Slam singles titles did Serena Williams win, an Open Era record?', '23', ['21', '22', '24']),
  q('medium', 'Who was the first qualifier, man or woman, to win a Grand Slam singles title?', 'Emma Raducanu', ['Jelena Ostapenko', 'Bianca Andreescu', 'Leylah Fernandez']),
  q('medium', 'Who is the only player to hold the ATP No. 1 ranking in three different decades?', 'Rafael Nadal', ['Roger Federer', 'Novak Djokovic', 'Andre Agassi']),
  q('medium', 'The Williams sisters met 31 times on tour. Who leads the head-to-head?', 'Serena, 19-12', ['Venus, 17-14', 'Serena, 16-15', 'Venus, 18-13']),
  q('medium', 'How many Wimbledon men’s singles titles did Roger Federer win?', '8', ['6', '7', '9']),
];

const TENNIS_HARD: LocalQuestion[] = [
  q('hard', 'Novak Djokovic’s record for total weeks at ATP world No. 1 stands at what?', '428 weeks', ['310 weeks', '377 weeks', '396 weeks']),
  q('hard', 'The longest ATP winning streak since 1990 is Novak Djokovic’s run of how many matches?', '43', ['37', '48', '39']),
  q('hard', 'Iga Świątek’s 2022 winning streak, the longest on the WTA Tour since 1990, reached how many matches?', '37', ['32', '41', '35']),
  q('hard', 'How long did the Isner-Mahut Wimbledon epic of 2010 last?', '11 hours 5 minutes', ['9 hours 58 minutes', '12 hours 31 minutes', '10 hours 14 minutes']),
  q('hard', 'How many aces did John Isner serve in that record match against Mahut?', '113', ['98', '121', '104']),
  q('hard', 'Who holds the ATP career aces record with over 14,400?', 'John Isner', ['Ivo Karlović', 'Goran Ivanišević', 'Milos Raonic']),
  q('hard', 'The most-played rivalry in ATP history is Djokovic-Nadal (60 meetings). Who leads it?', 'Djokovic, 31-29', ['Nadal, 31-29', 'Djokovic, 33-27', 'Nadal, 30-30']),
  q('hard', 'Who holds the record for most aces in a single season: 1,477 in 1996?', 'Goran Ivanišević', ['Pete Sampras', 'John Isner', 'Mark Philippoussis']),
];

const TENNIS_MASTER: LocalQuestion[] = [
  q('master', 'Who is the only wildcard to win a Grand Slam singles title, triumphing at Wimbledon 2001 while ranked 125?', 'Goran Ivanišević', ['Patrick Rafter', 'Marat Safin', 'Richard Krajicek']),
  q('master', 'Who is the youngest world No. 1 in ATP history, at 19 years and 4 months?', 'Carlos Alcaraz', ['Lleyton Hewitt', 'Marat Safin', 'Rafael Nadal']),
  q('master', 'Who is the youngest world No. 1 in WTA history, taking the top spot in March 1997?', 'Martina Hingis', ['Monica Seles', 'Maria Sharapova', 'Tracy Austin']),
  q('master', 'Who is the oldest world No. 1 in ATP history, last holding the top spot at 37?', 'Novak Djokovic', ['Roger Federer', 'Andre Agassi', 'Rafael Nadal']),
  q('master', 'Who was the first player to complete the Career Golden Masters, winning all nine Masters 1000 titles by 2018?', 'Novak Djokovic', ['Roger Federer', 'Rafael Nadal', 'Andy Murray']),
  q('master', 'Who became the second player to complete the Career Golden Masters, sealing it in Rome in 2026?', 'Jannik Sinner', ['Carlos Alcaraz', 'Daniil Medvedev', 'Alexander Zverev']),
  q('master', 'Roger Federer’s record run of consecutive Grand Slam semi-finals reached how many?', '23', ['17', '28', '19']),
  q('master', 'Who is the only men’s world No. 1 never to win a Grand Slam singles title?', 'Marcelo Ríos', ['Ivan Lendl', 'Andy Roddick', 'Carlos Moyá']),
];

export const STATS_QUESTIONS: Record<number, LocalQuestion[]> = {
  [STATS_CATEGORY_ID]: [...NBA_EASY, ...NBA_MEDIUM, ...NBA_HARD, ...NBA_MASTER, ...TENNIS_EASY, ...TENNIS_MEDIUM, ...TENNIS_HARD, ...TENNIS_MASTER],
};
