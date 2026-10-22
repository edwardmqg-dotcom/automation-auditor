import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Automation Auditor",
  description: "Compare human work time with and without automation, including checking, corrections and saving.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
