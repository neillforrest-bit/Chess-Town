import { Suspense } from 'react';
import DuoRoom from '@/components/DuoRoom';
export default function Page() { return <Suspense fallback={null}><DuoRoom /></Suspense>; }
