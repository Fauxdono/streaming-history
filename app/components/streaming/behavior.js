// Behavior-tab statistics: platform categorization, Spotify reason_start /
// reason_end labeling, and the single-pass aggregate behind the Behavior
// subtab's charts. Moved out of listening-behavior.js so the computation is
// testable and theme-independent (slice colors are applied by the component).

const IPHONE_MODELS = {
  'iPhone1,1': 'iPhone', 'iPhone1,2': 'iPhone 3G',
  'iPhone2,1': 'iPhone 3GS',
  'iPhone3,1': 'iPhone 4', 'iPhone3,2': 'iPhone 4', 'iPhone3,3': 'iPhone 4',
  'iPhone4,1': 'iPhone 4S',
  'iPhone5,1': 'iPhone 5', 'iPhone5,2': 'iPhone 5', 'iPhone5,3': 'iPhone 5c', 'iPhone5,4': 'iPhone 5c',
  'iPhone6,1': 'iPhone 5s', 'iPhone6,2': 'iPhone 5s',
  'iPhone7,1': 'iPhone 6 Plus', 'iPhone7,2': 'iPhone 6',
  'iPhone8,1': 'iPhone 6s', 'iPhone8,2': 'iPhone 6s Plus', 'iPhone8,4': 'iPhone SE',
  'iPhone9,1': 'iPhone 7', 'iPhone9,2': 'iPhone 7 Plus', 'iPhone9,3': 'iPhone 7', 'iPhone9,4': 'iPhone 7 Plus',
  'iPhone10,1': 'iPhone 8', 'iPhone10,2': 'iPhone 8 Plus', 'iPhone10,3': 'iPhone X',
  'iPhone10,4': 'iPhone 8', 'iPhone10,5': 'iPhone 8 Plus', 'iPhone10,6': 'iPhone X',
  'iPhone11,2': 'iPhone XS', 'iPhone11,4': 'iPhone XS Max', 'iPhone11,6': 'iPhone XS Max', 'iPhone11,8': 'iPhone XR',
  'iPhone12,1': 'iPhone 11', 'iPhone12,3': 'iPhone 11 Pro', 'iPhone12,5': 'iPhone 11 Pro Max', 'iPhone12,8': 'iPhone SE 2',
  'iPhone13,1': 'iPhone 12 mini', 'iPhone13,2': 'iPhone 12', 'iPhone13,3': 'iPhone 12 Pro', 'iPhone13,4': 'iPhone 12 Pro Max',
  'iPhone14,2': 'iPhone 13 Pro', 'iPhone14,3': 'iPhone 13 Pro Max', 'iPhone14,4': 'iPhone 13 mini', 'iPhone14,5': 'iPhone 13',
  'iPhone14,6': 'iPhone SE 3', 'iPhone14,7': 'iPhone 14', 'iPhone14,8': 'iPhone 14 Plus',
  'iPhone15,2': 'iPhone 14 Pro', 'iPhone15,3': 'iPhone 14 Pro Max', 'iPhone15,4': 'iPhone 15', 'iPhone15,5': 'iPhone 15 Plus',
  'iPhone16,1': 'iPhone 15 Pro', 'iPhone16,2': 'iPhone 15 Pro Max',
};

export function extractIPhoneModel(raw) {
  if (!raw) return null;
  const match = raw.match(/\((iPhone\d+,\d+)\)/);
  if (match) return IPHONE_MODELS[match[1]] || match[1];
  return null;
}

// Human labels for Spotify's reason_start / reason_end enums — the raw values
// (fwdbtn, trackdone, …) should never reach the UI.
const REASON_LABELS = {
  trackdone: 'Track finished',
  fwdbtn: 'Skip button',
  backbtn: 'Back button',
  clickrow: 'Clicked a song',
  clickside: 'Clicked in sidebar',
  appload: 'App opened',
  playbtn: 'Play button',
  remote: 'Remote control',
  trackerror: 'Track error',
  endplay: 'Stopped playback',
  logout: 'Logged out',
  'unexpected-exit': 'App closed',
  'unexpected-exit-while-paused': 'Closed while paused',
  popup: 'Popup',
  uriopen: 'Opened via link',
  'switched-to-audiocast': 'Switched to cast',
  unknown: 'Unknown',
  undefined: 'Unknown',
  '': 'Unknown',
};

export function reasonLabel(reason) {
  const key = String(reason ?? '').trim();
  if (REASON_LABELS[key]) return REASON_LABELS[key];
  const pretty = key.replace(/[-_]+/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

// Top 7 reasons + an aggregated "Other" row, with share-of-total percentages.
export function foldReasons(counts, total) {
  const rows = Object.entries(counts)
    .map(([reason, count]) => ({
      name: reasonLabel(reason),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
  if (rows.length <= 8) return rows;
  const rest = rows.slice(7);
  const restCount = rest.reduce((sum, r) => sum + r.count, 0);
  return [
    ...rows.slice(0, 7),
    { name: 'Other', count: restCount, percentage: total > 0 ? Math.round((restCount / total) * 100) : 0 },
  ];
}

export function categorizePlatform(raw) {
  if (!raw) return 'Unknown';
  const p = raw.toLowerCase();

  // "iOS 15.5 (iPhone14,5)" / "iOS 14.6 (iPad8,11)" / "iOS 12.4.9 (iPod7,1)"
  // Extract the device type from parentheses
  if (p.startsWith('ios ')) {
    const match = raw.match(/\((iPhone|iPad|iPod)/i);
    if (match) return match[1].startsWith('iPhone') ? 'iPhone' : match[1].startsWith('iPad') ? 'iPad' : 'iPod';
    return 'iPhone'; // bare "iOS x.x" without device → likely iPhone
  }

  // "Android OS 9 API 28 (motorola, ...)" / "Android-tablet OS ..."
  if (p.startsWith('android')) return 'Android';

  // "Windows 10 (...)" / "Windows XP (...)"
  if (p.startsWith('windows')) return 'Windows';

  // "OS X 10.12.6 [x86 4]"
  if (p.startsWith('os x') || p.startsWith('macos')) return 'Mac';

  // "web_player windows 10;chrome 83..." / "WebPlayer (websocket RFC6455)"
  if (p.startsWith('web_player') || p.startsWith('webplayer')) return 'Web Player';

  // "Partner google cast_tv;Chromecast;;" / "Partner SCEI sony_tv;ps4;;" / etc.
  if (p.startsWith('partner ')) {
    if (p.includes('cast_tv') || p.includes('chromecast')) return 'Chromecast';
    if (p.includes('scei') || p.includes('ps4') || p.includes('playstation')) return 'PlayStation';
    if (p.includes('applewatch')) return 'Apple Watch';
    if (p.includes('denon') || p.includes('marantz') || p.includes('heos')) return 'Denon/Marantz';
    if (p.includes('android_tv')) return 'Smart TV';
    if (p.includes('spotify')) return 'Web Player';
    if (p.includes('ios_sdk')) return 'iPhone';
    return 'Other';
  }

  // Simple keyword matches
  const keywords = {
    'ios': 'iPhone', 'osx': 'Mac', 'cast': 'Chromecast',
    'playstation': 'PlayStation', 'ipod': 'iPod',
    'tidal': 'Tidal', 'soundcloud': 'SoundCloud',
    'not_applicable': 'Other', 'unknown': 'Unknown',
  };
  if (keywords[p]) return keywords[p];
  if (p.startsWith('deezer')) return 'Deezer';

  return 'Other';
}

// Single pass over the (already date-filtered) entries. Day buckets for the
// platform timeline use local time via one reused Date instance — no per-entry
// Date allocations, and no references to entries are retained.
export function computeBehaviorStats(entries) {
  let totalTracks = 0;
  let skippedTracks = 0;
  let shufflePlays = 0;
  let normalPlays = 0;
  let completedTracks = 0;

  const reasonEndCounts = {};
  const reasonStartCounts = {};
  const platforms = {};
  const dayPlatformCounts = {};
  const iphoneModelsSet = new Set();
  const scratchDate = new Date(0);

  entries.forEach(entry => {
    if (entry.ms_played >= 1000) { // Only analyze meaningful plays (more than 1 second)
      totalTracks++;

      const platform = categorizePlatform(entry.platform);
      platforms[platform] = (platforms[platform] || 0) + 1;

      if (entry.shuffle) {
        shufflePlays++;
      } else {
        normalPlays++;
      }

      if (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn') {
        skippedTracks++;
      }
      if (entry.reason_end === 'trackdone') {
        completedTracks++;
      }

      reasonEndCounts[entry.reason_end] = (reasonEndCounts[entry.reason_end] || 0) + 1;
      reasonStartCounts[entry.reason_start] = (reasonStartCounts[entry.reason_start] || 0) + 1;

      // Timeline bucket: one dot per local day per platform (per model for iPhones)
      const model = platform === 'iPhone' ? (extractIPhoneModel(entry.platform) || 'iPhone') : null;
      if (model) iphoneModelsSet.add(model);
      scratchDate.setTime(Date.parse(entry.ts));
      const year = scratchDate.getFullYear();
      const month = scratchDate.getMonth();
      const day = scratchDate.getDate();
      const dayKey = `${year}-${month}-${day}`;
      const key = model ? `${dayKey}|${model}` : `${dayKey}|${platform}`;
      if (!dayPlatformCounts[key]) {
        dayPlatformCounts[key] = { date: new Date(year, month, day).getTime(), platform, count: 0, model };
      }
      dayPlatformCounts[key].count++;
    }
  });

  const endReasons = foldReasons(reasonEndCounts, totalTracks);
  const startReasons = foldReasons(reasonStartCounts, totalTracks);

  const platformData = Object.entries(platforms).map(([platform, count]) => ({
    name: platform,
    count,
    percentage: Math.round((count / totalTracks) * 100)
  })).sort((a, b) => b.count - a.count);

  const platformNames = Object.entries(platforms)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  const platformIndexMap = {};
  platformNames.forEach((name, i) => { platformIndexMap[name] = i; });

  const iphoneModels = [...iphoneModelsSet].sort((a, b) => {
    const na = a.match(/\d+/) ? parseInt(a.match(/\d+/)[0]) : 0;
    const nb = b.match(/\d+/) ? parseInt(b.match(/\d+/)[0]) : 0;
    return na - nb || a.localeCompare(b);
  });

  const platformTimeline = Object.values(dayPlatformCounts).map(d => ({
    ...d,
    platformIndex: platformIndexMap[d.platform]
  }));

  return {
    totalTracks,
    skippedTracks,
    skippedPercentage: Math.round((skippedTracks / totalTracks) * 100),
    completedTracks,
    completedPercentage: Math.round((completedTracks / totalTracks) * 100),
    shufflePlays,
    normalPlays,
    shufflePercentage: Math.round((shufflePlays / totalTracks) * 100),
    endReasons,
    startReasons,
    platformData,
    platformTimeline,
    platformNames,
    iphoneModels
  };
}
