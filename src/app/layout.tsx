import type { Metadata } from "next";
import { saira, satoshi } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surya Pugazhenthi — Builder, CS @ UCSC, VC Scout",
  description:
    "Portfolio of Surya Pugazhenthi: computer science student, builder of AI and web projects, hackathon regular, and venture scout in the Bay Area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${saira.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
