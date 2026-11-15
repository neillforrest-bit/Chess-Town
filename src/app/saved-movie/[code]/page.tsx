import SavedMovieGate from '@/components/SavedMovieGate';
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;return <SavedMovieGate code={code.toUpperCase()}/>;}
