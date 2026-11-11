import { useId } from 'react';
import styles from './ChesterCompanion.module.css';

export default function ChesterCompanion({ paused = false }: { paused?: boolean }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`${styles.mascot} ${paused ? styles.paused : ''}`} viewBox="0 0 240 240" role="img" aria-label="Chester, your animated game-night host">
    <defs>
      <radialGradient id={`${id}body`} cx="30%" cy="20%" r="85%"><stop stopColor="#C5AEFF"/><stop offset=".48" stopColor="#9769F4"/><stop offset="1" stopColor="#5D2BC3"/></radialGradient>
      <radialGradient id={`${id}face`} cx="35%" cy="24%" r="90%"><stop stopColor="#FFF0D8"/><stop offset=".62" stopColor="#FFD3A3"/><stop offset="1" stopColor="#EDA06D"/></radialGradient>
      <linearGradient id={`${id}shoe`} x2="1" y2="1"><stop stopColor="#4B267F"/><stop offset="1" stopColor="#2D1654"/></linearGradient>
      <filter id={`${id}soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <ellipse className={styles.shadow} cx="121" cy="219" rx="59" ry="9" fill="#170929" opacity=".25" filter={`url(#${id}soft)`}/>
    <g className={styles.float}>
      <ellipse cx="88" cy="207" rx="24" ry="13" transform="rotate(-9 88 207)" fill={`url(#${id}shoe)`}/>
      <ellipse cx="150" cy="207" rx="24" ry="13" transform="rotate(9 150 207)" fill={`url(#${id}shoe)`}/>
      <path d="M71 125C48 118 32 144 42 164C48 174 61 171 67 160L80 142" fill={`url(#${id}body)`}/>
      <g className={styles.wave}><path d="M170 132C188 129 185 101 192 90C199 78 217 85 215 99L207 140C203 158 180 164 170 150" fill={`url(#${id}body)`}/><path d="M197 97L199 111" stroke="#DAC9FF" strokeWidth="4" strokeLinecap="round" opacity=".7"/></g>
      <path d="M60 140C57 111 59 67 91 50C112 38 151 40 174 64C194 85 195 130 189 160C183 193 156 209 121 209C85 209 62 187 60 140Z" fill={`url(#${id}body)`}/>
      <path d="M100 49C97 34 102 20 112 18C127 15 127 33 132 37C139 25 147 24 154 30C166 42 150 53 136 54" fill={`url(#${id}body)`}/>
      <path d="M78 90C86 64 155 59 171 86C183 107 179 141 162 154C145 168 105 168 87 153C70 139 70 113 78 90Z" fill={`url(#${id}face)`}/>
      <path d="M85 87C96 73 117 71 130 71" fill="none" stroke="#FFF8EA" strokeWidth="5" strokeLinecap="round" opacity=".55"/>
      <path d="M93 99Q101 93 108 96M142 96Q150 91 157 98" fill="none" stroke="#4D2D50" strokeWidth="4" strokeLinecap="round"/>
      <g className={styles.eyes}><ellipse cx="103" cy="113" rx="6" ry="9" fill="#31203C"/><ellipse cx="148" cy="113" rx="6" ry="9" fill="#31203C"/><circle cx="105" cy="110" r="2" fill="#FFF"/><circle cx="150" cy="110" r="2" fill="#FFF"/></g>
      <ellipse cx="88" cy="130" rx="10" ry="6" fill="#EF927F" opacity=".65"/><ellipse cx="162" cy="129" rx="10" ry="6" fill="#EF927F" opacity=".65"/>
      <path d="M111 136Q127 151 143 135" fill="#54253F" stroke="#54253F" strokeWidth="3" strokeLinecap="round"/><path d="M118 143Q127 138 135 143" fill="#F497A0"/>
      <path d="M107 181L121 171L135 181L122 193Z" fill="#D9C5FF"/><path d="M121 177V188" stroke="#FFF6DF" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="177" cy="114" r="11" fill="#472565"/><circle cx="177" cy="114" r="6" fill="#C6A5FF"/><path d="M178 121Q180 142 159 143" fill="none" stroke="#472565" strokeWidth="5" strokeLinecap="round"/><rect x="151" y="139" width="14" height="7" rx="3.5" fill="#472565"/>
    </g>
    <g className={styles.spark}><path d="M42 48L46 61L59 65L46 69L42 82L38 69L25 65L38 61Z" fill="#FFCD78"/><circle cx="203" cy="51" r="5" fill="#D8C8FF"/></g>
  </svg>;
}
