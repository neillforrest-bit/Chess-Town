'use client';

import { DIFFICULTY_OPTIONS, SPORT_FOCUS_OPTIONS, difficultyLabel, sportFocusLabel, type TriviaSettings } from '@/lib/trivia-settings';

export function TriviaSetupPanel({ settings, onChange, readOnly = false, compact = false }: { settings: TriviaSettings; onChange?: (next: TriviaSettings) => void; readOnly?: boolean; compact?: boolean }) {
  const update = (patch: Partial<TriviaSettings>) => {
    if (!readOnly && onChange) onChange({ ...settings, ...patch });
  };
  return <section className={`trivia-setup${compact ? ' trivia-setup--compact' : ''}`}>
    <div className="trivia-setup__head"><span>MATCH SETUP</span><b>{sportFocusLabel(settings.focus)} · {difficultyLabel(settings.difficulty)}</b></div>
    <div className="trivia-setup__group" aria-label="Sport focus">
      <p>Sport focus</p>
      <div>{SPORT_FOCUS_OPTIONS.map((option) => <button key={option.id} type="button" disabled={readOnly} aria-pressed={settings.focus === option.id} title={option.hint} onClick={() => update({ focus: option.id })}>{option.label}</button>)}</div>
    </div>
    <div className="trivia-setup__group" aria-label="Difficulty">
      <p>Difficulty</p>
      <div>{DIFFICULTY_OPTIONS.map((option) => <button key={option.id} type="button" disabled={readOnly} aria-pressed={settings.difficulty === option.id} title={option.hint} onClick={() => update({ difficulty: option.id })}>{option.label}</button>)}</div>
    </div>
    {settings.focus !== 'open' && <p className="trivia-setup__note">Focused match: every question pours from {sportFocusLabel(settings.focus)}. Each level uses its own stable question shelf.</p>}
  </section>;
}
