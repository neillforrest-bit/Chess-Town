import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { EngineEvaluationProvider } from "@/components/EngineEvaluationProvider";

export const metadata: Metadata = {
  title: "Game Town",
  description: "You can do better than doom scrolling. Play a game, find a film, maybe even test your knowledge or grammar.",
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
