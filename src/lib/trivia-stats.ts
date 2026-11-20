import type { LocalCategory, LocalQuestion } from './trivia-local';
import type { QuestionDifficulty } from './trivia-settings';

// STATS LAB reissue (20 Nov 2026): NBA stats, tennis stats and Oscar-winning
// films on one shelf. Forrest's brief: hard questions about well-known facts,
// no obscure year- or number-guessing. Every question is fact-checked against
// a cited source - see checks/trivia-stats-20261120/sources.md (one URL each).
// Records are framed so they stay true ("record", "first", "only", named events).

const q = (level: QuestionDifficulty, question: string, correct: string, wrong: [string, string, string]): LocalQuestion => ({ level, question, correct, wrong });

export const STATS_CATEGORY_ID = -16;
export const STATS_CATEGORIES: LocalCategory[] = [
  { id: STATS_CATEGORY_ID, name: '📊 NBA, Tennis & Oscars' },
];

const NBA_EASY: LocalQuestion[] = [
  q('easy', 'Which team won the 2026 NBA championship, their first title since 1973?', 'New York Knicks', ['San Antonio Spurs', 'Boston Celtics', 'Oklahoma City Thunder']),
  q('easy', 'Who won back-to-back NBA MVP awards in 2024-25 and 2025-26?', 'Shai Gilgeous-Alexander', ['Nikola Jokić', 'Giannis Antetokounmpo', 'Luka Dončić']),
  q('easy', 'Who holds the NBA career record for triple-doubles?', 'Russell Westbrook', ['Magic Johnson', 'LeBron James', 'Jason Kidd']),
  q('easy', 'Which franchise has won the most NBA championships, with 18?', 'Boston Celtics', ['Los Angeles Lakers', 'Chicago Bulls', 'Golden State Warriors']),
  q('easy', 'Which player won the most NBA championships: 11 rings in 13 seasons?', 'Bill Russell', ['Wilt Chamberlain', 'Kareem Abdul-Jabbar', 'Michael Jordan']),
];

const NBA_MEDIUM: LocalQuestion[] = [
  q('medium', 'Who sank an NBA-record 14 three-pointers in a single game in 2018?', 'Klay Thompson', ['Stephen Curry', 'Damian Lillard', 'Zach LaVine']),
  q('medium', 'Whose career three-point record did Stephen Curry break at Madison Square Garden in December 2021?', 'Ray Allen', ['Reggie Miller', 'Steve Kerr', 'Kyle Korver']),
  q('medium', 'Who is the youngest MVP in NBA history, winning in 2011 at age 22?', 'Derrick Rose', ['LeBron James', 'Kevin Durant', 'Tim Duncan']),
  q('medium', 'Who scored an NBA All-Star Game record 55 points in 2023?', 'Jayson Tatum', ['Giannis Antetokounmpo', 'Stephen Curry', 'Anthony Davis']),
  q('medium', 'Who scored 71 points in the last game of the 1993-94 season to pip Shaquille O’Neal to the scoring title?', 'David Robinson', ['Hakeem Olajuwon', 'Patrick Ewing', 'Karl Malone']),
];

const NBA_HARD: LocalQuestion[] = [
  q('hard', 'Which team won 27 straight games in 2012-13, the longest single-season streak since 1972?', 'Miami Heat', ['Golden State Warriors', 'San Antonio Spurs', 'Houston Rockets']),
  q('hard', 'Who scored 83 points in March 2026, the second-highest single-game total in NBA history?', 'Bam Adebayo', ['Luka Dončić', 'Joel Embiid', 'Devin Booker']),
  q('hard', 'Who recorded the first 60-point triple-double in NBA history, in January 2018?', 'James Harden', ['Russell Westbrook', 'Luka Dončić', 'Nikola Jokić']),
  q('hard', 'Who set the record for the highest-scoring triple-double ever, with 61 points in April 2025?', 'Nikola Jokić', ['James Harden', 'Luka Dončić', 'Russell Westbrook']),
  q('hard', 'Who holds the NBA Finals record of 9 three-pointers in a single game, set in 2018?', 'Stephen Curry', ['Klay Thompson', 'Ray Allen', 'Kyrie Irving']),
  q('hard', 'How many official quadruple-doubles have been recorded in all of NBA history?', 'Four', ['Two', 'Six', 'Nine']),
];

const NBA_MASTER: LocalQuestion[] = [
  q('master', 'Who is the NBA’s all-time leader in both assists and steals?', 'John Stockton', ['Magic Johnson', 'Jason Kidd', 'Chris Paul']),
  q('master', 'Who holds the NBA single-game assists record with 30?', 'Scott Skiles', ['John Stockton', 'Magic Johnson', 'Kevin Porter']),
  q('master', 'Who has produced the most 50-40-90 shooting seasons, with four?', 'Steve Nash', ['Larry Bird', 'Kevin Durant', 'Stephen Curry']),
  q('master', 'Who is the only person to win NBA MVP, Coach of the Year and Executive of the Year?', 'Larry Bird', ['Magic Johnson', 'Michael Jordan', 'Jerry West']),
];

const TENNIS_EASY: LocalQuestion[] = [
  q('easy', 'Who holds the men’s record for Grand Slam singles titles, with 24?', 'Novak Djokovic', ['Rafael Nadal', 'Roger Federer', 'Pete Sampras']),
  q('easy', 'How many French Open singles titles has Rafael Nadal won?', '14', ['10', '12', '17']),
  q('easy', 'Who has spent the most weeks ranked WTA world No. 1?', 'Steffi Graf', ['Serena Williams', 'Martina Navratilova', 'Martina Hingis']),
  q('easy', 'Who beat Novak Djokovic in the 2021 US Open final to stop his calendar Grand Slam bid?', 'Daniil Medvedev', ['Alexander Zverev', 'Dominic Thiem', 'Stefanos Tsitsipas']),
  q('easy', 'Who became the first British man to win Wimbledon since 1936, in 2013?', 'Andy Murray', ['Tim Henman', 'Greg Rusedski', 'Cameron Norrie']),
];

const TENNIS_MEDIUM: LocalQuestion[] = [
  q('medium', 'How many Grand Slam singles titles did Serena Williams win, an Open Era record?', '23', ['21', '22', '24']),
  q('medium', 'Who was the first qualifier, man or woman, to win a Grand Slam singles title?', 'Emma Raducanu', ['Jelena Ostapenko', 'Bianca Andreescu', 'Leylah Fernandez']),
  q('medium', 'How many Wimbledon men’s singles titles did Roger Federer win?', '8', ['6', '7', '9']),
  q('medium', 'Who is the only player to hold the ATP No. 1 ranking in three different decades?', 'Rafael Nadal', ['Roger Federer', 'Novak Djokovic', 'Andre Agassi']),
  q('medium', 'The most-played rivalry in tennis history is Djokovic vs Nadal, 60 matches. Who leads it?', 'Novak Djokovic', ['Rafael Nadal', 'They are perfectly level', 'Roger Federer']),
];

const TENNIS_HARD: LocalQuestion[] = [
  q('hard', 'The longest match in tennis history, over 11 hours at Wimbledon 2010, was won by whom?', 'John Isner', ['Nicolas Mahut', 'Marin Čilić', 'Kevin Anderson']),
  q('hard', 'Who is the only wildcard to win a Grand Slam singles title, triumphing at Wimbledon 2001 while ranked 125?', 'Goran Ivanišević', ['Patrick Rafter', 'Marat Safin', 'Richard Krajicek']),
  q('hard', 'Who is the youngest world No. 1 in ATP history, at 19 years and 4 months?', 'Carlos Alcaraz', ['Lleyton Hewitt', 'Marat Safin', 'Rafael Nadal']),
  q('hard', 'Who is the youngest world No. 1 in WTA history?', 'Martina Hingis', ['Monica Seles', 'Maria Sharapova', 'Tracy Austin']),
  q('hard', 'Who became the second player to complete the Career Golden Masters, sealing it in Rome in 2026?', 'Jannik Sinner', ['Carlos Alcaraz', 'Daniil Medvedev', 'Alexander Zverev']),
  q('hard', 'Who holds the ATP career record for aces?', 'John Isner', ['Ivo Karlović', 'Goran Ivanišević', 'Milos Raonic']),
];

const TENNIS_MASTER: LocalQuestion[] = [
  q('master', 'Who was the first player to complete the Career Golden Masters, winning all nine Masters 1000 titles?', 'Novak Djokovic', ['Roger Federer', 'Rafael Nadal', 'Andy Murray']),
  q('master', 'Who is the only men’s world No. 1 never to win a Grand Slam singles title?', 'Marcelo Ríos', ['Ivan Lendl', 'Andy Roddick', 'Carlos Moyá']),
  q('master', 'Who holds the record for consecutive Grand Slam semi-final appearances, reaching 23 straight?', 'Roger Federer', ['Novak Djokovic', 'Rafael Nadal', 'Ivan Lendl']),
  q('master', 'Who is the only tennis player to win the Golden Slam - all four majors and Olympic gold in the same year?', 'Steffi Graf', ['Serena Williams', 'Andre Agassi', 'Rafael Nadal']),
];

const OSCARS_EASY: LocalQuestion[] = [
  q('easy', 'Leonardo DiCaprio finally won his first Oscar for which film?', 'The Revenant', ['Titanic', 'The Wolf of Wall Street', 'The Aviator']),
  q('easy', 'Which film won all 11 Oscars it was nominated for, the biggest sweep in history?', 'The Lord of the Rings: The Return of the King', ['Titanic', 'Ben-Hur', 'The King’s Speech']),
  q('easy', 'Which film became the first non-English-language winner of the Best Picture Oscar?', 'Parasite', ['Roma', 'Amour', 'Crouching Tiger, Hidden Dragon']),
  q('easy', 'Which actress has won the most Oscars, with four?', 'Katharine Hepburn', ['Meryl Streep', 'Bette Davis', 'Ingrid Bergman']),
  q('easy', 'Who holds the record for the most Oscar acting nominations?', 'Meryl Streep', ['Jack Nicholson', 'Katharine Hepburn', 'Al Pacino']),
];

const OSCARS_MEDIUM: LocalQuestion[] = [
  q('medium', 'Which actor won back-to-back Best Actor Oscars for Philadelphia and Forrest Gump?', 'Tom Hanks', ['Tom Cruise', 'Denzel Washington', 'Kevin Costner']),
  q('medium', 'Who is the only man to win three Best Actor Oscars?', 'Daniel Day-Lewis', ['Jack Nicholson', 'Marlon Brando', 'Tom Hanks']),
  q('medium', 'Which film won the first Oscar for Best Animated Feature?', 'Shrek', ['Toy Story', 'Monsters, Inc.', 'Finding Nemo']),
  q('medium', 'For which film did Kathryn Bigelow become the first woman to win Best Director?', 'The Hurt Locker', ['Zero Dark Thirty', 'Nomadland', 'Point Break']),
  q('medium', 'Which film won Best Picture ahead of both Pulp Fiction and The Shawshank Redemption?', 'Forrest Gump', ['Speed', 'Quiz Show', 'Four Weddings and a Funeral']),
];

const OSCARS_HARD: LocalQuestion[] = [
  q('hard', 'Which is the only X-rated film ever to win Best Picture?', 'Midnight Cowboy', ['A Clockwork Orange', 'Last Tango in Paris', 'Taxi Driver']),
  q('hard', 'Who is the youngest Best Actor winner in Oscar history, at 29 for The Pianist?', 'Adrien Brody', ['Timothée Chalamet', 'Marlon Brando', 'Eddie Redmayne']),
  q('hard', 'Which country has won the most Oscars for Best International Feature Film?', 'Italy', ['France', 'Spain', 'Japan']),
  q('hard', 'Who is the only person to win Oscars for both acting and screenwriting?', 'Emma Thompson', ['Ben Affleck', 'Barbra Streisand', 'Billy Bob Thornton']),
  q('hard', 'How many Oscars did The Color Purple win from 11 nominations?', 'None', ['One', 'Two', 'Five']),
  q('hard', 'Which 2025 film set the record for the most Oscar nominations ever received, with 16?', 'Sinners', ['One Battle After Another', 'Hamnet', 'Bugonia']),
];

const OSCARS_MASTER: LocalQuestion[] = [
  q('master', 'Which film won Best Picture at the 2026 Oscars?', 'One Battle After Another', ['Sinners', 'Hamnet', 'Bugonia']),
  q('master', 'Who is the youngest winner of a competitive Oscar, aged 10 for Paper Moon?', 'Tatum O’Neal', ['Anna Paquin', 'Abigail Breslin', 'Shirley Temple']),
  q('master', 'Which director holds the record for the most Best Director wins, with four?', 'John Ford', ['Steven Spielberg', 'Frank Capra', 'William Wyler']),
  q('master', 'Hattie McDaniel became the first African American to win an Oscar, for which film?', 'Gone with the Wind', ['The Help', 'Driving Miss Daisy', 'Guess Who’s Coming to Dinner']),
];

export const STATS_QUESTIONS: Record<number, LocalQuestion[]> = {
  [STATS_CATEGORY_ID]: [...NBA_EASY, ...NBA_MEDIUM, ...NBA_HARD, ...NBA_MASTER, ...TENNIS_EASY, ...TENNIS_MEDIUM, ...TENNIS_HARD, ...TENNIS_MASTER, ...OSCARS_EASY, ...OSCARS_MEDIUM, ...OSCARS_HARD, ...OSCARS_MASTER],
};
