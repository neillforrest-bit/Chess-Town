// Chess/checkers share the existing Metered environment-backed configuration.
// Provider API keys never enter the bundle. No obsolete public relay credentials.
export async function loadPeerConfig() {
  const response = await fetch('/api/trivia-ice', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Relay configuration could not load. Please retry.');
  const data = await response.json() as { iceServers?: RTCIceServer[]; relayConfigured?: boolean };
  if (!data.relayConfigured || !Array.isArray(data.iceServers)) throw new Error('Phone-to-phone relay is not configured. Try pass-and-play for now.');
  return { config: { iceServers: data.iceServers } };
}
