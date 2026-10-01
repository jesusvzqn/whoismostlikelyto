import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Who's most likely to...?",
  description:
    "A party game for your team: find out who's most likely to do what.",
  openGraph: {
    title: "Who's most likely to...?",
    description:
      "A party game for your team: find out who's most likely to do what.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ff6b81",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} font-display antialiased`}>
        {children}
      </body>
    </html>
  );
}
