import "./globals.css";
export const metadata = { title: "Knockout Trivia" };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default function L({ children }: { children: React.ReactNode }) { return <html lang="en"><body className="bg-zinc-950">{children}</body></html>; }
