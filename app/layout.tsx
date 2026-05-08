import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { authOptions } from "@/lib/auth-options";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "A Wok | Premium Chinese in Hayward",
  description: "Bold flavors, fresh ingredients, fast pickup. A Wok — modern Chinese street-food luxury.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  // Favicon / Apple touch: `app/icon.png` and `app/apple-icon.png` (same image as `public/awok-logo.png`).
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0c0d10",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
