// Lightweight read/write of a single JSON file in the existing "cakeculator"
// Google Drive folder. Reuses the access token GoogleDriveSync already obtained
// (kept in gapi / localStorage), so there is no extra sign-in and no new OAuth
// scope — the same drive.file scope that powers the analysis backup.

const FOLDER_NAME = 'cakeculator';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return window.gapi?.client?.getToken?.()?.access_token
    || localStorage.getItem('google_drive_token')
    || null;
}

// True when there is a token to try — the Save/Load buttons use this to decide
// whether to act or nudge the user to connect on the Upload tab first.
export function isDriveConnected() {
  return !!getAccessToken();
}

async function authFetch(url, opts, token) {
  const res = await fetch(url, {
    cache: 'no-store',
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (res.status === 401) {
    throw new Error('Google Drive session expired — reconnect it on the Upload tab, then try again.');
  }
  return res;
}

async function findFolderId(token) {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await authFetch(`${API}?q=${q}&spaces=drive`, {}, token);
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function createFolder(token) {
  const res = await authFetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  }, token);
  if (!res.ok) throw new Error(`Could not create the cakeculator folder (${res.status}).`);
  return (await res.json()).id;
}

async function findFileId(fileName, folderId, token) {
  const q = encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`);
  const res = await authFetch(`${API}?q=${q}&orderBy=modifiedTime desc&pageSize=1`, {}, token);
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

// Write `data` as JSON to <cakeculator>/<fileName>, creating the folder/file or
// overwriting the existing file in place (keeping its id, so links stay stable).
export async function saveScrobblesToDrive(fileName, data) {
  const token = getAccessToken();
  if (!token) throw new Error('Not connected to Google Drive.');

  let folderId = await findFolderId(token);
  if (!folderId) folderId = await createFolder(token);
  const existingId = await findFileId(fileName, folderId, token);

  const boundary = '-------cakeculator' + Date.now();
  // On update, don't resend parents/name — that keeps the file in place.
  const metadata = existingId
    ? { mimeType: 'application/json' }
    : { name: fileName, parents: [folderId], mimeType: 'application/json' };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(data) +
    `\r\n--${boundary}--`;

  const url = existingId
    ? `${UPLOAD_API}/${existingId}?uploadType=multipart`
    : `${UPLOAD_API}?uploadType=multipart`;
  const res = await authFetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  }, token);
  if (!res.ok) throw new Error(`Save to Google Drive failed (${res.status}).`);
  return await res.json();
}

// Read <cakeculator>/<fileName> back as parsed JSON. Returns null if the folder
// or file doesn't exist yet (i.e. nothing has been saved).
export async function loadScrobblesFromDrive(fileName) {
  const token = getAccessToken();
  if (!token) throw new Error('Not connected to Google Drive.');

  const folderId = await findFolderId(token);
  if (!folderId) return null;
  const fileId = await findFileId(fileName, folderId, token);
  if (!fileId) return null;

  const res = await authFetch(`${API}/${fileId}?alt=media`, {}, token);
  if (!res.ok) throw new Error(`Load from Google Drive failed (${res.status}).`);
  return await res.json();
}
