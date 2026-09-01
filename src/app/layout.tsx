import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}