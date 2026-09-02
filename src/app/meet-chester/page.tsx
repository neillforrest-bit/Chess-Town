'use client';

import { useState } from 'react';
import { askChesterChat } from '@/app/actions';
import { ChesterAvatar } from '@/components/ChesterUI';

const intro = "I'm Chester, Chess Town's built-in chess guide. Pick a game, make your moves, and use this chat when you want a quick nudge.";

export default function MeetChesterPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([{ role: 'chester', text: intro }]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || isThinking) return;
    setMessage('');
    setError('');
    const conversationHistory = [...messages, { role: 'user' as const, text }].slice(-8);
    setMessages(conversationHistory);
    setIsThinking(true);
    try {
      const reply = await askChesterChat(JSON.stringify({
        type: 'chat',
        message: text,
        matchup: 'Chess Town guide chat',
        conversationHistory,
        instruction: 'Give a specific, useful chess answer tailored to the player question. When no board position is supplied, ask for the FEN or moves only when concrete analysis requires it; otherwise teach one actionable concept with a short example.',
      }));
      setMessages((current) => [...current, { role: 'chester', text: reply }].slice(-10));
    } catch {
      setError('Chester could not reach the analysis desk. Please try again.');
      setMessage(text);
    } finally {
      setIsThinking(false);
    }
  };

  return <main className="meet-chester-page">
    <header><ChesterAvatar isThinking={false} /><div><span>CHESS TOWN GUIDE</span><h1>MEET CHESTER</h1></div></header>
    <section className="meet-chester-chat" aria-label="Chester chat">
      <div className="meet-chester-messages">{messages.map((entry, index) => <p className={entry.role} key={`${entry.role}-${index}`}><b>{entry.role === 'chester' ? 'CHESTER' : 'YOU'}</b>{entry.text}</p>)}{isThinking && <p className="chester"><b>CHESTER</b>Calculating a useful answer...</p>}</div>
      <form onSubmit={sendMessage}>{error && <span className="meet-chester-error">{error}</span>}<input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask Chester about a position or plan..." aria-label="Message Chester" /><button type="submit" disabled={isThinking || !message.trim()}>SEND</button></form>
    </section>
  </main>;
}
