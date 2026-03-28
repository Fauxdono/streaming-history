import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const API_KEY = process.env.LASTFM_API_KEY;
const API_SECRET = process.env.LASTFM_API_SECRET;

const ALLOWED_GET_METHODS = [
  'user.getrecenttracks',
  'user.getinfo',
  'user.gettopartists',
  'user.gettoptracks',
  'user.gettopalbums',
  'user.getweeklytrackchart',
  'auth.gettoken',
];

const ALLOWED_POST_METHODS = [
  'track.scrobble',
  'auth.getsession',
];

// Generate Last.fm API signature: md5 of sorted params + secret
function generateSignature(params) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'format')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('');
  return createHash('md5').update(sorted + API_SECRET, 'utf8').digest('hex');
}

export async function GET(request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Last.fm API key not configured. Add LASTFM_API_KEY to .env.local' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const method = searchParams.get('method')?.toLowerCase();

  if (!method) {
    return NextResponse.json({ error: 'Missing method parameter' }, { status: 400 });
  }

  if (!ALLOWED_GET_METHODS.includes(method)) {
    return NextResponse.json({ error: `Method not allowed: ${method}` }, { status: 400 });
  }

  // Build params
  const params = { method, api_key: API_KEY, format: 'json' };

  // Forward optional params
  for (const key of ['user', 'page', 'limit', 'period', 'from', 'to', 'token']) {
    const val = searchParams.get(key);
    if (val) params[key] = val;
  }

  // auth.gettoken needs signing
  if (method === 'auth.gettoken') {
    if (!API_SECRET) {
      return NextResponse.json(
        { error: 'Last.fm API secret not configured. Add LASTFM_API_SECRET to .env.local' },
        { status: 500 }
      );
    }
    params.api_sig = generateSignature(params);
  }

  const url = `${LASTFM_API_URL}?${new URLSearchParams(params).toString()}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.message || 'Last.fm API error' },
        { status: 400 }
      );
    }

    // For auth.gettoken, also return the API key so the client can build the auth URL
    if (method === 'auth.gettoken') {
      data._apiKey = API_KEY;
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch from Last.fm: ' + err.message },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  if (!API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: 'Last.fm API key/secret not configured.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const method = body.method?.toLowerCase();
  if (!method || !ALLOWED_POST_METHODS.includes(method)) {
    return NextResponse.json({ error: `Method not allowed: ${method}` }, { status: 400 });
  }

  if (method === 'auth.getsession') {
    const token = body.token;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const params = {
      method: 'auth.getSession',
      api_key: API_KEY,
      token,
    };
    params.api_sig = generateSignature(params);
    params.format = 'json';

    try {
      const res = await fetch(`${LASTFM_API_URL}?${new URLSearchParams(params).toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.message || 'Auth failed' }, { status: 400 });
      }
      return NextResponse.json(data);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
  }

  if (method === 'track.scrobble') {
    const { sk, scrobbles } = body;
    if (!sk || !scrobbles || !Array.isArray(scrobbles) || scrobbles.length === 0) {
      return NextResponse.json({ error: 'Missing sk (session key) or scrobbles array' }, { status: 400 });
    }

    // Last.fm accepts up to 50 scrobbles per request
    const batch = scrobbles.slice(0, 50);
    const params = {
      method: 'track.scrobble',
      api_key: API_KEY,
      sk,
    };

    // Add each scrobble as indexed params: artist[0], track[0], timestamp[0], etc.
    batch.forEach((s, i) => {
      params[`artist[${i}]`] = s.artist;
      params[`track[${i}]`] = s.track;
      params[`timestamp[${i}]`] = s.timestamp;
      if (s.album) params[`album[${i}]`] = s.album;
    });

    params.api_sig = generateSignature(params);
    params.format = 'json';

    try {
      const res = await fetch(LASTFM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
      });
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ error: data.message || 'Scrobble failed' }, { status: 400 });
      }
      return NextResponse.json(data);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unhandled method' }, { status: 400 });
}
