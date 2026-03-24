import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Touti's Tracker",
  description: "Track feeding, pumping, sleep, diapers & showers",
  icons: {
    icon: "/icon.jpg",
    apple: "/icon.jpg",
  },
  appleWebApp: {
    capable: true,
    title: "Touti's Tracker",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fff5f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <footer className="pb-6 pt-10 text-center text-[11px] text-gray-300">
          Made by alaweeka for taytoon
        </footer>
      </body>
    </html>
  );
}
