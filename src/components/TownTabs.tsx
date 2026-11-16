import Link from 'next/link';
import s from './TownTabs.module.css';
export default function TownTabs({active}:{active:'home'|'towns'|'hall'}){return <nav className={s.tabs} aria-label="Town navigation"><Link href="/" aria-current={active==='home'?'page':undefined}><span aria-hidden="true">⌂</span>Home</Link><Link href="/?view=towns" aria-current={active==='towns'?'page':undefined}><span aria-hidden="true">▦</span>Towns</Link><Link href="/noticeboard" aria-current={active==='hall'?'page':undefined}><span aria-hidden="true">☷</span>Town Hall</Link></nav>}
