import SpotifyAnalyzer from './components/SpotifyAnalyzer';

export default function Home() {
  return (
 <main className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 md:p-16 lg:p-24 bg-gradient-to-b from-blue-400 via-yellow-300 to-orange-300">
  <SpotifyAnalyzer />
</main>
  );
}