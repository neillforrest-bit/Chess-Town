import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
const modes: Record<string,string> = { library:'The Backlot film library',find:'Find Our Film', together:'Original Movie Night', tonight:'Tonight', discover:'Discovery Night' };
export default async function MoviePage({ params,searchParams }: { params: Promise<{mode:string}>,searchParams:Promise<{invite?:string}> }) {
  const { mode } = await params;
  if (!modes[mode]) notFound();
  const {invite}=await searchParams;
  let src=`https://chess-town-l068t4nsj-neillo.vercel.app/${mode}`;
  if((mode==='find'||mode==='together')&&invite){try{const u=new URL(invite);if(['https://chess-town-l068t4nsj-neillo.vercel.app','https://chess-town-piu9f608j-neillo.vercel.app','https://chess-town-git-instinct-find-our-film-20261113-neillo.vercel.app'].includes(u.origin)&&((mode==='find'&&/^\/find\/[a-z0-9]+$/i.test(u.pathname))||(mode==='together'&&/^\/saved-movie\/[a-f0-9]{16}$/i.test(u.pathname)))){src=u.href;}}catch{}}
  // New saved Original Movie Night stays first-party so private seats are not partitioned by an iframe.
  if(mode==='together')redirect(src);
  return <section className="movie-frame-page" aria-label={modes[mode]}><iframe src={src} title={modes[mode]} allow="clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" /></section>;
}
