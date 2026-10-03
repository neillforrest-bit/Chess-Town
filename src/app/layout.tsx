import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { EngineEvaluationProvider } from "@/components/EngineEvaluationProvider";
import BuildWatcher from "@/components/BuildWatcher";

export const metadata: Metadata = {
  title: "Chess Town",
  description: "The Grandmaster's Map - Beta Demo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body><EngineEvaluationProvider><AppLayout>{children}</AppLayout><BuildWatcher /></EngineEvaluationProvider></body>
    </html>
  );
}
