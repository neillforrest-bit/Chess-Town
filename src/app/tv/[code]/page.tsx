import TvRoom from '@/components/TvRoom';
export default async function Page({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <TvRoom code={code.toUpperCase()} />; }
