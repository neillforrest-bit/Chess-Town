import {createInviteStore} from './durable-invites';
// Public API identifier for the isolated Free preview project, not a privileged key.
export const previewInviteStore=createInviteStore({"url": "https://chsatuxnkfstvsqhzqru.supabase.co", "key": "sb_publishable_evOAPZMaAvwBr7DQI3-LUQ_taA22ZaE"});
export function allowPreviewInvites(){return process.env.NEXT_PUBLIC_VERCEL_ENV!=='production'&&typeof window!=='undefined'&&/^(localhost|127\.0\.0\.1|chess-town-[a-z0-9-]+-neillo\.vercel\.app)$/.test(location.hostname);}
