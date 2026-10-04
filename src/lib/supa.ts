/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
let client: ReturnType<typeof createClient<any>> | null = null;
export const sb = () => (client ||= createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { realtime: { params: { eventsPerSecond: 20 } } }));
