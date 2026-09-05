import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Movie, SwipeDirection, SwipedMovieRecord, UserHistory, DreadIntensity } from '../types';
import { DREAD_LEVELS, CURATED_MOVIES } from '../constants';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Workspace OAuth Scopes configured for Google Sheets and Drive
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly'
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

// In-memory token cache (MANDATORY: NEVER save access token in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const MASTER_SHEET_TITLE = 'DreadSwipe - Horror Movie Vault';
const SHEET_TAB_NAME = 'Vault';
const HEADERS = [
  'Movie ID',
  'Title',
  'Year',
  'Director',
  'Dread Level',
  'Dread Score (1-5)',
  'Primary Vibes',
  'Status',
  'Logged At',
  'Overview'
];

// Persistent metadata storage keys (non-sensitive)
const CONFIG_STORAGE_KEY = 'dread_sheets_sync_meta_v1';

export interface StoredSheetMeta {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt: string;
  autoSync: boolean;
}

export const getStoredSheetMeta = (): StoredSheetMeta | null => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStoredSheetMeta = (meta: StoredSheetMeta | null): void => {
  try {
    if (meta) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(meta));
    } else {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save sheet meta:', e);
  }
};

/**
 * Initialize Google Auth State Listener
 */
export const initGoogleAuth = (
  onUserChanged: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // In-memory access token is available after popup
      if (cachedAccessToken) {
        onUserChanged(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is logged into Firebase Auth, but in-memory OAuth token was cleared on page reload.
        // We will signal the user is logged in, and if an API call needs fresh token, we can trigger sign-in popup.
        onUserChanged(user, null);
      }
    } else {
      cachedAccessToken = null;
      onUserChanged(null, null);
    }
  });
};

/**
 * Sign In with Google via popup to obtain OAuth token
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Google did not return an access token for Sheets. Please grant the requested permissions.');
    }

    cachedAccessToken = accessToken;
    return { user: result.user, accessToken };
  } catch (err: any) {
    console.error('Sign in error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => cachedAccessToken;

export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/* =========================================================================
   GOOGLE SHEETS & DRIVE API OPERATIONS
   ========================================================================= */

/**
 * Helper to call Google APIs with Bearer authorization
 */
async function callGoogleApi<T = any>(
  url: string,
  options: RequestInit = {},
  token: string
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(`Google API Error (${res.status}): ${errorDetail}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Ensures the master Google Spreadsheet exists on the user's Drive.
 * Either connects to an existing sheet or creates a new "DreadSwipe - Horror Movie Vault".
 */
export const ensureMasterSpreadsheet = async (
  token: string,
  preferredSpreadsheetId?: string
): Promise<{ spreadsheetId: string; title: string; url: string }> => {
  // 1. If user specified an existing spreadsheet ID
  if (preferredSpreadsheetId && preferredSpreadsheetId.trim().length > 5) {
    const cleanId = preferredSpreadsheetId.trim();
    try {
      const sheetData = await callGoogleApi(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,properties.title`,
        {},
        token
      );
      const title = sheetData.properties?.title || 'DreadSwipe Horror Vault';
      const url = `https://docs.google.com/spreadsheets/d/${cleanId}`;
      
      // Ensure Vault tab exists
      await ensureVaultSheetTab(token, cleanId);

      return { spreadsheetId: cleanId, title, url };
    } catch (err) {
      console.warn('Preferred spreadsheet ID not accessible, falling back to search/create:', err);
    }
  }

  // 2. Check if user already has a saved sheet ID in localStorage
  const savedMeta = getStoredSheetMeta();
  if (savedMeta?.spreadsheetId) {
    try {
      const sheetData = await callGoogleApi(
        `https://sheets.googleapis.com/v4/spreadsheets/${savedMeta.spreadsheetId}?fields=spreadsheetId,properties.title`,
        {},
        token
      );
      return {
        spreadsheetId: savedMeta.spreadsheetId,
        title: sheetData.properties?.title || savedMeta.spreadsheetTitle || MASTER_SHEET_TITLE,
        url: savedMeta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${savedMeta.spreadsheetId}`
      };
    } catch (e) {
      console.warn('Saved spreadsheet ID no longer valid, creating/searching:', e);
    }
  }

  // 3. Search Google Drive for existing sheet by name
  try {
    const query = encodeURIComponent(`name = '${MASTER_SHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const searchRes = await callGoogleApi(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
      {},
      token
    );

    if (searchRes.files && searchRes.files.length > 0) {
      const file = searchRes.files[0];
      const spreadsheetId = file.id;
      const title = file.name;
      const url = file.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      await ensureVaultSheetTab(token, spreadsheetId);
      return { spreadsheetId, title, url };
    }
  } catch (err) {
    console.warn('Drive search failed or permission not granted, will create a new sheet:', err);
  }

  // 4. Create new Google Spreadsheet
  const createPayload = {
    properties: {
      title: MASTER_SHEET_TITLE
    },
    sheets: [
      {
        properties: {
          title: SHEET_TAB_NAME,
          gridProperties: {
            frozenRowCount: 1
          }
        }
      }
    ]
  };

  const newSheet = await callGoogleApi(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      body: JSON.stringify(createPayload)
    },
    token
  );

  const spreadsheetId = newSheet.spreadsheetId;
  const title = newSheet.properties?.title || MASTER_SHEET_TITLE;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // Populate header row
  await callGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_TAB_NAME)}!A1:J1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      body: JSON.stringify({
        values: [HEADERS]
      })
    },
    token
  );

  return { spreadsheetId, title, url };
};

/**
 * Ensures the Vault tab with header row exists in the spreadsheet
 */
async function ensureVaultSheetTab(token: string, spreadsheetId: string): Promise<void> {
  try {
    const meta = await callGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {},
      token
    );
    const tabs: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);
    
    // If Vault tab doesn't exist, create it
    if (!tabs.includes(SHEET_TAB_NAME)) {
      await callGoogleApi(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: SHEET_TAB_NAME,
                    gridProperties: { frozenRowCount: 1 }
                  }
                }
              }
            ]
          })
        },
        token
      );

      // Append header row
      await callGoogleApi(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_TAB_NAME)}!A1:J1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          body: JSON.stringify({
            values: [HEADERS]
          })
        },
        token
      );
    }
  } catch (err) {
    console.warn('Could not inspect tabs or create Vault tab:', err);
  }
}

/**
 * Parses all movie rows from the master Google Sheet.
 * Returns a structured UserHistory object with watched, sickoMode, watchlist, and disliked lists.
 */
export const fetchMoviesFromMasterSheet = async (
  token: string,
  spreadsheetId: string
): Promise<{ history: UserHistory; totalCount: number }> => {
  const history: UserHistory = {
    watched: [],
    disliked: [],
    watchlist: [],
    sickoMode: []
  };

  try {
    const range = `${SHEET_TAB_NAME}!A2:J`;
    const res = await callGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`,
      {},
      token
    );

    const rows: any[][] = res.values || [];
    if (rows.length === 0) {
      return { history, totalCount: 0 };
    }

    rows.forEach((row, index) => {
      // Row schema: [0: id, 1: title, 2: year, 3: director, 4: dreadLabel, 5: dreadScore, 6: vibes, 7: status, 8: timestamp, 9: overview]
      const rawId = row[0];
      const title = String(row[1] || '').trim();
      if (!title) return;

      const year = row[2] || '';
      const director = String(row[3] || '');
      const dreadScoreNum = Number(row[5]) || 3;
      const dreadScore: DreadIntensity = (Math.min(5, Math.max(1, Math.round(dreadScoreNum))) as DreadIntensity);
      
      const vibesStr = String(row[6] || '');
      const vibes = vibesStr
        ? vibesStr.split(',').map(v => v.trim() as any).filter(Boolean)
        : ['Elevated' as const];

      const status = String(row[7] || '').toLowerCase();
      const timestamp = String(row[8] || new Date().toISOString());
      const overview = String(row[9] || 'From master Google Sheet vault');

      const movieId = Number(rawId) || (800000 + index);

      // Check if matches curated movie for high-res poster and metadata
      const matchedCurated = CURATED_MOVIES.find(
        m => m.id === movieId || m.title.toLowerCase() === title.toLowerCase()
      );

      const movie: Movie = matchedCurated || {
        id: movieId,
        title,
        year,
        director,
        dreadScore,
        vibes,
        overview,
        poster_path: '',
        vote_average: 7.0
      };

      let direction = SwipeDirection.RIGHT;
      if (status.includes('sicko')) {
        direction = SwipeDirection.UP;
      } else if (status.includes('watch') || status.includes('queue')) {
        direction = SwipeDirection.DOWN;
      } else if (status.includes('dislike') || status.includes('rotten') || status.includes('pass')) {
        direction = SwipeDirection.LEFT;
      }

      const record: SwipedMovieRecord = {
        movie,
        direction,
        timestamp
      };

      if (direction === SwipeDirection.UP) {
        history.sickoMode.push(record);
        history.watched.push(record);
      } else if (direction === SwipeDirection.DOWN) {
        history.watchlist.push(record);
      } else if (direction === SwipeDirection.LEFT) {
        history.disliked.push(record);
      } else {
        history.watched.push(record);
      }
    });

    const totalCount = history.watched.length + history.watchlist.length + history.disliked.length;
    return { history, totalCount };
  } catch (err: any) {
    console.error('Failed to fetch from master sheet:', err);
    throw err;
  }
};

/**
 * Appends a single movie swipe to the master Google Sheet in real-time.
 */
export const appendSwipeToMasterSheet = async (
  token: string,
  spreadsheetId: string,
  movie: Movie,
  direction: SwipeDirection,
  timestamp: string = new Date().toISOString()
): Promise<void> => {
  const dreadLabel = DREAD_LEVELS[movie.dreadScore]?.label || 'Unsettling';
  let status = '🩸 Liked / Watched';
  if (direction === SwipeDirection.UP) {
    status = '🔥 SICKO MODE (Must Watch)';
  } else if (direction === SwipeDirection.DOWN) {
    status = '🔖 Watchlist / Queue';
  } else if (direction === SwipeDirection.LEFT) {
    status = '⛔ Passed / Rotten';
  }

  const cleanOverview = (movie.overview || '').replace(/[\t\n\r]+/g, ' ').slice(0, 300);
  const vibesStr = (movie.vibes || []).join(', ');

  const rowData = [
    movie.id,
    movie.title,
    movie.year,
    movie.director || 'Unknown',
    dreadLabel,
    movie.dreadScore,
    vibesStr,
    status,
    timestamp,
    cleanOverview
  ];

  const range = `${SHEET_TAB_NAME}!A:J`;
  await callGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      body: JSON.stringify({
        values: [rowData]
      })
    },
    token
  );
};

/**
 * Batches local history to the Google Sheet (useful for initial synchronization)
 */
export const syncAllLocalHistoryToSheet = async (
  token: string,
  spreadsheetId: string,
  localHistory: UserHistory
): Promise<{ syncedCount: number }> => {
  // First, fetch existing IDs in the sheet to prevent duplicates
  const { history: existingSheetHistory } = await fetchMoviesFromMasterSheet(token, spreadsheetId);
  const existingIds = new Set<number>();
  const existingTitles = new Set<string>();

  [
    ...existingSheetHistory.watched,
    ...existingSheetHistory.sickoMode,
    ...existingSheetHistory.watchlist,
    ...existingSheetHistory.disliked
  ].forEach(r => {
    existingIds.add(r.movie.id);
    existingTitles.add(r.movie.title.toLowerCase().trim());
  });

  const rowsToAppend: any[][] = [];

  const allLocalRecords = [
    ...localHistory.sickoMode,
    ...localHistory.watched.filter(r => r.direction !== SwipeDirection.UP),
    ...localHistory.watchlist,
    ...localHistory.disliked
  ];

  allLocalRecords.forEach(r => {
    const m = r.movie;
    const titleKey = m.title.toLowerCase().trim();
    if (existingIds.has(m.id) || existingTitles.has(titleKey)) {
      return; // Already in Google Sheet
    }

    const dreadLabel = DREAD_LEVELS[m.dreadScore]?.label || 'Unsettling';
    let status = '🩸 Liked / Watched';
    if (r.direction === SwipeDirection.UP) {
      status = '🔥 SICKO MODE (Must Watch)';
    } else if (r.direction === SwipeDirection.DOWN) {
      status = '🔖 Watchlist / Queue';
    } else if (r.direction === SwipeDirection.LEFT) {
      status = '⛔ Passed / Rotten';
    }

    const cleanOverview = (m.overview || '').replace(/[\t\n\r]+/g, ' ').slice(0, 300);
    const vibesStr = (m.vibes || []).join(', ');

    rowsToAppend.push([
      m.id,
      m.title,
      m.year,
      m.director || 'Unknown',
      dreadLabel,
      m.dreadScore,
      vibesStr,
      status,
      r.timestamp || new Date().toISOString(),
      cleanOverview
    ]);

    existingIds.add(m.id);
    existingTitles.add(titleKey);
  });

  if (rowsToAppend.length > 0) {
    const range = `${SHEET_TAB_NAME}!A:J`;
    await callGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({
          values: rowsToAppend
        })
      },
      token
    );
  }

  return { syncedCount: rowsToAppend.length };
};

/**
 * Remove or clear movie record in sheet with explicit confirmation
 */
export const removeMovieRowFromSheet = async (
  token: string,
  spreadsheetId: string,
  movieId: number
): Promise<boolean> => {
  try {
    const range = `${SHEET_TAB_NAME}!A2:J`;
    const res = await callGoogleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`,
      {},
      token
    );
    const rows: any[][] = res.values || [];
    const rowIndex = rows.findIndex(row => Number(row[0]) === movieId);

    if (rowIndex !== -1) {
      // Clear row or update status to [Removed]
      const actualRowNumber = rowIndex + 2; // +1 for 0-index, +1 for header
      const rowRange = `${SHEET_TAB_NAME}!H${actualRowNumber}`;
      await callGoogleApi(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            values: [['[REMOVED]']]
          })
        },
        token
      );
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Failed to update removed record in sheet:', err);
    return false;
  }
};
