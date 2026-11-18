'use client';
import Link from 'next/link';
import type {FindMovie} from '@/lib/find/types';
import FilmDataTable from './FilmDataTable';
import catalogue from '@/data/catalog.json';
export default function StoredFilmTable(){return <main style={{minHeight:'100dvh',background:'#17151c',color:'#fff','--film-top':'52px'} as React.CSSProperties}><nav style={{height:52,boxSizing:'border-box',padding:16,display:'flex',gap:20}}><Link style={{color:'#e3c58b'}} href="/find">Movie Time</Link><Link style={{color:'#e3c58b'}} href="/library">Saved films</Link></nav><FilmDataTable movies={catalogue.movies as FindMovie[]} scope="Existing cached catalogue"/></main>;}
