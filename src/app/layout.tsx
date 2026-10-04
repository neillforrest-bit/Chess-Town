import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'CineSync - pick the movie, skip the fight', description: 'A two-player game that crowns tonight\'s movie.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#0b0a10' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
