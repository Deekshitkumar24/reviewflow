import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/app/QueryProvider";

export const metadata: Metadata = {
  title: "ReviewFlow — Professional Event Judging Platform",
  description: "The professional platform for technical event judging. Replace manual QA with structured, real-time, role-based review workflows.",
  keywords: ["hackathon", "judging", "review", "evaluation", "scoring", "event management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1A56DB" />
      </head>
      <body className="min-h-screen antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
