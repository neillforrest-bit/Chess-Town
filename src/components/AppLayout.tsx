'use client';

import { useState } from 'react';
import { askGrandmaster } from '@/app/actions';
import GlobalNav from '@/components/GlobalNav';
import { ChesterChatOverlay, ChesterAvatar } from '@/components/ChesterUI';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'chester'; text: string }[]>([]);
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
      const reply = await askGrandmaster(JSON.stringify({ type: 'chat', message, conversationHistory: messages.slice(-6) }));
      setMessages((current) => [...current, { role: 'chester', text: reply }]);
    } catch {
      setError('Chester is briefly off the board. Try again.');
    } finally {
      setThinking(false);
    }
  };
  return <>
    <GlobalNav />
    <main className="app-main">{children}</main>
    <button className="chester-fab" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="chester-drawer" aria-label="Open Chester chat"><ChesterAvatar isThinking={thinking} /></button>
    <aside id="chester-drawer" className={`chester-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <header><b>CHESTER CHAT</b><button onClick={() => setOpen(false)} aria-label="Close Chester chat">×</button></header>
      <ChesterChatOverlay chatMessages={messages} chatInput={input} setChatInput={setInput} onSendMessage={send} isThinking={thinking} chatError={error} />
    </aside>
  </>;
}
