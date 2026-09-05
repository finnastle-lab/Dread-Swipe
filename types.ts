export type PrimaryVibe = 
  | 'Elevated'
  | 'Body Horror'
  | 'Folk / Ritual'
  | 'Prestige Crime'
  | 'Cerebral Sci-Fi'
  | 'International Arthouse'
  | 'Sicko Mode';

export type DreadIntensity = 1 | 2 | 3 | 4 | 5; 
// 1 = Unsettling, 2 = Bleak, 3 = Transgressive, 4 = Punishing, 5 = Sicko Mode

export type PacingPreference = 'all' | 'slow_burn' | 'immediate';
export type GorePreference = 'all' | 'practical_gore' | 'psychological';

export interface Movie {
  id: number;
  title: string;
  year: number | string;
  overview: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  director?: string;
  dreadScore: DreadIntensity; // 1-5
  vibes: PrimaryVibe[];
  subgenres?: string[];
  pacing?: 'slow_burn' | 'immediate';
  goreType?: 'practical_gore' | 'psychological';
  isInternational?: boolean;
  isSickoTier?: boolean;
  tagline?: string;
  runtime?: string;
  trailerUrl?: string;
}

export enum SwipeDirection {
  LEFT = 'left',      // Disliked / Passed (Rotten)
  RIGHT = 'right',    // Liked / Watched
  UP = 'up',          // SICKO MODE / 5-Star Anchor (Super Like)
  DOWN = 'down'       // Watchlist / Queue
}

export interface SwipedMovieRecord {
  movie: Movie;
  direction: SwipeDirection;
  timestamp: string;
  notes?: string;
}

export interface UserHistory {
  watched: SwipedMovieRecord[];
  disliked: SwipedMovieRecord[];
  watchlist: SwipedMovieRecord[];
  sickoMode: SwipedMovieRecord[];
}

export interface FilterState {
  selectedVibes: PrimaryVibe[];
  minDread: DreadIntensity;
  maxDread: DreadIntensity;
  pacing: PacingPreference;
  gore: GorePreference;
  subtitledOk: boolean;
  noHorrorComedy: boolean; // Hard exclude comedy/gimmick horror
  searchQuery: string;
}

export interface OnboardingPreferences {
  vibes: PrimaryVibe[];
  dreadIntensity: DreadIntensity;
  noHorrorComedy: boolean;
  subtitledOk: boolean;
}

export interface GoogleSheetsSyncState {
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: string | null;
  autoSyncEnabled: boolean;
  recordCount: number;
}
