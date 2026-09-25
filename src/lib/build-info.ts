// Bump BATCH every batch so the deployed build self-identifies for the owner and testers.
export const BATCH = 39;
export const BUILD_SHA = (process.env.NEXT_PUBLIC_BUILD_SHA || 'dev').slice(0, 7);
export const BUILD_LABEL = `BUILD ${BATCH} · ${BUILD_SHA}`;
