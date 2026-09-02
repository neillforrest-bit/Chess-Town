import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { EngineEvaluationProvider } from "@/components/EngineEvaluationProvider";

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
      <body><EngineEvaluationProvider><AppLayout>{children}</AppLayout></EngineEvaluationProvider></body>
    </html>
  );
}
