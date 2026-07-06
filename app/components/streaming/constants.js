export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music',
  TIDAL: 'tidal',
  DEEZER: 'deezer',
  SOUNDCLOUD: 'soundcloud',
  CAKE: 'cake',
  IPOD: 'ipod',
  LASTFM: 'lastfm'
};

export const STREAMING_SERVICES = {
  [STREAMING_TYPES.SPOTIFY]: {
    name: 'Spotify',
    downloadUrl: 'https://www.spotify.com/account/privacy/',
    instructions: 'Request your "Extended streaming history" and wait for the email (can take up to 5 days). filenames:Streaming_History_Audio_2023-2024_14',
    acceptedFormats: '.json'
  },
  [STREAMING_TYPES.APPLE_MUSIC]: {
    name: 'Apple Music',
    downloadUrl: 'https://privacy.apple.com/',
    instructions: 'Go to URL and request a copy of your data and open Apple_Media_Services/Apple Music Activity/Apple Music - Play History Daily Tracks',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.YOUTUBE_MUSIC]: {
    name: 'YouTube Music',
    downloadUrl: 'https://takeout.google.com/',
    instructions: 'Select YouTube and YouTube Music data in Google Takeout',
    acceptedFormats: '.json,.csv'
  },
  [STREAMING_TYPES.DEEZER]: {
    name: 'Deezer',
    downloadUrl: 'https://www.deezer.com/account',
    instructions: 'Go to Account Settings and in the third tab Private information above your birthdate you see My personal data next to Privacy Settings press then download your listening history',
    acceptedFormats: '.csv,.xlsx'
  },
  [STREAMING_TYPES.SOUNDCLOUD]: {
    name: 'SoundCloud',
    instructions: 'You have to send customer service a mail for your SoundCloud history',
    downloadUrl: 'https://soundcloud.com/settings/account',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.TIDAL]: {
    name: 'Tidal',
    downloadUrl: 'support@tidal.com',
    instructions: 'Send an email to Tidal to request data and wait for 2-4 weeks for it to come',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.CAKE]: {
    name: 'Cake',
    downloadUrl: '#',
    instructions: 'In the statitics page you can download an excel.',
    acceptedFormats: '.xlsx,.json'
  },
  [STREAMING_TYPES.IPOD]: {
    name: 'iPod',
    downloadUrl: 'https://www.rockbox.org/',
    instructions: 'Connect your iPod and find the .scrobbler.log file in the root of your iPod drive. This file is created by Rockbox firmware.',
    acceptedFormats: '.log'
  },
  [STREAMING_TYPES.LASTFM]: {
    name: 'Last.fm',
    downloadUrl: 'https://www.last.fm/api/account/create',
    instructions: 'Connect your Last.fm account to import your scrobble history directly via the API.',
    acceptedFormats: '.json'
  }
};

// Cache for normalized strings to avoid redundant processing
