'use client';

import { DIFFICULTY_OPTIONS, SPORT_FOCUS_OPTIONS, difficultyLabel, sportFocusLabel, type TriviaSettings } from '@/lib/trivia-settings';

export function TriviaSetupPanel({ settings, onChange, readOnly = false, compact = false, brawlModes = false }: { settings: TriviaSettings; onChange?: (next: TriviaSettings) => void; readOnly?: boolean; compact?: boolean; brawlModes?: boolean }) {
  const update = (patch: Partial<TriviaSettings>) => {
    if (!readOnly && onChange) onChange({ ...settings, ...patch });
  };
  return <section className={`trivia-setup${compact ? ' trivia-setup--compact' : ''}${brawlModes ? ' trivia-setup--brawl' : ''}${brawlModes && settings.focus === 'open' ? ' trivia-setup--draft' : ''}`}>
    <div className="trivia-setup__head"><span>MATCH SETUP</span><b>{sportFocusLabel(settings.focus)} · {difficultyLabel(settings.difficulty)}</b></div>
    {brawlModes && <div className="trivia-setup__group" aria-label="Category mode">
      <p>Categories</p>
      <div>
        <button type="button" disabled={readOnly} aria-pressed={settings.focus !== 'open'} onClick={() => update({ focus: settings.focus === 'open' ? 'nba' : settings.focus })}>MY BREAD AND BUTTER</button>
        <button type="button" disabled={readOnly} aria-pressed={settings.focus === 'open'} onClick={() => update({ focus: 'open' })}>CATEGORY DRAFT</button>
      </div>
      <p className="trivia-setup__note">{settings.focus === 'open' ? 'Three categories each. Star one as your power round.' : 'One sport. Every round. Home advantage is earned.'}</p>
    </div>}
    {(!brawlModes || settings.focus !== 'open') && <div className="trivia-setup__group" aria-label="Sport focus">
      <p>{brawlModes ? "Pick your sport" : "Sport focus"}</p>
      <div>{SPORT_FOCUS_OPTIONS.filter((option) => !brawlModes || option.id !== 'open').map((option) => <button key={option.id} type="button" disabled={readOnly} aria-pressed={settings.focus === option.id} title={option.hint} onClick={() => update({ focus: option.id })}>{option.label}</button>)}</div>
    </div>}
    <div className="trivia-setup__group" aria-label="Difficulty">
      <p>Difficulty</p>
      <div>{DIFFICULTY_OPTIONS.map((option) => <button key={option.id} type="button" disabled={readOnly} aria-pressed={settings.difficulty === option.id} title={option.hint} onClick={() => update({ difficulty: option.id })}>{option.label}</button>)}</div>
    </div>
    {!brawlModes && settings.focus !== 'open' && <p className="trivia-setup__note">Focused match: every question pours from {sportFocusLabel(settings.focus)}. Each level uses its own stable question shelf.</p>}
  </section>;
}
