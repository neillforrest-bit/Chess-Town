import FindOurFilm from '@/components/FindOurFilm';
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;return <FindOurFilm code={code.toUpperCase()}/>;}
