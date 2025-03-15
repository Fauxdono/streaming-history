import { Geist, Geist_Mono, Comic_Neue } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const comicNeue = Comic_Neue({
  weight: ['700'],
  subsets: ['latin'],
  variable: '--font-comic-neue',
});

export const metadata = {
  title: "Music Stats - Streaming History Analyzer",
  description: "Analyze your music streaming history in depth",
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icon-180x180.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  manifest: '/manifest.json',
  themeColor: '#000000'
};
  viewport: 'minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    title: 'Spotify Analyzer',
    statusBarStyle: 'black-translucent',
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${comicNeue.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

