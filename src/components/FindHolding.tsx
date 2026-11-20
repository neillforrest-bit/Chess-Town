'use client';
import ChesterCompanion from './ChesterCompanion';
import styles from './FindOurFilm.module.css';
export default function FindHolding({title,next,line,children}:{title:string;next:string;line?:string;children?:React.ReactNode}){return <div className={styles.holding} role="status"><div><ChesterCompanion/></div><h1>{title}</h1><p>{line||"Your picks are in. I'm arranging the next round. What will it be, movie fans?"}</p><strong>NEXT · {next}</strong>{children}</div>;}
