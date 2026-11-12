// Offline original English grammar shelf. Standard written English; formal usage is labelled.
// Rule references and audit notes: checks/grammar-20261112/content-review.md
import type { LocalQuestion } from './trivia-local';

export const GRAMMAR_CATEGORY_ID = -14;
export const GRAMMAR_CATEGORIES = [{ id: GRAMMAR_CATEGORY_ID, name: 'Grammar' }];
export const GRAMMAR_QUESTIONS: Record<number, LocalQuestion[]> = {
  [GRAMMAR_CATEGORY_ID]: [
  {
    "question": "Which word is a noun in \"The dog barked\"?",
    "correct": "dog",
    "wrong": [
      "The",
      "barked",
      "None of them"
    ],
    "level": "easy"
  },
  {
    "question": "Which word is the verb in \"Birds sing\"?",
    "correct": "sing",
    "wrong": [
      "Birds",
      "Both words",
      "Neither word"
    ],
    "level": "easy"
  },
  {
    "question": "Which word is an adjective in \"a green door\"?",
    "correct": "green",
    "wrong": [
      "door",
      "a",
      "None of them"
    ],
    "level": "easy"
  },
  {
    "question": "Which pronoun can replace \"Sarah\" in \"Sarah is here\"?",
    "correct": "She",
    "wrong": [
      "We",
      "They are",
      "Him"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"I ___ happy.\"",
    "correct": "am",
    "wrong": [
      "is",
      "are",
      "be"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"She ___ a bicycle.\"",
    "correct": "has",
    "wrong": [
      "have",
      "having",
      "haves"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"They ___ ready.\"",
    "correct": "are",
    "wrong": [
      "is",
      "am",
      "be"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"He ___ football every Sunday.\"",
    "correct": "plays",
    "wrong": [
      "play",
      "playing",
      "is play"
    ],
    "level": "easy"
  },
  {
    "question": "What is the plural of \"child\"?",
    "correct": "children",
    "wrong": [
      "childs",
      "childes",
      "childrens"
    ],
    "level": "easy"
  },
  {
    "question": "What is the plural of \"mouse\" (the animal)?",
    "correct": "mice",
    "wrong": [
      "mouses",
      "mouse's",
      "mices"
    ],
    "level": "easy"
  },
  {
    "question": "What is the past tense of \"go\"?",
    "correct": "went",
    "wrong": [
      "goed",
      "gone",
      "going"
    ],
    "level": "easy"
  },
  {
    "question": "What is the past tense of \"eat\"?",
    "correct": "ate",
    "wrong": [
      "eated",
      "eaten",
      "eating"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"I saw ___ elephant.\"",
    "correct": "an",
    "wrong": [
      "a",
      "many",
      "those"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"She bought ___ book.\"",
    "correct": "a",
    "wrong": [
      "an",
      "these",
      "those"
    ],
    "level": "easy"
  },
  {
    "question": "Which contraction means \"do not\"?",
    "correct": "don't",
    "wrong": [
      "doesn't",
      "didn't",
      "isn't"
    ],
    "level": "easy"
  },
  {
    "question": "Which contraction means \"I am\"?",
    "correct": "I'm",
    "wrong": [
      "I've",
      "I'll",
      "I'd"
    ],
    "level": "easy"
  },
  {
    "question": "Which word joins the two items in \"tea and toast\"?",
    "correct": "and",
    "wrong": [
      "tea",
      "toast",
      "None of them"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"The cat is ___ the box.\" (inside)",
    "correct": "in",
    "wrong": [
      "to",
      "from",
      "of"
    ],
    "level": "easy"
  },
  {
    "question": "Which is a complete question?",
    "correct": "Where is my coat?",
    "wrong": [
      "Where my coat.",
      "Where coat my?",
      "My coat where is."
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"___ are my shoes over there.\"",
    "correct": "Those",
    "wrong": [
      "This",
      "That",
      "It"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"This is ___ apple.\"",
    "correct": "my",
    "wrong": [
      "me",
      "I",
      "mine's"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"Please give the book to ___.\" (the speaker)",
    "correct": "me",
    "wrong": [
      "I",
      "my",
      "mine"
    ],
    "level": "easy"
  },
  {
    "question": "Which word is an adverb in \"She smiled happily\"?",
    "correct": "happily",
    "wrong": [
      "She",
      "smiled",
      "None of them"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"One cat, two ___.\"",
    "correct": "cats",
    "wrong": [
      "cat's",
      "cats'",
      "cates"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"Yesterday, we ___ to school.\"",
    "correct": "walked",
    "wrong": [
      "walk",
      "walking",
      "walks"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"Look! The baby is ___.\"",
    "correct": "sleeping",
    "wrong": [
      "sleep",
      "sleeps",
      "slept"
    ],
    "level": "easy"
  },
  {
    "question": "Which word makes \"She likes milk\" negative?",
    "correct": "doesn't: She doesn't like milk",
    "wrong": [
      "don't: She don't like milk",
      "not: She not likes milk",
      "no: She no like milk"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"Tom is taller ___ Ben.\"",
    "correct": "than",
    "wrong": [
      "then",
      "that",
      "as"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"There ___ two cups on the table.\"",
    "correct": "are",
    "wrong": [
      "is",
      "am",
      "be"
    ],
    "level": "easy"
  },
  {
    "question": "Which word is the opposite comparative of \"more\"?",
    "correct": "less",
    "wrong": [
      "least",
      "little",
      "fewest"
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"We ___ watching a film now.\"",
    "correct": "are",
    "wrong": [
      "is",
      "am",
      "be"
    ],
    "level": "easy"
  },
  {
    "question": "Which sentence gives a command?",
    "correct": "Close the door.",
    "wrong": [
      "The door is closed.",
      "Is the door closed?",
      "The door was blue."
    ],
    "level": "easy"
  },
  {
    "question": "Complete: \"She has ___ her keys.\"",
    "correct": "lost",
    "wrong": [
      "lose",
      "losing",
      "losed"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"They have ___ home.\"",
    "correct": "gone",
    "wrong": [
      "went",
      "going",
      "goes"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"I have lived here ___ 2020.\"",
    "correct": "since",
    "wrong": [
      "for",
      "during",
      "until"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"We waited ___ two hours.\"",
    "correct": "for",
    "wrong": [
      "since",
      "at",
      "by"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"There isn't ___ milk left.\"",
    "correct": "much",
    "wrong": [
      "many",
      "a few",
      "several"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"How ___ apples do we need?\"",
    "correct": "many",
    "wrong": [
      "much",
      "little",
      "a little"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"Everyone ___ a ticket.\"",
    "correct": "needs",
    "wrong": [
      "need",
      "needing",
      "are need"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"Each of the boxes ___ a label.\"",
    "correct": "has",
    "wrong": [
      "have",
      "having",
      "were"
    ],
    "level": "medium"
  },
  {
    "question": "Which is the possessive of one girl: \"the ___ coat\"?",
    "correct": "girl's",
    "wrong": [
      "girls'",
      "girls",
      "girls's"
    ],
    "level": "medium"
  },
  {
    "question": "Which is the possessive of several boys: \"the ___ bags\"?",
    "correct": "boys'",
    "wrong": [
      "boy's",
      "boys",
      "boys's"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"The dog wagged ___ tail.\"",
    "correct": "its",
    "wrong": [
      "it's",
      "its'",
      "it"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"___ going to rain.\"",
    "correct": "It's",
    "wrong": [
      "Its",
      "Its'",
      "It"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"That's the person ___ helped me.\"",
    "correct": "who",
    "wrong": [
      "which",
      "where",
      "when"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"This is the house ___ I grew up.\"",
    "correct": "where",
    "wrong": [
      "who",
      "whose",
      "when"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"I enjoy ___ in the sea.\"",
    "correct": "swimming",
    "wrong": [
      "swim",
      "to swimming",
      "swam"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"She decided ___ home.\"",
    "correct": "to walk",
    "wrong": [
      "walking",
      "walked",
      "walks"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"You ___ smoke here; it is forbidden.\"",
    "correct": "must not",
    "wrong": [
      "don't have to",
      "might not",
      "need not"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"If it rains tomorrow, we ___ indoors.\"",
    "correct": "will stay",
    "wrong": [
      "would stayed",
      "had stayed",
      "staying"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"If I had more time, I ___ a language.\"",
    "correct": "would learn",
    "wrong": [
      "will learning",
      "have learned",
      "would learned"
    ],
    "level": "medium"
  },
  {
    "question": "Which sentence is passive?",
    "correct": "The cake was eaten by Jo.",
    "wrong": [
      "Jo ate the cake.",
      "Jo is eating the cake.",
      "Jo eats cake."
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"The letter ___ yesterday.\" (passive)",
    "correct": "was posted",
    "wrong": [
      "posted",
      "has posting",
      "is post"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"I was cooking when the phone ___.\"",
    "correct": "rang",
    "wrong": [
      "ring",
      "rung",
      "ringing"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"You can swim, ___ you?\"",
    "correct": "can't",
    "wrong": [
      "don't",
      "aren't",
      "isn't"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"She isn't late, ___ she?\"",
    "correct": "is",
    "wrong": [
      "isn't",
      "does",
      "doesn't"
    ],
    "level": "medium"
  },
  {
    "question": "Which is a superlative adjective?",
    "correct": "smallest",
    "wrong": [
      "smaller",
      "small",
      "smallly"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"This puzzle is ___ than that one.\"",
    "correct": "easier",
    "wrong": [
      "easiest",
      "easy",
      "more easier"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"I don't know ___ he lives.\"",
    "correct": "where",
    "wrong": [
      "who",
      "whose",
      "which"
    ],
    "level": "medium"
  },
  {
    "question": "Which word is the subject in \"The children laughed\"?",
    "correct": "children",
    "wrong": [
      "laughed",
      "The",
      "None of them"
    ],
    "level": "medium"
  },
  {
    "question": "Which word is the direct object in \"Mia kicked the ball\"?",
    "correct": "ball",
    "wrong": [
      "Mia",
      "kicked",
      "the"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"Neither answer ___ correct.\"",
    "correct": "is",
    "wrong": [
      "are",
      "were",
      "be"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"We arrived ___ Monday.\"",
    "correct": "on",
    "wrong": [
      "in",
      "at",
      "to"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"She speaks English ___.\"",
    "correct": "fluently",
    "wrong": [
      "fluent",
      "fluency",
      "more fluentness"
    ],
    "level": "medium"
  },
  {
    "question": "Complete: \"By the time I arrived, they ___ already left.\"",
    "correct": "had",
    "wrong": [
      "have",
      "were",
      "did"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"If I had known, I ___ helped.\"",
    "correct": "would have",
    "wrong": [
      "will",
      "would had",
      "have would"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"I wish I ___ taller.\" (formal unreal present)",
    "correct": "were",
    "wrong": [
      "am",
      "will be",
      "have been"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"She insisted that he ___ present.\" (mandative subjunctive)",
    "correct": "be",
    "wrong": [
      "is",
      "was",
      "being"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"Neither the teacher nor the pupils ___ ready.\"",
    "correct": "are",
    "wrong": [
      "is",
      "am",
      "be"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"The list of names ___ on the desk.\"",
    "correct": "is",
    "wrong": [
      "are",
      "were",
      "be"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"The news ___ surprising.\"",
    "correct": "is",
    "wrong": [
      "are",
      "were",
      "have been"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"There are ___ people here than yesterday.\"",
    "correct": "fewer",
    "wrong": [
      "less",
      "little",
      "least"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"There is ___ water in this glass.\"",
    "correct": "less",
    "wrong": [
      "fewer",
      "fewest",
      "many"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"The woman ___ car broke down called us.\"",
    "correct": "whose",
    "wrong": [
      "who's",
      "whom",
      "which"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"To ___ should I address the letter?\" (formal)",
    "correct": "whom",
    "wrong": [
      "who",
      "whose",
      "which"
    ],
    "level": "hard"
  },
  {
    "question": "Which clause adds non-essential information?",
    "correct": "My uncle, who lives in York, is visiting.",
    "wrong": [
      "The uncle who lives in York is visiting.",
      "The uncle that lives in York is visiting.",
      "The uncle living in York is visiting."
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"She apologised for ___ late.\"",
    "correct": "being",
    "wrong": [
      "be",
      "to be",
      "been"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"He denied ___ the window.\"",
    "correct": "breaking",
    "wrong": [
      "to break",
      "break",
      "broke"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"I look forward to ___ you.\"",
    "correct": "meeting",
    "wrong": [
      "meet",
      "met",
      "have met"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"She made me ___ the letter again.\"",
    "correct": "read",
    "wrong": [
      "to read",
      "reading",
      "reads"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"I had my car ___.\" (someone repaired it)",
    "correct": "repaired",
    "wrong": [
      "repair",
      "repairing",
      "to repair"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"He asked where I ___.\" (backshift of \"Where do you live?\")",
    "correct": "lived",
    "wrong": [
      "did live?",
      "am live",
      "living"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"I would rather you ___ now.\"",
    "correct": "left",
    "wrong": [
      "had left",
      "leaving",
      "will leave"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"It is time we ___ home.\"",
    "correct": "went",
    "wrong": [
      "going",
      "will go",
      "goes"
    ],
    "level": "hard"
  },
  {
    "question": "Which sentence keeps the list parallel?",
    "correct": "She likes reading, swimming and cycling.",
    "wrong": [
      "She likes reading, to swim and cycling.",
      "She likes to read, swimming and cycling.",
      "She likes reading, swim and to cycle."
    ],
    "level": "hard"
  },
  {
    "question": "Which sentence avoids a dangling modifier?",
    "correct": "Walking home, I saw the moon.",
    "wrong": [
      "Walking home, the moon appeared to me.",
      "Walking home, the street was dark.",
      "Walking home, my bag was heavy."
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"___ tired, she finished the race.\"",
    "correct": "Although she was",
    "wrong": [
      "Despite she was",
      "In spite she was",
      "Even she was"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"Despite ___ tired, she finished.\"",
    "correct": "being",
    "wrong": [
      "she was",
      "was",
      "be"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"Not only ___ late, but he also forgot his notes.\"",
    "correct": "was he",
    "wrong": [
      "he was",
      "he is was",
      "did he was"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"Never ___ seen such a storm.\"",
    "correct": "have I",
    "wrong": [
      "I have",
      "I have had",
      "did I have"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"She suggested ___ earlier.\"",
    "correct": "leaving",
    "wrong": [
      "to leave",
      "leave to",
      "left"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"You ___ have told me; now it's too late.\"",
    "correct": "should",
    "wrong": [
      "must to",
      "ought",
      "would of"
    ],
    "level": "hard"
  },
  {
    "question": "Which phrase contains a past participle used as an adjective?",
    "correct": "a broken window",
    "wrong": [
      "a window breaks",
      "a window broke",
      "a window is breaking"
    ],
    "level": "hard"
  },
  {
    "question": "Which sentence uses the present perfect continuous?",
    "correct": "I have been waiting.",
    "wrong": [
      "I had waited.",
      "I am waiting.",
      "I waited."
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"The book, ___ I borrowed yesterday, is excellent.\"",
    "correct": "which",
    "wrong": [
      "that",
      "what",
      "whose"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"She is used to ___ early.\"",
    "correct": "getting up",
    "wrong": [
      "get up",
      "got up",
      "have got up"
    ],
    "level": "hard"
  },
  {
    "question": "Complete: \"Had I known, I ___ stayed.\"",
    "correct": "would have",
    "wrong": [
      "will",
      "would had",
      "had"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"Were he to ask, I ___ agree.\"",
    "correct": "would",
    "wrong": [
      "will",
      "had",
      "am"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"Should you need help, ___ me.\"",
    "correct": "call",
    "wrong": [
      "calls",
      "calling",
      "to call"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"No sooner had we sat down ___ the bell rang.\"",
    "correct": "than",
    "wrong": [
      "when",
      "then",
      "that"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"Hardly had she arrived ___ it started to rain.\"",
    "correct": "when",
    "wrong": [
      "than",
      "then",
      "that"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"Only after the call ___ the problem.\"",
    "correct": "did I understand",
    "wrong": [
      "I had understand",
      "I understood",
      "did I understood"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"Not until dawn ___ asleep.\"",
    "correct": "did he fall",
    "wrong": [
      "he had fell",
      "did he fell",
      "he fell"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"Seldom ___ such patience.\"",
    "correct": "does one see",
    "wrong": [
      "one sees",
      "does one sees",
      "one had seen"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"I wish I ___ that yesterday.\"",
    "correct": "hadn't said",
    "wrong": [
      "haven't say",
      "wouldn't said",
      "didn't saying"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"If she had taken the job, she ___ living here now.\"",
    "correct": "would be",
    "wrong": [
      "will",
      "had been",
      "would have been yesterday"
    ],
    "level": "master"
  },
  {
    "question": "What is elided in \"Maya can swim, and Leo can too\"?",
    "correct": "swim after the second can",
    "wrong": [
      "Maya before can",
      "Leo after and",
      "too after can"
    ],
    "level": "master"
  },
  {
    "question": "In \"What I need is sleep\", what construction is used?",
    "correct": "A wh-cleft",
    "wrong": [
      "A passive clause",
      "An imperative",
      "A question tag"
    ],
    "level": "master"
  },
  {
    "question": "In \"It was Jo who called\", what construction is used?",
    "correct": "An it-cleft",
    "wrong": [
      "A conditional",
      "A passive voice",
      "A reported question"
    ],
    "level": "master"
  },
  {
    "question": "In \"That she won surprised me\", what is the subject?",
    "correct": "That she won",
    "wrong": [
      "she alone",
      "surprised",
      "me"
    ],
    "level": "master"
  },
  {
    "question": "In \"I know that she left\", what introduces the content clause?",
    "correct": "that",
    "wrong": [
      "I",
      "know",
      "left"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"He left early, ___ surprised everyone.\" (refers to the whole event)",
    "correct": "which",
    "wrong": [
      "that",
      "what",
      "whose"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"The report is believed ___ inaccurate.\"",
    "correct": "to be",
    "wrong": [
      "being",
      "be",
      "that be"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"She is thought ___ the country last week.\"",
    "correct": "to have left",
    "wrong": [
      "to leave",
      "to have leave",
      "leave"
    ],
    "level": "master"
  },
  {
    "question": "Politely announcing bad news now: \"I regret ___ you that the event is cancelled.\"",
    "correct": "to inform",
    "wrong": [
      "inform",
      "informed",
      "informing"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"I regret ___ so rudely yesterday.\"",
    "correct": "speaking",
    "wrong": [
      "to speak",
      "speak",
      "spoken"
    ],
    "level": "master"
  },
  {
    "question": "For the purpose of resting: 'He stopped ___ a rest.'",
    "correct": "to have",
    "wrong": [
      "having",
      "have",
      "had"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"I remember ___ her at last year's party.\"",
    "correct": "meeting",
    "wrong": [
      "to meeting",
      "meet",
      "to meet"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"You needn't have come\" means what?",
    "correct": "You came, but it was unnecessary.",
    "wrong": [
      "You did not come.",
      "You were forbidden to come.",
      "You must come tomorrow."
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"He must have forgotten\" expresses what?",
    "correct": "A strong inference about the past",
    "wrong": [
      "A past permission",
      "A future obligation",
      "A present command"
    ],
    "level": "master"
  },
  {
    "question": "In \"The door opened\", how is \"opened\" used?",
    "correct": "Intransitively",
    "wrong": [
      "As a direct object",
      "As an auxiliary",
      "As a preposition"
    ],
    "level": "master"
  },
  {
    "question": "In \"Jo gave Kim a book\", what is \"Kim\"?",
    "correct": "The indirect object",
    "wrong": [
      "The subject",
      "The direct object",
      "The main verb"
    ],
    "level": "master"
  },
  {
    "question": "In \"They elected Sam captain\", what is \"captain\"?",
    "correct": "An object complement",
    "wrong": [
      "An indirect object",
      "The subject",
      "An auxiliary verb"
    ],
    "level": "master"
  },
  {
    "question": "In \"The soup tastes salty\", what is \"salty\"?",
    "correct": "A subject complement",
    "wrong": [
      "A direct object",
      "An indirect object",
      "A conjunction"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"I demand that the decision ___ reversed.\" (subjunctive passive)",
    "correct": "be",
    "wrong": [
      "is",
      "was",
      "being"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"So difficult ___ that nobody finished.\"",
    "correct": "was the test",
    "wrong": [
      "the test was",
      "did the test was",
      "the test had"
    ],
    "level": "master"
  },
  {
    "question": "Complete: \"Such ___ that we stayed inside.\"",
    "correct": "was the heat",
    "wrong": [
      "the heat was",
      "did the heat was",
      "the heat had"
    ],
    "level": "master"
  },
  {
    "question": "In \"Having finished dinner, Jo washed up\", which happened first?",
    "correct": "Jo finished dinner.",
    "wrong": [
      "Jo washed up.",
      "Both necessarily happened together.",
      "The sentence gives no sequence."
    ],
    "level": "master"
  }
]
};
