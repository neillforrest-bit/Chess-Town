import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { EngineEvaluationProvider } from "@/components/EngineEvaluationProvider";

export const metadata: Metadata = {
  title: "Chess Town",
  description: "Chess and pub trivia with Chester. Choose a game, bring a friend, or play solo.",
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
