import {NextResponse} from 'next/server';
import {limit,ipKey} from '@/lib/find/server';
export async function GET(req:Request){
 if(!await limit('table-trailer:'+ipKey(req),60,60))return NextResponse.json({error:'Please pause before retrying.'},{status:429});
 const id=Number(new URL(req.url).searchParams.get('id')),key=process.env.TMDB_API_KEY;if(!Number.isSafeInteger(id)||id<1||!key)return NextResponse.json({error:'Trailer lookup unavailable.'},{status:400});
 try{const r=await fetch('https://api.themoviedb.org/3/movie/'+id+'/videos?'+new URLSearchParams({api_key:key,language:'en-US'}),{signal:AbortSignal.timeout(7000),next:{revalidate:86400}});if(!r.ok)throw Error();const j=await r.json();const videos=(j.results||[]).filter((v:{site:string;key:string;type:string})=>v.site==='YouTube'&&/^[\w-]{11}$/.test(v.key)&&['Trailer','Teaser'].includes(v.type));videos.sort((a:{official:boolean;type:string},b:{official:boolean;type:string})=>Number(b.official)-Number(a.official)||Number(b.type==='Trailer')-Number(a.type==='Trailer'));const v=videos[0];return NextResponse.json({url:v?'https://www.youtube.com/watch?v='+v.key:null,name:v?.name||'',official:!!v?.official,type:v?.type||'',source:'TMDB video links'});}catch{return NextResponse.json({error:'Trailer source could not be reached.'},{status:503});}
}
