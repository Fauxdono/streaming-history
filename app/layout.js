import { Geist, Geist_Mono, Comic_Neue, Inter, JetBrains_Mono, Playfair_Display, Space_Grotesk, Outfit, DM_Sans, Sora, Lexend } from "next/font/google";
import localFont from "next/font/local";
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
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});
const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
});
const openDyslexic = localFont({
  src: './fonts/OpenDyslexic-Regular.woff2',
  variable: '--font-opendyslexic',
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
    statusBarStyle: 'default',
  }
};

export const viewport = {};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${comicNeue.variable} ${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${spaceGrotesk.variable} ${outfit.variable} ${dmSans.variable} ${sora.variable} ${lexend.variable} ${openDyslexic.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Cake" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cake" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width, shrink-to-fit=no, viewport-fit=cover" />
        
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
                var savedFontSize = localStorage.getItem('app-font-size') || 'medium';
                document.documentElement.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
                document.documentElement.classList.add('font-' + savedFontSize);
              } catch (e) {
                document.documentElement.classList.add('font-medium');
              }

              // Prevent pinch-to-zoom on iOS Safari (ignores viewport meta)
              document.addEventListener('touchmove', function(e) {
                if (e.touches.length > 1) e.preventDefault();
              }, { passive: false });
              document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
              document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
              document.addEventListener('gestureend', function(e) { e.preventDefault(); });

              // No zoom snap-back via body transform: a transform on <body>
              // re-anchors every position:fixed element to the body instead of
              // the screen. iOS transiently reports visualViewport.scale > 1
              // during rotation, and in the standalone PWA nothing re-fires
              // the resize event until the user scrolls — which left the
              // bottom chrome tap-dead after rotating. Zoom is already blocked
              // by the viewport meta, the gesture handlers above, and the
              // global touch-action: manipulation.
            })();
          `
        }} />
      </head>
      <body
        className="antialiased"
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}