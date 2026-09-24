// Shared PeerJS config for friend links. The public PeerJS broker only does
// signaling - the media/data path is WebRTC, and phone-to-phone on cellular
// NATs needs a TURN relay or ICE fails silently (both sides wait forever).
// Open Relay's free public TURN keeps that path working at zero cost.
export const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
  },
};
