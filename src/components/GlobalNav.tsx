'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { townForPath, townHref, TOWN_NAMES } from '@/lib/town-navigation';
export default function GlobalNav(){
 const path=usePathname()||'/';const town=townForPath(path);
 const leave=(e:React.MouseEvent)=>{const query=new URLSearchParams(location.search);const active=query.has('match')||query.has('room')||Boolean(document.querySelector('.chester-game,.live-game-layout'));
 if(active&&!confirm('Leave this game? If you are hosting, keep this tab open until everyone has finished.'))e.preventDefault();};
 return <nav className="global-nav gt-shared-nav" aria-label="Game Town navigation"><Link className="gt-wordmark" href="/" aria-label="Game Town home" onClick={leave}>game <span>town</span></Link><Link className="gt-town-back" href={townHref(town)} onClick={leave}>‹ {TOWN_NAMES[town]}</Link><button className="gt-header-help" aria-label="About Chester" onClick={()=>dispatchEvent(new Event('gt-open-chester'))}><img src="/good-together/chester-face.png" alt=""/></button></nav>;
}
