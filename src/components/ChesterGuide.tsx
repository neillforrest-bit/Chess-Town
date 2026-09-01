'use client';

export default function ChesterGuide({ dialogue }: { dialogue: string }) {
  return <aside className="portal-guide" aria-live="polite">
    <div className="portal-guide__bubble"><span>CHESTER</span><p>{dialogue}</p></div>
    <div className="portal-guide__avatar" aria-hidden="true">♞</div>
  </aside>;
}
