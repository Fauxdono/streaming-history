'use client';
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Sparkles, Music, Users } from 'lucide-react';
import { buildRecommendations } from './engine.js';
import { getLbToken, setLbToken } from './listenbrainz.js';
import { filterDataByDate } from '../streaming-adapter.js';
import TopNStepper from '../TopNStepper.js';

const PHASE_LABELS = {
  'matching-artists': 'Matching artists to MusicBrainz…',
  'fetching-similar-artists': 'Finding similar artists…',
  'matching-tracks': 'Matching tracks to ListenBrainz…',
  'fetching-similar-tracks': 'Finding similar songs…',
};

const SEED_STATES = [10, 50, 100, 500, 1000, 'max'];
const DEFAULT_SEED_STATE_INDEX = 2; // 100
const MIN_SEED_PLAY_MS = 30000;

export default function RecommendationsPanel({ colorMode, isDarkMode, topArtists, topTracks, rawPlayData, selectedStreaksYear, periodLabel }) {
  const [token, setToken] = useState(() => getLbToken());
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [seedStateIndex, setSeedStateIndex] = useState(DEFAULT_SEED_STATE_INDEX);
  const [seedPress, setSeedPress] = useState(0);
  const [customSeedLimit, setCustomSeedLimit] = useState(null);
  const [savePress, setSavePress] = useState(0);
  const [buildPress, setBuildPress] = useState(0);

  const [isBuilding, setIsBuilding] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const stopRef = useRef(false);

  const cardBg = colorMode === 'colorful'
    ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 shadow-[1px_1px_0_0_#4338ca] dark:shadow-[1px_1px_0_0_#4f46e5]'
    : `${isDarkMode ? 'bg-black border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'bg-white border-black shadow-[1px_1px_0_0_black]'}`;
  const text = colorMode === 'colorful' ? 'text-indigo-700 dark:text-indigo-300' : '';
  const textLight = colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400';
  const buttonCls = colorMode === 'colorful'
    ? `px-4 py-2 rounded text-sm font-medium border transition-colors hover:opacity-80 disabled:opacity-50 ${isDarkMode ? 'bg-indigo-800 text-indigo-300 border-indigo-600 shadow-[2px_2px_0_0_#4f46e5]' : 'bg-indigo-100 text-indigo-700 border-indigo-700 shadow-[2px_2px_0_0_#4338ca]'}`
    : `px-4 py-2 rounded text-sm font-medium border transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-black text-[#FDF6E3] border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'}`;
  const pressCls = isDarkMode
    ? (colorMode === 'colorful' ? 'btn-press-indigo-dark' : 'btn-press-dark')
    : (colorMode === 'colorful' ? 'btn-press-indigo-light' : 'btn-press-light');
  const inputCls = `px-3 py-1.5 text-sm rounded border ${isDarkMode ? 'bg-black border-[#4169E1] text-[#FDF6E3]' : 'bg-white border-black text-black'}`;

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    setLbToken(trimmed);
    setToken(trimmed);
    setTokenInput('');
    setTokenSaved(true);
    setSavePress(p => p + 1);
    setTimeout(() => setTokenSaved(false), 2500);
  };

  const handleClearToken = () => {
    setLbToken('');
    setToken('');
  };

  // When a specific year/range is selected on the Statistics page, seed
  // recommendations off THAT period's listening instead of all-time — e.g.
  // "what should I have discovered based on my 2023 taste". Exclusion of
  // already-known artists (in the engine) still uses the full all-time
  // topArtists prop, so this never re-recommends something from a different year.
  const periodArtists = useMemo(() => {
    if (!selectedStreaksYear || selectedStreaksYear === 'all') return null;
    const filtered = filterDataByDate(rawPlayData || [], selectedStreaksYear);
    const byArtist = new Map();
    for (const e of filtered) {
      if (!e.ms_played || e.ms_played < MIN_SEED_PLAY_MS) continue;
      const name = e.master_metadata_album_artist_name;
      if (!name) continue;
      const entry = byArtist.get(name) || { name, playCount: 0, totalPlayed: 0 };
      entry.playCount += 1;
      entry.totalPlayed += e.ms_played;
      byArtist.set(name, entry);
    }
    return [...byArtist.values()].sort((a, b) => b.totalPlayed - a.totalPlayed);
  }, [rawPlayData, selectedStreaksYear]);

  const seedPool = useMemo(() => periodArtists || topArtists || [], [periodArtists, topArtists]);

  const seedState = SEED_STATES[seedStateIndex];
  const seedLimit = customSeedLimit != null
    ? customSeedLimit
    : (seedState === 'max' ? (seedPool.length || 1) : seedState);
  const seedLimitLabel = customSeedLimit != null ? customSeedLimit.toLocaleString() : (seedState === 'max' ? 'Max' : seedState);
  const estimatedMinutes = Math.max(1, Math.round((seedLimit * 1.1) / 60));

  const cycleSeedState = () => {
    setCustomSeedLimit(null);
    setSeedStateIndex(i => (i + 1) % SEED_STATES.length);
    setSeedPress(p => p + 1);
  };

  // TopNStepper calls setValue with either a plain number (typed + blurred)
  // or an updater fn (± arrow buttons). The updater form needs to step off
  // the currently DISPLAYED value, not the raw customSeedLimit state — that's
  // null whenever the cycle button (not a custom entry) set the active count.
  const handleSeedStepperChange = (next) => {
    const resolved = typeof next === 'function' ? next(seedLimit) : next;
    setCustomSeedLimit(Math.max(1, Math.min(resolved, seedPool.length || resolved)));
  };

  const handleBuild = useCallback(async () => {
    setIsBuilding(true);
    setError(null);
    setBuildPress(p => p + 1);
    stopRef.current = false;
    try {
      const result = await buildRecommendations({
        topArtists: seedPool,
        knownArtistNames: (topArtists || []).map(a => a.name),
        seedArtistLimit: seedLimit,
        topTracks: topTracks || [],
        rawPlayData: rawPlayData || [],
        token,
        onProgress: (phase, done, total) => setProgress({ phase, done, total }),
        shouldStop: () => stopRef.current,
      });
      setResults(result);
    } catch (err) {
      console.error('Recommendation build failed:', err);
      setError(err.message || 'Something went wrong building recommendations.');
    } finally {
      setIsBuilding(false);
      setProgress(null);
    }
  }, [seedPool, topArtists, topTracks, rawPlayData, token, seedLimit]);

  const hasEnoughData = (topArtists?.length || 0) >= 5;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Connect ListenBrainz */}
      <div className={`p-4 border rounded-lg ${cardBg}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className={`font-semibold text-sm ${text}`}>ListenBrainz (optional)</h4>
          {token && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Connected</span>}
        </div>
        <p className={`text-xs sm:text-sm mb-3 ${textLight}`}>
          Artist recommendations work with no setup. Connecting a free ListenBrainz account also unlocks
          song-level recommendations. Grab a token from{' '}
          <a href="https://listenbrainz.org/settings/" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
            listenbrainz.org/settings
          </a>.
        </p>
        {token ? (
          <button onClick={handleClearToken} className={`text-xs underline ${textLight} hover:opacity-70`}>
            Disconnect
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Paste your ListenBrainz token"
              className={`${inputCls} flex-1 min-w-[200px]`}
            />
            <button key={`save-${savePress}`} onClick={handleSaveToken} disabled={!tokenInput.trim()} className={`${buttonCls} ${pressCls}`}>
              Save
            </button>
            {tokenSaved && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
          </div>
        )}
      </div>

      {/* Seed settings */}
      {hasEnoughData && (
        <div className={`p-4 border rounded-lg ${cardBg}`}>
          <h4 className={`font-semibold text-sm mb-1 ${text}`}>Seed artists</h4>
          <p className={`text-xs sm:text-sm mb-3 ${textLight}`}>
            Based on your top artists {periodLabel ? `(${periodLabel})` : ''} — {seedPool.length.toLocaleString()} available.
            More seeds means broader coverage but a slower first build (MusicBrainz allows ~1 lookup/second; already-matched
            artists are cached and skip the wait).
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button
              key={`seed-cycle-${seedPress}`}
              onClick={cycleSeedState}
              className={
                (colorMode === 'colorful'
                  ? `px-3 py-1.5 rounded text-xs sm:text-sm font-medium border transition-colors hover:opacity-80 ${isDarkMode ? 'bg-indigo-800 text-indigo-300 border-indigo-600 shadow-[2px_2px_0_0_#4f46e5]' : 'bg-indigo-100 text-indigo-700 border-indigo-700 shadow-[2px_2px_0_0_#4338ca]'}`
                  : `px-3 py-1.5 rounded text-xs sm:text-sm font-medium border transition-colors ${isDarkMode ? 'bg-black text-[#FDF6E3] border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'}`
                ) + ` ${pressCls}`
              }
            >
              Top {seedLimitLabel}
            </button>
            <label className={`text-xs ${textLight}`}>or exact</label>
            <TopNStepper
              value={seedLimit}
              setValue={handleSeedStepperChange}
              max={seedPool.length || 1}
              inputClass={
                colorMode === 'colorful'
                  ? `border-indigo-300 dark:border-indigo-600 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 ${isDarkMode ? 'shadow-[2px_2px_0_0_#4f46e5]' : 'shadow-[2px_2px_0_0_#4338ca]'}`
                  : (isDarkMode ? 'border-[#4169E1] bg-black text-[#FDF6E3] shadow-[2px_2px_0_0_#4169E1]' : 'border-black bg-white text-black shadow-[2px_2px_0_0_black]')
              }
              buttonClass={
                colorMode === 'colorful'
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : (isDarkMode ? 'text-[#FDF6E3]' : 'text-black')
              }
            />
          </div>
          <p className={`text-xs ${textLight}`}>
            Using top {Math.min(seedLimit, seedPool.length).toLocaleString()} artists · first build ~{estimatedMinutes} min (uncached)
          </p>
        </div>
      )}

      {/* Build button */}
      <div className={`p-4 border rounded-lg ${cardBg}`}>
        {!hasEnoughData ? (
          <p className={`text-sm ${textLight}`}>Not enough listening history yet to build recommendations.</p>
        ) : (
          <>
            <button key={`build-${buildPress}`} onClick={handleBuild} disabled={isBuilding} className={`${buttonCls} ${pressCls} inline-flex items-center gap-2`}>
              <Sparkles size={16} />
              {isBuilding ? 'Building…' : results ? 'Refresh recommendations' : 'Build recommendations'}
            </button>
            {isBuilding && progress && (
              <div className="mt-3 max-w-sm">
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                      background: colorMode === 'colorful' ? '#4f46e5' : (isDarkMode ? '#4169E1' : '#000'),
                    }}
                  />
                </div>
                <p className={`text-xs mt-1 ${textLight}`}>
                  {PHASE_LABELS[progress.phase] || 'Working…'} {progress.total ? `(${progress.done}/${progress.total})` : ''}
                </p>
              </div>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
          </>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <RecommendationSection
            title="Artists to discover"
            icon={<Users size={16} />}
            items={results.artists}
            cardBg={cardBg}
            text={text}
            textLight={textLight}
            renderItem={(a) => (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-medium truncate flex-1 min-w-0 ${text}`} title={a.name}>{a.name}</span>
                  {a.comment && <span className={`text-xs truncate flex-1 min-w-0 ${textLight}`} title={a.comment}>{a.comment}</span>}
                </div>
                {a.sources[0] && (
                  <div className={`text-xs mt-0.5 truncate ${textLight}`}>because you listen to {a.sources[0].seedName}</div>
                )}
              </>
            )}
          />
          <RecommendationSection
            title="Songs to discover"
            icon={<Music size={16} />}
            items={results.tracks}
            cardBg={cardBg}
            text={text}
            textLight={textLight}
            emptyHint={!token ? 'Connect ListenBrainz above to unlock song-level recommendations.' : 'No song recommendations found — try again after your library grows.'}
            renderItem={(t) => (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-medium truncate flex-1 min-w-0 ${text}`} title={t.trackName}>{t.trackName}</span>
                  <span className={`text-xs truncate flex-1 min-w-0 ${textLight}`} title={`by ${t.artist}${t.album ? ` · ${t.album}` : ''}`}>
                    by {t.artist}{t.album ? ` · ${t.album}` : ''}
                  </span>
                </div>
                {t.sources[0] && (
                  <div className={`text-xs mt-0.5 truncate ${textLight}`}>because you played {t.sources[0].seedName}</div>
                )}
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}

function RecommendationSection({ title, icon, items, cardBg, text, textLight, renderItem, emptyHint }) {
  return (
    <div className={`p-4 border rounded-lg ${cardBg}`}>
      <h4 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${text}`}>
        {icon} {title} {items.length > 0 && <span className={`font-normal ${textLight}`}>({items.length})</span>}
      </h4>
      {items.length === 0 ? (
        <p className={`text-sm ${textLight}`}>{emptyHint || 'No recommendations yet.'}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {items.map((item, i) => (
            <div key={i} className={`p-2.5 rounded border ${cardBg}`}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
