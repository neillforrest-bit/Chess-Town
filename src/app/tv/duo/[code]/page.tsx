import TvDuo from '@/components/TvDuo';
export default async function Page({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <TvDuo code={code.toUpperCase()} />; }
