import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { EngineEvaluationProvider } from "@/components/EngineEvaluationProvider";

export const metadata: Metadata = {
  title: "Good Together",
  description: "A game. A film. A little time together. Choose your game with Chester.",
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
