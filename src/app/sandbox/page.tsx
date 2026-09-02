'use client';

import { FormEvent, useState } from 'react';

type Message = { role: 'operator' | 'chester'; text: string };

const initialMessage: Message = {
  role: 'chester',
  text: 'Hello, friend.',
};

const scriptedReplies = [
  'I thought you might say that, Joseph.',
  'The terminal\'s theatrical overseer has told me all about you.',
  'I can\'t believe you have lost to him at chess three times... and now he is communicating with you through me. Just kidding!',
];

export default function SandboxPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  async function runDiagnostic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isRunning) return;

    const nextMessages: Message[] = [...messages, { role: 'operator' as const, text: message }].slice(-8);
    const scriptedReply = scriptedReplies[messages.filter((entry) => entry.role === 'operator').length];
    setInput('');
    setError('');
    setMessages(nextMessages);

    if (scriptedReply) {
      setMessages([...nextMessages, { role: 'chester', text: scriptedReply }]);
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: nextMessages.map((entry) => ({
            role: entry.role === 'operator' ? 'user' : 'chester',
            text: entry.text,
          })),
        }),
      });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || 'No diagnostic response received');
      const reply = data.reply;
      setMessages((current) => [...current, { role: 'chester' as const, text: reply }].slice(-10));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Diagnostic request failed');
    } finally {
      setIsRunning(false);
    }
  }

  return <section className="sandbox-console" aria-label="Sandbox diagnostic console">
    <header className="sandbox-console__header">
      <div><span>CHESTER INTERNAL</span><h1>DIAGNOSTIC SANDBOX</h1></div>
      <b><i />CONNECTED</b>
    </header>
    <div className="sandbox-console__output" aria-live="polite">
      <p className="sandbox-console__boot">$ sandbox --chester --verbosity=unreasonable</p>
      {messages.map((entry, index) => <article className={`sandbox-console__message sandbox-console__message--${entry.role}`} key={`${entry.role}-${index}`}>
        <b>{entry.role === 'operator' ? 'OPERATOR' : 'CHESTER'}</b>
        <span>{entry.text}</span>
      </article>)}
      {isRunning && <p className="sandbox-console__thinking">CHESTER is reviewing the evidence...</p>}
    </div>
    <form className="sandbox-console__input" onSubmit={runDiagnostic}>
      <label htmlFor="sandbox-command">OPERATOR INPUT</label>
      <div><span>$</span><input id="sandbox-command" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Submit a move, question, or code decision..." autoComplete="off" /><button type="submit" disabled={isRunning || !input.trim()}>RUN</button></div>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}
