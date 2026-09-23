'use client';

import { useState } from 'react';
import { askChesterChat } from '@/app/actions';
import { chesterOfflineChat } from '@/lib/chester-voice';
import GlobalNav from '@/components/GlobalNav';
import BuildBadge from '@/components/BuildBadge';
import { ChesterChatOverlay, ChesterAvatar } from '@/components/ChesterUI';
import { useEngineEvaluation } from '@/components/EngineEvaluationProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const engineEvaluation = useEngineEvaluation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'chester'; text: string; education?: string; kind?: 'chat' | 'analysis' }[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || thinking) return;
    setInput('');
    setError('');
    setMessages((current) => [...current, { role: 'user', text: message }]);
    setThinking(true);
    try {
      const reply = await askChesterChat(JSON.stringify({ type: 'chat', message, engineTelemetry: engineEvaluation, conversationHistory: messages.slice(-6) }));
      const text = reply && !/messenger|delayed|unavailable/i.test(reply)
        ? reply
        : chesterOfflineChat(message, { persona: 'INTERMEDIATE', historyCount: messages.length });
      setMessages((current) => [...current, { role: 'chester', text, kind: 'chat' }]);
    } catch {
      setError('Chester is briefly off the board. Try again.');
    } finally {
      setThinking(false);
    }
  };
  return <div className="app-shell h-[100dvh] w-screen overflow-hidden flex flex-col">
    <GlobalNav />
    <BuildBadge />
    <main className="app-main flex-1 overflow-hidden">{children}</main>
    <button className="chester-fab" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="chester-drawer" aria-label="Open Chester chat"><ChesterAvatar isThinking={thinking} /></button>
    <aside id="chester-drawer" className={`chester-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <header><b>CHESTER CHAT</b><button onClick={() => setOpen(false)} aria-label="Close Chester chat">×</button></header>
      <ChesterChatOverlay chatMessages={messages} chatInput={input} setChatInput={setInput} onSendMessage={send} isThinking={thinking} chatError={error} />
    </aside>
  </div>;
}
