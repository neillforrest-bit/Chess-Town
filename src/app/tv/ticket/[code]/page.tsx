import TvTicket from '@/components/TvTicket';
export default async function Page({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <TvTicket code={code.toUpperCase()} />; }
