import { SwipeDirection, Movie, SwipedMovieRecord, UserHistory } from '../types';
import { DREAD_LEVELS, CURATED_MOVIES } from '../constants';

const STORAGE_KEY = 'dread_user_history_v2';

export const getLocalHistory = (): UserHistory => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { watched: [], disliked: [], watchlist: [], sickoMode: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      watched: parsed.watched || [],
      disliked: parsed.disliked || [],
      watchlist: parsed.watchlist || [],
      sickoMode: parsed.sickoMode || []
    };
  } catch (e) {
    console.error('Failed to parse local history:', e);
    return { watched: [], disliked: [], watchlist: [], sickoMode: [] };
  }
};

export const saveLocalHistory = (history: UserHistory): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save local history:', e);
  }
};

export const recordSwipe = async (movie: Movie, direction: SwipeDirection): Promise<UserHistory> => {
  const history = getLocalHistory();
  const record: SwipedMovieRecord = {
    movie,
    direction,
    timestamp: new Date().toISOString()
  };

  // Remove existing occurrences of this movie
  history.watched = history.watched.filter(r => r.movie.id !== movie.id);
  history.disliked = history.disliked.filter(r => r.movie.id !== movie.id);
  history.watchlist = history.watchlist.filter(r => r.movie.id !== movie.id);
  history.sickoMode = history.sickoMode.filter(r => r.movie.id !== movie.id);

  if (direction === SwipeDirection.RIGHT) {
    history.watched.unshift(record);
  } else if (direction === SwipeDirection.LEFT) {
    history.disliked.unshift(record);
  } else if (direction === SwipeDirection.DOWN) {
    history.watchlist.unshift(record);
  } else if (direction === SwipeDirection.UP) {
    history.sickoMode.unshift(record);
    history.watched.unshift(record); // Also counts in watched
  }

  saveLocalHistory(history);
  return history;
};

export const undoLastSwipe = async (lastRecord: SwipedMovieRecord): Promise<UserHistory> => {
  const history = getLocalHistory();
  const mId = lastRecord.movie.id;

  history.watched = history.watched.filter(r => r.movie.id !== mId);
  history.disliked = history.disliked.filter(r => r.movie.id !== mId);
  history.watchlist = history.watchlist.filter(r => r.movie.id !== mId);
  history.sickoMode = history.sickoMode.filter(r => r.movie.id !== mId);

  saveLocalHistory(history);
  return history;
};

export const clearAllHistory = (): UserHistory => {
  const empty: UserHistory = { watched: [], disliked: [], watchlist: [], sickoMode: [] };
  localStorage.removeItem(STORAGE_KEY);
  return empty;
};

/* =========================================================================
   IMPORT WATCHED FILMS (Letterboxd CSV / Plain Text list)
   Prevents double-ups on deck recommendations and download exports
   ========================================================================= */

const normalizeTitle = (str: string) => {
  return str
    .toLowerCase()
    .replace(/^["']|["']$/g, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  matchedCuratedCount: number;
  newHistory: UserHistory;
}

export const importWatchedList = (rawInput: string): ImportResult => {
  const history = getLocalHistory();
  const existingIds = new Set<number>();
  const existingTitles = new Set<string>();

  [...history.watched, ...history.sickoMode, ...history.watchlist].forEach(r => {
    existingIds.add(r.movie.id);
    existingTitles.add(normalizeTitle(r.movie.title));
  });

  const lines = rawInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let importedCount = 0;
  let skippedCount = 0;
  let matchedCuratedCount = 0;

  // Check if it's a Letterboxd or standard CSV (first line has headers)
  const isCSV = lines.length > 0 && (lines[0].includes(',') || lines[0].includes('\t'));
  let titleColIdx = 0;
  let yearColIdx = 1;
  let startIndex = 0;

  if (isCSV && lines[0].toLowerCase().includes('title')) {
    const headers = lines[0].split(/,|\t/).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    titleColIdx = headers.findIndex(h => h === 'title' || h === 'name' || h === 'film');
    if (titleColIdx === -1) titleColIdx = 0;
    yearColIdx = headers.findIndex(h => h === 'year' || h === 'release_year');
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let rawTitle = '';
    let rawYear: number | string = '';

    if (isCSV) {
      // Split by comma ignoring quotes
      const match = line.match(/(".*?"|[^",\t]+)(?=\s*,|\s*\t|\s*$)/g);
      const cols = match ? match.map(c => c.replace(/^["']|["']$/g, '').trim()) : line.split(/,|\t/);
      rawTitle = cols[titleColIdx] || '';
      if (yearColIdx !== -1 && cols[yearColIdx]) {
        rawYear = cols[yearColIdx];
      }
    } else {
      // Plain text list: e.g. "The Substance (2024)" or "1. Martyrs" or "Titane"
      let cleanLine = line.replace(/^\d+[\.\)\-]\s*/, '').trim(); // Remove leading numbers
      const yearMatch = cleanLine.match(/\((\d{4})\)|\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        rawYear = yearMatch[1] || yearMatch[2];
        cleanLine = cleanLine.replace(/\(\d{4}\)/, '').trim();
      }
      rawTitle = cleanLine;
    }

    if (!rawTitle) continue;

    const norm = normalizeTitle(rawTitle);
    if (!norm) continue;

    // Check if already in history
    if (existingTitles.has(norm)) {
      skippedCount++;
      continue;
    }

    // Try to match against curated catalog first
    const matched = CURATED_MOVIES.find(m => {
      const curNorm = normalizeTitle(m.title);
      if (curNorm === norm) {
        if (rawYear && m.year) {
          return String(m.year) === String(rawYear);
        }
        return true;
      }
      return false;
    });

    let movieToAdd: Movie;

    if (matched) {
      movieToAdd = matched;
      matchedCuratedCount++;
    } else {
      // Create imported movie record
      const randomId = 900000 + Math.floor(Math.random() * 99999);
      movieToAdd = {
        id: randomId,
        title: rawTitle,
        year: rawYear || new Date().getFullYear(),
        overview: 'Imported from user watched history dossier.',
        poster_path: '',
        vote_average: 7.0,
        dreadScore: 3,
        vibes: ['Elevated'],
        director: 'Imported'
      };
    }

    const record: SwipedMovieRecord = {
      movie: movieToAdd,
      direction: SwipeDirection.RIGHT,
      timestamp: new Date().toISOString()
    };

    history.watched.unshift(record);
    existingIds.add(movieToAdd.id);
    existingTitles.add(norm);
    importedCount++;
  }

  saveLocalHistory(history);

  return {
    importedCount,
    skippedCount,
    matchedCuratedCount,
    newHistory: history
  };
};

/* =========================================================================
   EXPORT FORMATTERS (Letterboxd CSV, Sheets TSV, Markdown Slab, Plain Text)
   ========================================================================= */

/**
 * Generates Letterboxd Import compliant CSV.
 * Columns: Title, Year, Rating10, WatchedDate, Tags, Review
 */
export const generateLetterboxdCSV = (records: SwipedMovieRecord[]): string => {
  const headers = ['Title', 'Year', 'Rating10', 'WatchedDate', 'Tags', 'Review'];
  const rows = records.map(r => {
    const m = r.movie;
    const isSicko = r.direction === SwipeDirection.UP || m.dreadScore === 5;
    const rating10 = isSicko ? 10 : Math.round(m.dreadScore * 2);
    const dateStr = r.timestamp ? r.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
    const tags = [
      'dreadswipe',
      ...m.vibes.map(v => v.toLowerCase().replace(/[\s\/]+/g, '-')),
      `dread-${m.dreadScore}`,
      isSicko ? 'sicko-mode' : ''
    ].filter(Boolean).join(' ');

    const cleanTitle = `"${m.title.replace(/"/g, '""')}"`;
    const review = `"[DreadSwipe: ${DREAD_LEVELS[m.dreadScore]?.label || 'Dread'}] ${m.tagline || m.overview.slice(0, 100)}..."`;

    return [cleanTitle, m.year, rating10, dateStr, `"${tags}"`, review].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Generates Tab-Separated Values (TSV) ready to paste directly into Google Sheets or Excel.
 */
export const generateSheetsTSV = (records: SwipedMovieRecord[]): string => {
  const headers = ['Title', 'Year', 'Director', 'Dread Level', 'Dread Score (1-5)', 'Primary Vibes', 'Status', 'Logged At', 'Synopsis'];
  const rows = records.map(r => {
    const m = r.movie;
    const status = r.direction === SwipeDirection.UP 
      ? '🔥 SICKO MODE (Must Watch)' 
      : r.direction === SwipeDirection.DOWN 
        ? '🔖 Watchlist / Queue' 
        : '🩸 Liked / Watched';
    
    const dreadLabel = DREAD_LEVELS[m.dreadScore]?.label || 'Unsettling';
    const cleanOverview = m.overview.replace(/[\t\n\r]+/g, ' ');
    const dateStr = r.timestamp ? r.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];

    return [
      m.title,
      m.year,
      m.director || 'Unknown',
      dreadLabel,
      m.dreadScore,
      m.vibes.join(', '),
      status,
      dateStr,
      cleanOverview
    ].join('\t');
  });

  return [headers.join('\t'), ...rows].join('\n');
};

/**
 * Generates formatted Markdown block.
 */
export const generateMarkdownSlab = (records: SwipedMovieRecord[], listName: string = "DREADSWIPE VAULT"): string => {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let md = `# 🩸 ${listName} (${records.length} Films)\n`;
  md += `*Generated by DreadSwipe on ${dateStr} — Craft over cheap scares.*\n\n`;
  md += `---\n\n`;

  records.forEach((r, i) => {
    const m = r.movie;
    const isSicko = r.direction === SwipeDirection.UP || m.dreadScore === 5;
    const badge = isSicko ? '🔥 **[SICKO MODE]**' : `🩸 **[Dread: ${DREAD_LEVELS[m.dreadScore]?.label || 'Elevated'}]**`;
    
    md += `### ${i + 1}. ${m.title} (${m.year}) ${badge}\n`;
    if (m.director) md += `- **Director:** ${m.director}\n`;
    md += `- **Vibes:** ${m.vibes.map(v => `\`${v}\``).join(' ')}\n`;
    md += `- **Intensity:** ${DREAD_LEVELS[m.dreadScore]?.skulls || '🩸'} (${m.dreadScore}/5)\n`;
    if (m.tagline) md += `> *"${m.tagline}"*\n`;
    md += `\n${m.overview}\n\n`;
  });

  return md;
};

/**
 * Generates clean Plain Text list.
 */
export const generatePlainText = (records: SwipedMovieRecord[]): string => {
  return records.map((r, i) => {
    const m = r.movie;
    const extra = r.direction === SwipeDirection.UP ? ' [SICKO MODE]' : '';
    return `${i + 1}. ${m.title} (${m.year})${m.director ? ` - dir. ${m.director}` : ''} [${DREAD_LEVELS[m.dreadScore]?.label || 'Dread'}]${extra}`;
  }).join('\n');
};
