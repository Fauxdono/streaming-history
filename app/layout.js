import { Geist, Geist_Mono, Comic_Neue } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { ThemeProvider } from "./components/themeprovider.js";

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
  title: "Cakeculator - Streaming History Analyzer",
  description: "Analyze your music streaming history in depth",
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Cakeculator',
    statusBarStyle: 'black-translucent',
  }
};

export const viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Cake" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Cake" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        
        {/* PWA icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        
        {/* Font Size Initialization */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const savedFontSize = localStorage.getItem('app-font-size') || 'medium';
                document.documentElement.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
                document.documentElement.classList.add('font-' + savedFontSize);
              } catch (e) {
                // Fallback if localStorage is not available
                document.documentElement.classList.add('font-medium');
              }
            })();
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${comicNeue.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}