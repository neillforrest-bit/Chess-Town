import type { Metadata } from "next";
import "./globals.css";
import GlobalNav from "@/components/GlobalNav";

export const metadata: Metadata = {
  title: "Chess Town",
  description: "The Grandmaster's Map - Beta Demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ padding: 0, margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <GlobalNav />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '80px', position: 'relative' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
