'use client';
import Link from 'next/link';
import type {FindMovie} from '@/lib/find/types';
import FilmDataTable from './FilmDataTable';
import catalogue from '@/data/catalog.json';
export default function StoredFilmTable(){return <main data-movie-document data-movie-purple style={{minHeight:'100dvh',background:'radial-gradient(ellipse at 50% 0%,#52209b 0%,#2d0f55 76%)',color:'#fff','--film-top':'52px'} as React.CSSProperties}><nav style={{height:52,boxSizing:'border-box',padding:16,display:'flex',gap:12,fontSize:13}}><Link style={{color:'#e6d8ff'}} href="/movie-wheel">‹ Movie Time</Link><Link style={{color:'#e6d8ff'}} href="/library">Saved films</Link><Link style={{color:'#e6d8ff'}} href="/tickets">Ticket stubs</Link></nav><FilmDataTable movies={catalogue.movies as FindMovie[]} scope="Existing cached catalogue"/></main>;}
