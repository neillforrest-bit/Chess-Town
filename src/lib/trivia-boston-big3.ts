import type { LocalCategory, LocalQuestion } from './trivia-local';
import type { QuestionDifficulty } from './trivia-settings';

// BOSTON & BIG 3 shelf (20 Nov 2026, Forrest's ask): Celtics (NBA), Patriots (NFL)
// and the Nadal-Federer-Djokovic era, all facts from 2000 onwards. Same spirit as
// the stats-lab reissue: hard questions about well-known facts, no obscure year-
// or number-guessing. The bank is hard-heavy (27 hard of 36) so a full 25-question
// match on the HARD setting stays completely on this shelf. Every question is
// fact-checked against a cited source - see checks/trivia-stats-20261120/sources.md
// ("Boston & Big 3" section, one URL each).

const q = (level: QuestionDifficulty, question: string, correct: string, wrong: [string, string, string]): LocalQuestion => ({ level, question, correct, wrong });

export const BOSTON_BIG3_CATEGORY_ID = -17;
export const BOSTON_BIG3_CATEGORIES: LocalCategory[] = [
  { id: BOSTON_BIG3_CATEGORY_ID, name: '🍀 Celtics, Pats & Big 3' },
];

const CELTICS: LocalQuestion[] = [
  q('easy', 'Which team did the Celtics beat in the 2024 NBA Finals to win a record 18th championship?', 'Dallas Mavericks', ['Los Angeles Lakers', 'Denver Nuggets', 'Miami Heat']),
  q('medium', 'Who was named Finals MVP when the Celtics won the 2008 championship?', 'Paul Pierce', ['Kevin Garnett', 'Ray Allen', 'Rajon Rondo']),
  q('hard', 'Who won Finals MVP for the Celtics in 2024?', 'Jaylen Brown', ['Jayson Tatum', 'Jrue Holiday', 'Kristaps Porziņģis']),
  q('hard', 'The 2008 Celtics "Big Three" of Paul Pierce and Ray Allen was completed by a trade with Minnesota for which player?', 'Kevin Garnett', ['Pau Gasol', 'Rasheed Wallace', 'Al Jefferson']),
  q('hard', 'Which Celtic won Defensive Player of the Year in 2022, the first guard to win it since Gary Payton in 1996?', 'Marcus Smart', ['Jrue Holiday', 'Avery Bradley', 'Tony Allen']),
  q('hard', 'Which Celtic scored 60 points in 2021, leading a comeback from 32 points down against the Spurs?', 'Jayson Tatum', ['Jaylen Brown', 'Isaiah Thomas', 'Paul Pierce']),
  q('hard', 'Which rivals did the Celtics beat in the 2008 Finals to lift banner 17?', 'Los Angeles Lakers', ['Detroit Pistons', 'San Antonio Spurs', 'Cleveland Cavaliers']),
  q('hard', 'Which Celtic scored 53 points in a 2017 playoff game against the Wizards?', 'Isaiah Thomas', ['Jayson Tatum', 'Paul Pierce', 'Kemba Walker']),
  q('hard', 'Who was named the first-ever Eastern Conference Finals MVP, in 2022?', 'Jayson Tatum', ['Jaylen Brown', 'Marcus Smart', 'Al Horford']),
  q('hard', 'Which eighth seed knocked the Celtics out of the 2023 Eastern Conference Finals?', 'Miami Heat', ['New York Knicks', 'Philadelphia 76ers', 'Milwaukee Bucks']),
  q('hard', 'Drafted fifth overall by Boston in 2007, which player was traded to Seattle in the deal that brought Ray Allen to the Celtics?', 'Jeff Green', ['Al Jefferson', 'Delonte West', 'Ryan Gomes']),
  q('master', 'Who coached the Celtics to the 2024 title at age 35, the youngest championship head coach since Bill Russell?', 'Joe Mazzulla', ['Brad Stevens', 'Ime Udoka', 'Doc Rivers']),
];

const PATRIOTS: LocalQuestion[] = [
  q('easy', 'Which team blew a 28-3 lead to the Patriots in Super Bowl LI?', 'Atlanta Falcons', ['Seattle Seahawks', 'Philadelphia Eagles', 'Los Angeles Rams']),
  q('medium', 'Who made the famous goal-line interception that won Super Bowl XLIX for the Patriots?', 'Malcolm Butler', ['Darrelle Revis', 'Devin McCourty', 'Brandon Browner']),
  q('hard', 'Which Giants receiver beat the Patriots in Super Bowl XLII with the famous "helmet catch"?', 'David Tyree', ['Plaxico Burress', 'Mario Manningham', 'Hakeem Nicks']),
  q('hard', 'Who was Super Bowl MVP when the Patriots beat the Rams in Super Bowl LIII?', 'Julian Edelman', ['Tom Brady', 'Rob Gronkowski', 'Stephon Gilmore']),
  q('hard', 'Which Patriot running back scored the overtime touchdown that won Super Bowl LI?', 'James White', ['Julian Edelman', 'Danny Amendola', 'LeGarrette Blount']),
  q('hard', 'Tom Brady was famously picked 199th overall in 2000 - in which round?', 'The sixth round', ['The fourth round', 'The second round', 'He went undrafted']),
  q('hard', 'The famous "Tuck Rule" playoff game in January 2002 was played against which team?', 'Oakland Raiders', ['New York Jets', 'Pittsburgh Steelers', 'Miami Dolphins']),
  q('hard', 'Which kicker won Super Bowls XXXVI and XXXVIII for the Patriots with last-second field goals?', 'Adam Vinatieri', ['Stephen Gostkowski', 'Jason Elam', 'Matt Stover']),
  q('hard', 'Which Patriots receiver set the NFL single-season record for touchdown catches in the 16-0 season of 2007?', 'Randy Moss', ['Wes Welker', 'Rob Gronkowski', 'Troy Brown']),
  q('hard', 'The Patriots won their first Super Bowl as huge underdogs against which "Greatest Show on Turf" team?', 'St. Louis Rams', ['Oakland Raiders', 'Pittsburgh Steelers', 'Philadelphia Eagles']),
  q('hard', 'Which Patriot cornerback won Defensive Player of the Year in 2019?', 'Stephon Gilmore', ['Devin McCourty', "Dont'a Hightower", 'Chandler Jones']),
  q('master', 'Bill Belichick resigned as head coach of which team after just one day in January 2000 to take over the Patriots?', 'New York Jets', ['New York Giants', 'Cleveland Browns', 'Miami Dolphins']),
];

const BIG3_TENNIS: LocalQuestion[] = [
  q('easy', 'Which member of the Big Three has won the most Australian Open titles, with a record ten?', 'Novak Djokovic', ['Roger Federer', 'Rafael Nadal', 'Pete Sampras']),
  q('medium', 'Who won the 2008 Wimbledon final against Federer, often called the greatest match ever played?', 'Rafael Nadal', ['Novak Djokovic', 'Andy Roddick', 'Andy Murray']),
  q('hard', 'Who won the longest Grand Slam final ever played, the 5-hour-53-minute 2012 Australian Open final?', 'Novak Djokovic', ['Rafael Nadal', 'Roger Federer', 'Andy Murray']),
  q('hard', 'Which of the Big Three finally won Olympic singles gold at Paris 2024?', 'Novak Djokovic', ['Rafael Nadal', 'Roger Federer', 'Andy Murray']),
  q('hard', 'Who held two championship points on serve in the 2019 Wimbledon final, but lost?', 'Roger Federer', ['Novak Djokovic', 'Rafael Nadal', 'Kevin Anderson']),
  q('hard', "Who inflicted Rafael Nadal's first-ever defeat at the French Open, in 2009?", 'Robin Söderling', ['Novak Djokovic', 'Roger Federer', 'David Ferrer']),
  q('hard', 'Whose 2009 French Open title completed his career Grand Slam?', 'Roger Federer', ['Rafael Nadal', 'Novak Djokovic', 'Andy Murray']),
  q('hard', 'Who won five consecutive Wimbledon titles, from 2003 to 2007?', 'Roger Federer', ['Pete Sampras', 'Novak Djokovic', 'Björn Borg']),
  q('hard', 'Who beat Nadal in five sets to win the 2017 Australian Open, his first major in nearly five years?', 'Roger Federer', ['Novak Djokovic', 'Stan Wawrinka', 'Juan Martín del Potro']),
  q('hard', 'Who is the only player to beat Rafael Nadal twice at the French Open?', 'Novak Djokovic', ['Robin Söderling', 'Roger Federer', 'Alexander Zverev']),
  q('hard', 'Whose final professional match was a doubles alongside Nadal at the 2022 Laver Cup?', 'Roger Federer', ['Andy Murray', 'Stan Wawrinka', 'Jo-Wilfried Tsonga']),
  q('master', 'Whom did Nadal beat in the 2005 French Open final, the first of his 14 titles there?', 'Mariano Puerta', ['Roger Federer', 'Guillermo Coria', 'Carlos Moyá']),
];

export const BOSTON_BIG3_QUESTIONS: Record<number, LocalQuestion[]> = {
  [BOSTON_BIG3_CATEGORY_ID]: [...CELTICS, ...PATRIOTS, ...BIG3_TENNIS],
};
