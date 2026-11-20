import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
const ORIGIN='https://chess-town-gleofilo7-neillo.vercel.app';
const modes: Record<string,string> = { wheel:'Movie Time', duo:'Duo Night', library:'The Backlot film library', find:'Find Our Film', together:'Original Movie Night', tonight:'Tonight', discover:'Discovery Night' };
const paths: Record<string,string> = { wheel:'/movie-wheel', duo:'/duo', library:'/library', find:'/find', together:'/together', tonight:'/tonight', discover:'/discover' };
export default async function MoviePage({ params,searchParams }: { params: Promise<{mode:string}>,searchParams:Promise<{invite?:string}> }) {
  const { mode } = await params;
  if (!modes[mode]) notFound();
  const {invite}=await searchParams;
  let src=ORIGIN+paths[mode];
  if((mode==='find'||mode==='together')&&invite){try{const u=new URL(invite);if(u.origin===ORIGIN&&((mode==='find'&&/^\/find\/[A-Z2-9]{8}$/.test(u.pathname))||(mode==='together'&&/^\/saved-movie\/[a-z0-9]{8,16}$/i.test(u.pathname))))src=u.href;}catch{}}
  // New saved Original Movie Night stays first-party so private seats are not partitioned by an iframe.
  if(mode==='together')redirect(src);
  return <section className="movie-frame-page" aria-label={modes[mode]}><iframe src={src} title={modes[mode]} allow="clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" /></section>;
}
