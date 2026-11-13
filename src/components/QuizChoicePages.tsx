'use client';
import { Children, useState } from 'react';

// Pagination changes presentation only. The parent still owns turns and deadlines.
export function QuizChoicePages({ children, resetKey = '' }: { children: React.ReactNode; resetKey?: string }) {
  const items = Children.toArray(children);
  const [cursor, setCursor] = useState({ key: resetKey, page: 0 });
  const page = cursor.key === resetKey ? cursor.page : 0;
  const size = 4, pages = Math.ceil(items.length / size);
  return <div className="quiz-choice-pages"><div className="trivia-duel-grid">{items.slice(page * size, (page + 1) * size)}</div>{pages > 1 && <nav aria-label="Answer pages"><button disabled={page === 0} onClick={() => setCursor({ key: resetKey, page: page - 1 })}>Previous</button><span>{page + 1} / {pages}</span><button disabled={page + 1 === pages} onClick={() => setCursor({ key: resetKey, page: page + 1 })}>More answers</button></nav>}</div>;
}
