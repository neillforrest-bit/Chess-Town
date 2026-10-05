import { Suspense } from 'react';
import SoloRoom from '@/components/SoloRoom';
export default function Page() { return <Suspense fallback={null}><SoloRoom /></Suspense>; }
