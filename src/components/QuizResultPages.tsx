'use client';
import { Children, useState } from 'react';
export function QuizResultPages({ children, resetKey }: { children: React.ReactNode; resetKey: string }) {
  const items = Children.toArray(children), size = 2, pages = Math.ceil(items.length / size);
  const [cursor, setCursor] = useState({ key: resetKey, page: 0 });
  const page = cursor.key === resetKey ? cursor.page : 0;
  return <div className="quiz-result-pages"><div className="trivia-party-results">{items.slice(page * size, (page + 1) * size)}</div>{pages > 1 && <nav aria-label="Player result pages"><button disabled={!page} onClick={() => setCursor({ key: resetKey, page: page - 1 })}>Previous</button><span>{page + 1} / {pages}</span><button disabled={page + 1 === pages} onClick={() => setCursor({ key: resetKey, page: page + 1 })}>More results</button></nav>}</div>;
}
