import { notFound } from 'next/navigation';
const modes: Record<string,string> = { library:'The Backlot film library',find:'Find Our Film', together:'Original Movie Night', tonight:'Tonight', discover:'Discovery Night' };
export default async function MoviePage({ params,searchParams }: { params: Promise<{mode:string}>,searchParams:Promise<{invite?:string}> }) {
  const { mode } = await params;
  if (!modes[mode]) notFound();
  const {invite}=await searchParams;
  let src=`https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app/${mode}`;
  if(mode==='find'&&invite){try{const u=new URL(invite);if(u.origin==='https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app'&&/^\/find\/[a-z0-9]+$/i.test(u.pathname))src=u.href;}catch{}}
  return <section className="movie-frame-page" aria-label={modes[mode]}><iframe src={src} title={modes[mode]} allow="clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" /></section>;
}
