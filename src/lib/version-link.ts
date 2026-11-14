import { BATCH, BUILD_SHA } from './build-info';
export const PREVIEW_VERSION = `${BATCH}-${BUILD_SHA}`;
export function versionLink(value: string): string { const url = new URL(value, window.location.origin); if (url.origin === window.location.origin) url.searchParams.set('v', PREVIEW_VERSION); return url.toString(); }
