'use client';

import { useState } from 'react';
import { ChesterAvatar } from '@/components/ChesterUI';

const intro = "I'm Chester, Chess Town's built-in chess guide. Pick a game, make your moves, and use this chat when you want a quick nudge.";

export default function MeetChesterPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([{ role: 'chester', text: intro }]);

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: 'user', text }, { role: 'chester', text: 'Try the Mini Game Challenges from the Arena, then tell me which position gave you the most trouble.' }]);
    setMessage('');
  };

  return <main className="meet-chester-page">
    <header><ChesterAvatar isThinking={false} /><div><span>CHESS TOWN GUIDE</span><h1>MEET CHESTER</h1></div></header>
    <section className="meet-chester-chat" aria-label="Chester chat">
      <div className="meet-chester-messages">{messages.map((entry, index) => <p className={entry.role} key={`${entry.role}-${index}`}><b>{entry.role === 'chester' ? 'CHESTER' : 'YOU'}</b>{entry.text}</p>)}</div>
      <form onSubmit={sendMessage}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask Chester about the beta..." aria-label="Message Chester" /><button type="submit">SEND</button></form>
    </section>
  </main>;
}
