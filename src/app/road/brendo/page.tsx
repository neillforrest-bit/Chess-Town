'use client';
import RoadMap from '@/games/RoadMap';
import { BRENDO_ROAD } from '@/games/chess/brendo-config';
export default function BrendoRoadPage() { return <RoadMap cfg={BRENDO_ROAD} />; }
