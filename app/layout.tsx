import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://relay-food-rescue.srivibhavpadakandla.chatgpt.site"),
  title: "Relay — Autonomous Food Rescue OS",
  description: "Relay uses Gemini 3.5 Flash and policy-bounded tools to rescue cold-chain food, coordinate partners, and prove every action.",
  openGraph: {
    title: "Relay — Autonomous Food Rescue OS",
    description: "Autonomous food rescue. Every action leaves proof.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Relay autonomous food rescue mission" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Relay — Autonomous Food Rescue OS",
    description: "Autonomous food rescue. Every action leaves proof.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
