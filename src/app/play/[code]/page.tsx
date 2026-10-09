import PlayGate from '@/components/PlayGate';
export default async function Page({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <PlayGate code={code.toUpperCase()} />; }
