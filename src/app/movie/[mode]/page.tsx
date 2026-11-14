import { notFound } from 'next/navigation';
const modes: Record<string,string> = { find:'Find Our Film', together:'Original Movie Night', tonight:'Tonight', discover:'Discovery Night' };
export default async function MoviePage({ params }: { params: Promise<{mode:string}> }) {
  const { mode } = await params;
  if (!modes[mode]) notFound();
  return <section className="movie-frame-page" aria-label={modes[mode]}><iframe src={`https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app/${mode}`} title={modes[mode]} allow="clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" /></section>;
}
