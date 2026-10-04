import PlayRoom from '@/components/PlayRoom';
export default async function Page({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <PlayRoom code={code.toUpperCase()} />; }
