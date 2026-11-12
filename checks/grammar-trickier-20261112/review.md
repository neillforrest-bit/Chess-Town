# Grammar difficulty and timer preview, 12 November 2026

Preview only. Production remains commit 927ca6b. User asked at 02:45 to slow the timer by five seconds and make the questions trickier. The owner-facing interpretation is Grammar main questions 10 -> 15 seconds, other topics and mixed flashes unchanged. Production needs a fresh yes after preview.

## Bank and level review

All 896 rows rewritten. Exactly 224 per level, made from 28 reviewed templates per level and eight named contexts each: 112 templates total, not 896 independent rules. This replaces the earlier 128 seeds plus 768 simpler variants. All content is embedded, no question generation service. Names and objects do not determine the answer. Every row has four distinct options and one intended answer.

Easy: fuller sentence completions rather than identifying a noun in isolation; agreement across intervening phrases, do-support, past participles, pronouns, sound-based articles, quantifiers, comparatives, modals, infinitives/gerunds, prepositions, time and relative clauses. Medium: embedded questions, tense cues, verb/preposition patterns, passive and causative forms, preferences, accustomed-to versus past habit, conditional forms and polarity tags. Hard: meaning contrasts for remember/stop/try/go on/regret, time sequence, mixed conditionals, past wishes, formal subjunctive, relative attachment, inversion, passive make, participle attachment and scope ambiguity. Master: information focus, subject/object control, perfect passive infinitives, inverted and mixed conditions, inversion domains, participial form, causative meaning, inference, and object/complement distinctions.

Review exclusions: no collective-noun agreement disputes, regional past-participle variants, restrictive which-versus-that prescription, optional commas as sole answer, split-infinitive taboos, or stylistic choices presented as errors. Mandative subjunctive and formal pronoun prompts specify the requested form. Time and meaning cues disambiguate otherwise possible tense readings. Where scope really is ambiguous, the ambiguity is the correct answer instead of arbitrarily picking one reading. The reason conjunction prompt explicitly asks for a reason so although is not an alternative answer. Prompts using singular they do not require assigning gender to a name.

Grammar draws prefer unused template families as well as unused exact wording within a standard match. There are 28 families per level for at most 25 questions; roulette replaces one. Very long sudden death can revisit a family once families run out, while still avoiding exact repeats until the shelf is exhausted.

## Sources checked

- Inversion and negative fronting: https://dictionary.cambridge.org/grammar/british-grammar/inversion
- Remember meaning contrast: https://dictionary.cambridge.org/grammar/british-grammar/remember
- Stop meaning contrast: https://dictionary.cambridge.org/grammar/british-grammar/stop-ing-form-or-to-infinitive
- Preferences: https://dictionary.cambridge.org/grammar/british-grammar/would-rather and https://dictionary.cambridge.org/grammar/british-grammar/prefer
- Habit/accustomed contrast: https://dictionary.cambridge.org/grammar/british-grammar/used-to
- Tags and auxiliary polarity: https://dictionary.cambridge.org/grammar/british-grammar/question-tags
- Cleft focus, indirect objects: https://dictionary.cambridge.org/grammar/british-grammar/word-order-structures
- Causative repair: https://dictionary.cambridge.org/grammar/british-grammar/have-something-done
- Participle form/attachment: https://learnenglish.britishcouncil.org/free-resources/grammar/c1/participle-clauses
- Third/mixed conditions: https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/conditionals-third-mixed
- Promise/persuade controller distinction: https://www.english-linguistics.de/grammarparadise/wiki/index.php/Practical_Grammar_10

## Timer and regression checks

- Main Grammar category: 15 seconds in solo, pass-and-play, remote Brawl and Party Table. Other main topics: 10. Mixed roulette and flash/duel clocks unchanged. UI bar scales to its real duration, low-time state remains final five seconds.
- Room host deadline and answer/timeout queue share the same 15-second rule; snapshots expose remaining time, so reconnecting does not grant a new clock.
- Fresh compilation: 500 full 5x5 question loads / 2500 rounds, four unique choices, level balance, no exact repeats or mixed fallback. Additional 400 fixed-level loads checked all 25 rule-family IDs unique.
- Host-deadline and party unit checks passed Grammar 15 and NBA 10, before-deadline versus at-deadline expiry.
- UI timer checks passed Grammar 15 and NBA 10 in both solo and pass-and-play; questions still answerable with four seconds left and no longer answerable after expiry.
- Full five-round UI match passed 24 unique Grammar questions plus roulette, five flash finales, five summaries, scoring and finish.
- All 896 text/answer combinations measured on the real question surface at 320x568 and 390x844; no answer below viewport or main surface overflow. Worst layouts rendered and inspected. This is text-layout stress testing, not 896 separately played matches.
- No paid model, commentary, image, builder or relay purchase. Commentary intercepted in browser tests. Free hosting build use only; no attributable account-wide currency delta available.
