import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Movie, 
  SwipeDirection, 
  UserHistory, 
  FilterState, 
  OnboardingPreferences, 
  SwipedMovieRecord,
  GoogleSheetsSyncState 
} from './types';
import { CURATED_MOVIES, PRIMARY_VIBES, APP_NAME, IMAGE_BASE_URL } from './constants';
import { fetchRecommendations, discoverDynamicMovies } from './services/tmdbService';
import { 
  recordSwipe, 
  undoLastSwipe, 
  getLocalHistory, 
  clearAllHistory 
} from './services/sheetsService';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  ensureMasterSpreadsheet,
  fetchMoviesFromMasterSheet,
  appendSwipeToMasterSheet,
  syncAllLocalHistoryToSheet,
  getStoredSheetMeta,
  saveStoredSheetMeta,
  getAccessToken
} from './services/googleSheetsSyncService';
import MovieCard from './components/MovieCard';
import OnboardingModal from './components/OnboardingModal';
import SearchFlowModal from './components/SearchFlowModal';
import ExportVaultModal from './components/ExportVaultModal';
import HistoryDrawer from './components/HistoryDrawer';
import FilterBar from './components/FilterBar';
import GoogleSheetsModal from './components/GoogleSheetsModal';
import { 
  Flame, 
  Heart, 
  Bookmark, 
  X, 
  Undo2, 
  Share2, 
  Layers, 
  RotateCcw,
  CheckCircle2,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ToastNotice {
  id: number;
  message: string;
  subtext?: string;
  type: 'liked' | 'sicko' | 'watchlist' | 'rotten';
}

const normalizeTitle = (str: string) => {
  return str
    .toLowerCase()
    .replace(/^["']|["']$/g, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const App: React.FC = () => {
  // Swiping stack & history state
  const [stack, setStack] = useState<Movie[]>([]);
  const [history, setHistory] = useState<UserHistory>({ watched: [], disliked: [], watchlist: [], sickoMode: [] });
  const [loading, setLoading] = useState(true);
  const [isDiscoveringMore, setIsDiscoveringMore] = useState(false);
  const [discoveryPage, setDiscoveryPage] = useState(1);
  const [lastAction, setLastAction] = useState<SwipedMovieRecord | null>(null);

  // Notifications & UI feedback
  const [toastNotice, setToastNotice] = useState<ToastNotice | null>(null);
  const [vaultBump, setVaultBump] = useState(false);

  // Modals & Drawers
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSearchFlowModal, setShowSearchFlowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);

  // Google Sheets Master Sync State
  const [sheetsSyncState, setSheetsSyncState] = useState<GoogleSheetsSyncState>(() => {
    const saved = getStoredSheetMeta();
    return {
      isConnected: false,
      userEmail: null,
      userName: null,
      userPhoto: null,
      spreadsheetId: saved?.spreadsheetId || null,
      spreadsheetUrl: saved?.spreadsheetUrl || null,
      spreadsheetTitle: saved?.spreadsheetTitle || null,
      lastSyncedAt: saved?.lastSyncedAt || null,
      isSyncing: false,
      syncError: null,
      autoSyncEnabled: saved?.autoSync !== false,
      recordCount: 0
    };
  });

  // Active Filters
  const [filters, setFilters] = useState<FilterState>({
    selectedVibes: ['Elevated', 'Body Horror', 'Folk / Ritual', 'Prestige Crime', 'Sicko Mode'],
    minDread: 1,
    maxDread: 5,
    pacing: 'all',
    gore: 'all',
    subtitledOk: true,
    noHorrorComedy: true,
    searchQuery: ''
  });

  const seenIds = useRef<Set<number>>(new Set());
  const seenTitles = useRef<Set<string>>(new Set());

  // Helper to trigger temporary toast
  const triggerToast = useCallback((notice: Omit<ToastNotice, 'id'>) => {
    const id = Date.now();
    setToastNotice({ ...notice, id });
    setTimeout(() => {
      setToastNotice(prev => (prev?.id === id ? null : prev));
    }, 3200);
  }, []);

  // Refresh history from local storage
  const reloadHistory = useCallback(() => {
    const hist = getLocalHistory();
    setHistory(hist);
    [...hist.watched, ...hist.disliked, ...hist.watchlist, ...hist.sickoMode].forEach(r => {
      seenIds.current.add(r.movie.id);
      if (r.movie.title) {
        seenTitles.current.add(normalizeTitle(r.movie.title));
      }
    });
  }, []);

  // Master Sheet Sync Routine (Persistent memory across devices)
  const syncWithMasterSheet = useCallback(async (token: string, preferredSpreadsheetId?: string) => {
    setSheetsSyncState(prev => ({ ...prev, isSyncing: true, syncError: null }));
    try {
      // 1. Ensure master spreadsheet exists or use specified custom ID
      const sheetInfo = await ensureMasterSpreadsheet(token, preferredSpreadsheetId);

      // 2. Fetch all movie records already in the master sheet
      const { history: sheetHistory, totalCount } = await fetchMoviesFromMasterSheet(token, sheetInfo.spreadsheetId);

      // 3. Mark all sheet films in seen sets to eliminate duplicates permanently
      [
        ...sheetHistory.watched,
        ...sheetHistory.sickoMode,
        ...sheetHistory.watchlist,
        ...sheetHistory.disliked
      ].forEach(r => {
        seenIds.current.add(r.movie.id);
        if (r.movie.title) {
          seenTitles.current.add(normalizeTitle(r.movie.title));
        }
      });

      // 4. Batch push any local swipes that aren't yet in the sheet
      const currentLocal = getLocalHistory();
      const { syncedCount } = await syncAllLocalHistoryToSheet(token, sheetInfo.spreadsheetId, currentLocal);

      // 5. Merge into local history state
      sheetHistory.watched.forEach(r => {
        if (!currentLocal.watched.some(w => w.movie.id === r.movie.id)) {
          currentLocal.watched.push(r);
        }
      });
      sheetHistory.sickoMode.forEach(r => {
        if (!currentLocal.sickoMode.some(w => w.movie.id === r.movie.id)) {
          currentLocal.sickoMode.push(r);
        }
      });
      sheetHistory.watchlist.forEach(r => {
        if (!currentLocal.watchlist.some(w => w.movie.id === r.movie.id)) {
          currentLocal.watchlist.push(r);
        }
      });
      sheetHistory.disliked.forEach(r => {
        if (!currentLocal.disliked.some(w => w.movie.id === r.movie.id)) {
          currentLocal.disliked.push(r);
        }
      });

      setHistory({ ...currentLocal });
      try {
        localStorage.setItem('dread_user_history', JSON.stringify(currentLocal));
      } catch (e) {}

      // 6. Exclude any watched/sheet films from the current swipe deck immediately!
      setStack(prev => prev.filter(m => !seenIds.current.has(m.id) && !seenTitles.current.has(normalizeTitle(m.title))));

      const now = new Date().toISOString();
      const totalRecords = totalCount + syncedCount;

      saveStoredSheetMeta({
        spreadsheetId: sheetInfo.spreadsheetId,
        spreadsheetTitle: sheetInfo.title,
        spreadsheetUrl: sheetInfo.url,
        lastSyncedAt: now,
        autoSync: true
      });

      setSheetsSyncState(prev => ({
        ...prev,
        isConnected: true,
        spreadsheetId: sheetInfo.spreadsheetId,
        spreadsheetTitle: sheetInfo.title,
        spreadsheetUrl: sheetInfo.url,
        lastSyncedAt: now,
        isSyncing: false,
        recordCount: totalRecords
      }));

      triggerToast({
        message: 'Google Sheets Vault Synchronized',
        subtext: `${totalRecords} films in master sheet • Zero duplicates in deck`,
        type: 'liked'
      });
    } catch (err: any) {
      console.error('Master sheet sync error:', err);
      setSheetsSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: err.message || 'Failed to sync with master Google Sheet'
      }));
      throw err;
    }
  }, [triggerToast]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(async (user, token) => {
      if (user) {
        setSheetsSyncState(prev => ({
          ...prev,
          isConnected: true,
          userEmail: user.email,
          userName: user.displayName,
          userPhoto: user.photoURL
        }));

        if (token) {
          try {
            await syncWithMasterSheet(token);
          } catch (e) {
            console.warn('Initial sync with Google Sheet on auth ready failed:', e);
          }
        }
      } else {
        setSheetsSyncState(prev => ({
          ...prev,
          isConnected: false,
          userEmail: null,
          userName: null,
          userPhoto: null
        }));
      }
    });
    return () => unsubscribe();
  }, [syncWithMasterSheet]);

  const handleGoogleSignIn = async () => {
    const { user, accessToken } = await signInWithGoogle();
    setSheetsSyncState(prev => ({
      ...prev,
      isConnected: true,
      userEmail: user.email,
      userName: user.displayName,
      userPhoto: user.photoURL
    }));
    await syncWithMasterSheet(accessToken);
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setSheetsSyncState(prev => ({
      ...prev,
      isConnected: false,
      userEmail: null,
      userName: null,
      userPhoto: null
    }));
    triggerToast({
      message: 'Signed Out of Google Sheets',
      subtext: 'Swipes will be preserved in local browser storage',
      type: 'rotten'
    });
  };

  const handleGoogleSyncNow = async () => {
    let token = getAccessToken();
    if (!token) {
      const res = await signInWithGoogle();
      token = res.accessToken;
    }
    await syncWithMasterSheet(token);
  };

  const handleLinkCustomSheet = async (sheetIdOrUrl: string) => {
    let token = getAccessToken();
    if (!token) {
      const res = await signInWithGoogle();
      token = res.accessToken;
    }
    const match = sheetIdOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = match ? match[1] : sheetIdOrUrl.trim();
    await syncWithMasterSheet(token, cleanId);
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setSheetsSyncState(prev => {
      const next = { ...prev, autoSyncEnabled: enabled };
      const saved = getStoredSheetMeta();
      if (saved) {
        saveStoredSheetMeta({ ...saved, autoSync: enabled });
      }
      return next;
    });
  };

  // Filter movies against user filter criteria
  const filterMovie = useCallback((m: Movie): boolean => {
    if (filters.minDread > 1 && m.dreadScore < filters.minDread) return false;
    if (filters.maxDread < 5 && m.dreadScore > filters.maxDread) return false;
    const hasMatchingVibe = m.vibes.some(v => filters.selectedVibes.includes(v));
    if (!hasMatchingVibe) return false;

    if (filters.noHorrorComedy) {
      const isComedy = m.subgenres?.some(s => s.toLowerCase().includes('comedy')) ||
                       m.overview.toLowerCase().includes('horror-comedy') ||
                       m.overview.toLowerCase().includes('dark comedy') ||
                       m.overview.toLowerCase().includes('hilarious');
      if (isComedy) return false;
    }

    return true;
  }, [filters]);

  // Image preloader helper (Ensures crisp posters render without layout shift)
  const preloadPosterImages = useCallback(async (movies: Movie[]) => {
    const promises = movies.slice(0, 4).map(m => {
      return new Promise<void>((resolve) => {
        const poster = m.poster_path;
        if (!poster) {
          resolve();
          return;
        }
        const src = poster.startsWith('http')
          ? poster
          : `https://image.tmdb.org/t/p/w500${poster}`;
        const img = new Image();
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });

    await Promise.race([
      Promise.all(promises),
      new Promise(res => setTimeout(res, 800))
    ]);
  }, []);

  // Extract seed IDs from history for taste anchoring
  const getSeedMovieIds = useCallback((): number[] => {
    const seedIds: number[] = [];
    [...history.sickoMode, ...history.watched, ...history.watchlist].forEach(r => {
      if (r.movie.id && r.movie.id < 900000) {
        seedIds.push(r.movie.id);
      }
    });
    return seedIds;
  }, [history]);

  // Build initial swipe pool from curated horror dataset
  const buildInitialPool = useCallback((): Movie[] => {
    const pool = CURATED_MOVIES.filter(m => {
      if (seenIds.current.has(m.id)) return false;
      if (seenTitles.current.has(normalizeTitle(m.title))) return false;
      return filterMovie(m);
    });
    return [...pool].sort(() => 0.5 - Math.random());
  }, [filterMovie]);

  // Summon more movies dynamically from TMDB
  const summonMoreDiscoveries = useCallback(async (currentFilterState: FilterState = filters) => {
    setIsDiscoveringMore(true);
    try {
      const seedIds = getSeedMovieIds();
      const nextPage = discoveryPage + 1;
      setDiscoveryPage(nextPage);

      const dynamicMovies = await discoverDynamicMovies(
        currentFilterState,
        seenIds.current,
        seedIds,
        nextPage
      );

      // Deduplicate against seen titles as well
      const filteredDynamic = dynamicMovies.filter(m => {
        const norm = normalizeTitle(m.title);
        if (seenTitles.current.has(norm)) return false;
        return true;
      });

      if (filteredDynamic.length > 0) {
        filteredDynamic.forEach(m => {
          seenIds.current.add(m.id);
          seenTitles.current.add(normalizeTitle(m.title));
        });

        await preloadPosterImages(filteredDynamic);
        setStack(prev => [...prev, ...filteredDynamic]);

        triggerToast({
          message: `Summoned ${filteredDynamic.length} Fresh Films`,
          subtext: 'Expanded discovery deck via TMDB taste engine',
          type: 'sicko'
        });
      } else {
        triggerToast({
          message: 'No More Distinct Titles Found',
          subtext: 'Try expanding selected vibes or lowering dread threshold',
          type: 'rotten'
        });
      }
    } catch (err) {
      console.error('Failed to summon dynamic discoveries:', err);
    } finally {
      setIsDiscoveringMore(false);
    }
  }, [filters, discoveryPage, getSeedMovieIds, preloadPosterImages, triggerToast]);

  const initializedRef = useRef(false);

  // Initialization (Runs strictly once on mount to eliminate infinite re-render flickering)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      setLoading(true);
      const hist = getLocalHistory();
      setHistory(hist);
      
      [...hist.watched, ...hist.disliked, ...hist.watchlist, ...hist.sickoMode].forEach(r => {
        seenIds.current.add(r.movie.id);
        if (r.movie.title) {
          seenTitles.current.add(normalizeTitle(r.movie.title));
        }
      });

      const hasCompletedOnboarding = localStorage.getItem('dread_onboarding_completed');
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      }

      let initialPool = CURATED_MOVIES.filter(m => {
        if (seenIds.current.has(m.id)) return false;
        if (seenTitles.current.has(normalizeTitle(m.title))) return false;
        if (filters.minDread > 1 && m.dreadScore < filters.minDread) return false;
        if (filters.maxDread < 5 && m.dreadScore > filters.maxDread) return false;
        if (!m.vibes.some(v => filters.selectedVibes.includes(v))) return false;
        if (filters.noHorrorComedy) {
          const isComedy = m.subgenres?.some(s => s.toLowerCase().includes('comedy')) ||
                           m.overview.toLowerCase().includes('horror-comedy') ||
                           m.overview.toLowerCase().includes('dark comedy') ||
                           m.overview.toLowerCase().includes('hilarious');
          if (isComedy) return false;
        }
        return true;
      }).sort(() => 0.5 - Math.random());

      // If initial pool is small (< 15 films), augment with dynamic TMDB discoveries
      if (initialPool.length < 15) {
        try {
          const seedIds: number[] = [];
          [...hist.sickoMode, ...hist.watched, ...hist.watchlist].forEach(r => {
            if (r.movie.id && r.movie.id < 900000) {
              seedIds.push(r.movie.id);
            }
          });
          const dynamic = await discoverDynamicMovies(filters, seenIds.current, seedIds, 1);
          const filteredDynamic = dynamic.filter(m => !seenTitles.current.has(normalizeTitle(m.title)));
          filteredDynamic.forEach(m => {
            seenIds.current.add(m.id);
            seenTitles.current.add(normalizeTitle(m.title));
          });
          initialPool = [...initialPool, ...filteredDynamic];
        } catch (e) {
          console.error('Initial TMDB discovery augmentation failed:', e);
        }
      }

      if (initialPool.length > 0) {
        await preloadPosterImages(initialPool);
      }
      setStack(initialPool);
      setLoading(false);
    };

    init();
  }, []); // Strictly empty dependency array so mount initialization runs once

  // Preload upcoming images when top card changes
  const topMovieId = stack[0]?.id;
  useEffect(() => {
    if (stack.length > 1) {
      preloadPosterImages(stack.slice(1, 4));
    }
  }, [topMovieId, preloadPosterImages]);

  // Handle Swipe logic
  const handleSwipe = useCallback(async (direction: SwipeDirection) => {
    if (stack.length === 0) return;

    const currentMovie = stack[0];
    const newStack = stack.slice(1);
    
    const record: SwipedMovieRecord = {
      movie: currentMovie,
      direction,
      timestamp: new Date().toISOString()
    };

    setLastAction(record);
    setStack(newStack);
    seenIds.current.add(currentMovie.id);
    if (currentMovie.title) {
      seenTitles.current.add(normalizeTitle(currentMovie.title));
    }

    // Save bump feedback
    setVaultBump(true);
    setTimeout(() => setVaultBump(false), 1200);

    if (direction === SwipeDirection.RIGHT) {
      triggerToast({
        message: `Saved to Vault: "${currentMovie.title}"`,
        subtext: '✓ Added to your Watched collection',
        type: 'liked'
      });
    } else if (direction === SwipeDirection.DOWN) {
      triggerToast({
        message: `Added to Queue: "${currentMovie.title}"`,
        subtext: '🔖 Saved in Watchlist for your next film night',
        type: 'watchlist'
      });
    } else if (direction === SwipeDirection.LEFT) {
      triggerToast({
        message: `Marked Rotten: "${currentMovie.title}"`,
        subtext: '⛔ Excluded from your recommendation stream',
        type: 'rotten'
      });
    }

    // SICKO MODE Logic
    if (direction === SwipeDirection.UP) {
      try {
        confetti({
          particleCount: 50,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#b91c1c', '#7f1d1d', '#ffffff']
        });
      } catch (e) {}

      // Find similar curated movies
      const similarCurated = CURATED_MOVIES.filter(m => {
        if (seenIds.current.has(m.id)) return false;
        if (seenTitles.current.has(normalizeTitle(m.title))) return false;
        if (!filterMovie(m)) return false;
        const sharedVibes = m.vibes.filter(v => currentMovie.vibes.includes(v)).length;
        const sameDirector = m.director && currentMovie.director && m.director === currentMovie.director;
        return sharedVibes >= 1 || sameDirector || m.dreadScore >= 4;
      }).slice(0, 3);

      if (similarCurated.length > 0) {
        similarCurated.forEach(m => {
          seenIds.current.add(m.id);
          seenTitles.current.add(normalizeTitle(m.title));
        });
        setStack(prev => {
          const next = [...prev];
          next.splice(0, 0, ...similarCurated);
          return next;
        });
      }

      triggerToast({
        message: `🔥 SICKO ANCHOR: "${currentMovie.title}"`,
        subtext: `Spawning ${similarCurated.length > 0 ? similarCurated.length : 'similar'} matching masterworks into deck...`,
        type: 'sicko'
      });

      // TMDB Deep catalog recommendations query
      fetchRecommendations(currentMovie.id).then(recs => {
        const valid = recs.filter(m => !seenIds.current.has(m.id) && !seenTitles.current.has(normalizeTitle(m.title)) && filterMovie(m));
        if (valid.length > 0) {
          valid.forEach(m => {
            seenIds.current.add(m.id);
            seenTitles.current.add(normalizeTitle(m.title));
          });
          setStack(prev => {
            const next = [...prev];
            next.splice(2, 0, ...valid.slice(0, 3));
            return next;
          });
        }
      }).catch(err => console.error(err));
    }

    // Persist swipe locally
    const updatedHistory = await recordSwipe(currentMovie, direction);
    setHistory(updatedHistory);

    // Persist swipe to Master Google Sheet if connected (Persistent Memory)
    if (sheetsSyncState.isConnected && sheetsSyncState.autoSyncEnabled && sheetsSyncState.spreadsheetId) {
      const token = getAccessToken();
      if (token) {
        appendSwipeToMasterSheet(token, sheetsSyncState.spreadsheetId, currentMovie, direction, record.timestamp)
          .then(() => {
            setSheetsSyncState(prev => ({ ...prev, recordCount: prev.recordCount + 1 }));
          })
          .catch(err => {
            console.warn('Background swipe sync to Google Sheet failed:', err);
          });
      }
    }

    // Replenish if stack runs low (< 5 movies)
    if (newStack.length < 5) {
      const moreCurated = CURATED_MOVIES.filter(m => !seenIds.current.has(m.id) && !seenTitles.current.has(normalizeTitle(m.title)) && filterMovie(m));
      if (moreCurated.length > 0) {
        setStack(prev => [...prev, ...moreCurated.sort(() => 0.5 - Math.random())]);
      } else {
        // Automatically summon background discoveries from TMDB
        const seedIds = getSeedMovieIds();
        discoverDynamicMovies(filters, seenIds.current, seedIds, discoveryPage + 1).then(dyn => {
          const valid = dyn.filter(m => !seenTitles.current.has(normalizeTitle(m.title)));
          if (valid.length > 0) {
            valid.forEach(m => {
              seenIds.current.add(m.id);
              seenTitles.current.add(normalizeTitle(m.title));
            });
            setStack(prev => [...prev, ...valid]);
          }
        }).catch(err => console.error(err));
      }
    }
  }, [stack, filterMovie, triggerToast, getSeedMovieIds, filters, discoveryPage]);

  // Undo Last Action
  const handleUndo = useCallback(async () => {
    if (!lastAction) return;

    const restoredMovie = lastAction.movie;
    setStack(prev => [restoredMovie, ...prev]);
    seenIds.current.delete(restoredMovie.id);
    if (restoredMovie.title) {
      seenTitles.current.delete(normalizeTitle(restoredMovie.title));
    }

    const updatedHistory = await undoLastSwipe(lastAction);
    setHistory(updatedHistory);
    setLastAction(null);

    triggerToast({
      message: `Restored "${restoredMovie.title}"`,
      subtext: 'Returned to the top of your deck',
      type: 'liked'
    });
  }, [lastAction, triggerToast]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showOnboarding || showSearchFlowModal || showExportModal || showHistoryDrawer) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSwipe(SwipeDirection.LEFT);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe(SwipeDirection.RIGHT);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleSwipe(SwipeDirection.UP);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleSwipe(SwipeDirection.DOWN);
      } else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey || true)) {
        if (lastAction) {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, handleUndo, lastAction, showOnboarding, showSearchFlowModal, showExportModal, showHistoryDrawer]);

  // Onboarding Complete Handler
  const handleOnboardingComplete = async (prefs: OnboardingPreferences) => {
    const newFilters: FilterState = {
      ...filters,
      selectedVibes: prefs.vibes,
      minDread: prefs.dreadIntensity,
      noHorrorComedy: prefs.noHorrorComedy,
      subtitledOk: prefs.subtitledOk
    };

    setFilters(newFilters);
    localStorage.setItem('dread_onboarding_completed', 'true');
    setShowOnboarding(false);

    let newPool = CURATED_MOVIES.filter(m => {
      if (m.dreadScore < prefs.dreadIntensity) return false;
      return m.vibes.some(v => prefs.vibes.includes(v));
    }).sort(() => 0.5 - Math.random());

    if (newPool.length < 15) {
      try {
        const dyn = await discoverDynamicMovies(newFilters, seenIds.current, [], 1);
        newPool = [...newPool, ...dyn];
      } catch (e) {}
    }

    setStack(newPool);
  };

  // Open New Search Starting Flow (Calibrate filters & optionally upload watched/liked)
  const handleResetDeck = () => {
    setShowSearchFlowModal(true);
  };

  // Launch New Search with calibrated filters (Preserves Vault without clearing)
  const handleLaunchNewSearch = async (newFilters: FilterState) => {
    setFilters(newFilters);
    seenIds.current.clear();
    seenTitles.current.clear();
    setDiscoveryPage(1);
    
    // Re-populate seenIds & seenTitles with all movies in Vault/History so no saved or watched movies repeat
    [...history.watched, ...history.sickoMode, ...history.watchlist, ...history.disliked].forEach(r => {
      seenIds.current.add(r.movie.id);
      if (r.movie.title) {
        seenTitles.current.add(normalizeTitle(r.movie.title));
      }
    });

    let newPool = CURATED_MOVIES.filter(m => {
      if (seenIds.current.has(m.id)) return false;
      if (seenTitles.current.has(normalizeTitle(m.title))) return false;
      if (m.dreadScore < newFilters.minDread || m.dreadScore > newFilters.maxDread) return false;
      if (!m.vibes.some(v => newFilters.selectedVibes.includes(v))) return false;
      if (newFilters.noHorrorComedy) {
        const isComedy = m.subgenres?.some(s => s.toLowerCase().includes('comedy')) ||
                         m.overview.toLowerCase().includes('horror-comedy') ||
                         m.overview.toLowerCase().includes('dark comedy') ||
                         m.overview.toLowerCase().includes('hilarious');
        if (isComedy) return false;
      }
      return true;
    }).sort(() => 0.5 - Math.random());

    // If remaining pool is small (or empty due to 155+ imported films), automatically fetch dynamic TMDB discoveries!
    if (newPool.length < 20) {
      setIsDiscoveringMore(true);
      try {
        const seedIds = getSeedMovieIds();
        const dynamicDiscovered = await discoverDynamicMovies(newFilters, seenIds.current, seedIds, 1);
        const filteredDyn = dynamicDiscovered.filter(m => !seenTitles.current.has(normalizeTitle(m.title)));
        
        filteredDyn.forEach(m => {
          seenIds.current.add(m.id);
          seenTitles.current.add(normalizeTitle(m.title));
        });

        newPool = [...newPool, ...filteredDyn];
      } catch (err) {
        console.error('Failed to discover dynamic movies during search launch:', err);
      } finally {
        setIsDiscoveringMore(false);
      }
    }

    setStack(newPool);
    setLastAction(null);

    // Preload next posters
    if (newPool.length > 0) {
      await preloadPosterImages(newPool.slice(0, 4));
    }

    triggerToast({
      message: 'New Search Deck Ready',
      subtext: `${newPool.length} unswiped films matching your taste • 155+ vault items excluded`,
      type: 'liked'
    });
  };

  // Clear ALL History & Start Completely Clean
  const handleClearAllHistory = () => {
    clearAllHistory();
    seenIds.current.clear();
    seenTitles.current.clear();
    setHistory({ watched: [], disliked: [], watchlist: [], sickoMode: [] });
    setLastAction(null);
    const newPool = CURATED_MOVIES.filter(filterMovie).sort(() => 0.5 - Math.random());
    setStack(newPool);
    triggerToast({
      message: 'History Cleared',
      subtext: 'All swiped records cleared & clean deck loaded',
      type: 'rotten'
    });
  };

  const handleDeleteHistoryRecord = async (record: SwipedMovieRecord) => {
    await undoLastSwipe(record);
    reloadHistory();
  };

  const [exportInitialTab, setExportInitialTab] = useState<'letterboxd' | 'sheets' | 'markdown' | 'plaintext' | 'import'>('letterboxd');

  const openExportModal = () => {
    setExportInitialTab('letterboxd');
    setShowExportModal(true);
  };

  const openImportModal = () => {
    setExportInitialTab('import');
    setShowExportModal(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <Flame className="w-6 h-6 text-red-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white text-sm font-black uppercase tracking-[0.25em]">
            Calibrating Dread Deck
          </p>
          <p className="text-zinc-500 text-xs font-mono mt-1">
            Preloading film posters & taste taxonomy...
          </p>
        </div>
      </div>
    );
  }

  const totalSavedCount = history.watched.length + history.watchlist.length + history.sickoMode.length;

  return (
    <div className="h-screen w-full bg-black text-white relative flex flex-col items-center overflow-hidden font-sans select-none">
      {/* Ambient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-950/20 blur-[130px] rounded-full pointer-events-none" />

      {/* 1. TOP NAVBAR (Clean minimal layout: Vault and Reset top right) */}
      <header className="z-30 w-full max-w-md px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
        {/* Subtle Brand Moniker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-widest uppercase text-zinc-300">
            DreadSwipe
          </span>
        </div>

        {/* Action Controls: Reset, Google Sheets & Vault Top Right */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Reset Search Deck */}
          <button
            type="button"
            onClick={handleResetDeck}
            title="Reset Deck & Restart Search"
            className="bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-2.5 sm:px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-all active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px]">Reset</span>
          </button>

          {/* Google Sheets Persistent Memory Pill */}
          <button
            type="button"
            onClick={() => setShowGoogleSheetsModal(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm border ${
              sheetsSyncState.isConnected
                ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-emerald-700/70 shadow-emerald-950/50'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700'
            }`}
            title={sheetsSyncState.isConnected ? `Google Sheets Connected: ${sheetsSyncState.spreadsheetTitle || 'Master Vault'}` : "Connect Google Sheets (Persistent Memory)"}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${sheetsSyncState.isConnected ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span className="text-[10px] hidden xs:inline">
              {sheetsSyncState.isConnected ? 'Sheets' : 'Sheets'}
            </span>
            {sheetsSyncState.isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </button>

          {/* Vault Ticker Counter */}
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm border ${
              vaultBump
                ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500 scale-105 shadow-emerald-950'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Open Saved Vault (Export & Import)"
          >
            <Layers className={`w-3.5 h-3.5 ${vaultBump ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span className="text-[10px] tracking-widest text-zinc-400">VAULT</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black tabular-nums border ${
              vaultBump 
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-red-950/90 text-red-400 border-red-900/60'
            }`}>
              {totalSavedCount}
            </span>
          </button>
        </div>
      </header>

      {/* 2. ATTACHED MAIN STACK: FILTERS, CARD, AND CONTROLS (Tightly coupled with 30-40px spacing below card) */}
      <div className="flex-1 w-full max-w-sm sm:max-w-md px-3 flex flex-col items-center justify-center min-h-0 relative z-20 pb-2 sm:pb-3">
        {/* COMPACT ICON-ONLY FILTER BAR */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          isOpen={showFilterDrawer}
          onToggleOpen={() => setShowFilterDrawer(!showFilterDrawer)}
        />

        {/* DYNAMIC SAVED FEEDBACK TOAST BANNER */}
        <div className="w-full px-2 h-7 sm:h-8 flex items-center justify-center shrink-0 z-20 my-1">
          <AnimatePresence mode="wait">
            {toastNotice ? (
              <motion.div
                key={toastNotice.id}
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                className={`px-3 py-1 rounded-xl border text-xs flex items-center gap-2 shadow-lg backdrop-blur-xl w-full justify-between ${
                  toastNotice.type === 'sicko'
                    ? 'bg-red-950/95 border-red-500 text-red-200'
                    : toastNotice.type === 'liked'
                    ? 'bg-emerald-950/95 border-emerald-500/70 text-emerald-200'
                    : toastNotice.type === 'watchlist'
                    ? 'bg-amber-950/95 border-amber-500/70 text-amber-200'
                    : 'bg-zinc-900/95 border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {toastNotice.type === 'sicko' && <Flame className="w-3.5 h-3.5 text-red-500 shrink-0 animate-bounce" />}
                  {toastNotice.type === 'liked' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {toastNotice.type === 'watchlist' && <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  {toastNotice.type === 'rotten' && <X className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                  <div className="truncate">
                    <span className="font-bold text-[11px] block truncate">{toastNotice.message}</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase bg-black/40 px-1.5 py-0.5 rounded shrink-0">
                  Vault
                </span>
              </motion.div>
            ) : isDiscoveringMore ? (
              <div className="text-[10px] font-mono text-red-400 flex items-center gap-1.5 animate-pulse bg-red-950/60 border border-red-800/60 px-3 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                <span>Summoning unswiped films from TMDB matching your 155+ liked records...</span>
              </div>
            ) : (
              <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 animate-pulse" />
                <span>Swipe right to save • Swipe up for Sicko Mode</span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* MAIN CARD STACK STAGE (Responsive height prevents vertical scroll on tablets) */}
        <main className="w-full relative flex items-center justify-center shrink min-h-0">
          <div className="relative w-full h-[51vh] sm:h-[54vh] md:h-[56vh] max-h-[490px] aspect-[2/3] sm:aspect-[3/4] flex items-center justify-center">
            <AnimatePresence>
              {stack.length > 0 ? (
                stack.slice(0, 2).reverse().map((movie, index) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onSwipe={handleSwipe}
                    isTop={index === 1}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center p-6 sm:p-7 bg-zinc-950/95 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-2xl w-full flex flex-col items-center justify-between"
                >
                  <div>
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Flame className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mb-1">
                      Deck Exhausted
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto mb-4">
                      All currently loaded films matching your filters have been swiped. Summon more fresh discoveries from TMDB or calibrate your taste DNA.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    {/* Dynamic TMDB Summon button */}
                    <button
                      type="button"
                      onClick={() => summonMoreDiscoveries()}
                      disabled={isDiscoveringMore}
                      className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white py-2.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-red-950 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDiscoveringMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Summoning from TMDB...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Summon 30 Fresh Discoveries</span>
                        </>
                      )}
                    </button>

                    {/* Calibrate Filters / Start New Search */}
                    <button
                      type="button"
                      onClick={handleResetDeck}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Calibrate Vibe DNA & Filters</span>
                    </button>

                    {/* Export Saved Vault */}
                    <button
                      type="button"
                      onClick={openExportModal}
                      className="w-full bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2 rounded-xl font-medium uppercase tracking-wider text-[11px] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export Vault ({totalSavedCount} Films)</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* 3. DEDICATED CONTROLS DOCK: SET 30-40PX BELOW THE CARD */}
        <div className="w-full shrink-0 mt-7 sm:mt-8 flex flex-col items-center gap-1.5 z-30">
          {/* Swipe Button Pod */}
          <div className="flex items-center gap-2.5 sm:gap-3 bg-zinc-950/90 p-1.5 px-3 rounded-full border border-zinc-800/90 shadow-2xl backdrop-blur-2xl">
            {/* 1. Pass / Rotten (Left) */}
            <button
              type="button"
              title="Pass / Rotten (Left Arrow)"
              onClick={() => handleSwipe(SwipeDirection.LEFT)}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-zinc-900 border border-zinc-800 hover:border-red-500/70 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 shadow-md transition-all active:scale-90"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* 2. Watchlist Queue (Down) */}
            <button
              type="button"
              title="Add to Watchlist (Down Arrow)"
              onClick={() => handleSwipe(SwipeDirection.DOWN)}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-zinc-900 border border-zinc-800 hover:border-amber-500/70 rounded-full flex items-center justify-center text-zinc-400 hover:text-amber-400 shadow-md transition-all active:scale-90"
            >
              <Bookmark className="w-4 h-4" />
            </button>

            {/* 3. SICKO MODE / 5-Star Anchor (Up) */}
            <button
              type="button"
              title="SICKO MODE (Up Arrow): 5-Star Anchor that spawns similar transgressive masterworks into deck"
              onClick={() => handleSwipe(SwipeDirection.UP)}
              className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-950 hover:brightness-110 transition-all active:scale-90 border-2 border-red-400/40 relative group"
            >
              <Flame className="w-5 h-5 sm:w-5.5 sm:h-5.5 group-hover:scale-110 transition-transform" />
            </button>

            {/* 4. Liked / Watched (Right) */}
            <button
              type="button"
              title="Liked / Watched (Right Arrow): Saves to Vault"
              onClick={() => handleSwipe(SwipeDirection.RIGHT)}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/70 rounded-full flex items-center justify-center text-zinc-400 hover:text-emerald-400 shadow-md transition-all active:scale-90"
            >
              <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>

          {/* Undo Floating Pill */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!lastAction}
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                lastAction
                  ? 'bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 shadow-md'
                  : 'bg-transparent border-transparent text-transparent pointer-events-none opacity-0'
              }`}
            >
              <Undo2 className="w-3 h-3 text-zinc-400" />
              <span>Undo ({lastAction?.movie.title.slice(0, 12)}...)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ALL MODALS */}
      {/* 1. Onboarding Taste Protocol */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onOpenImport={openImportModal}
        onOpenSheetsModal={() => setShowGoogleSheetsModal(true)}
        syncState={sheetsSyncState}
      />

      {/* 2. New Search & Recalibration Flow Modal */}
      <SearchFlowModal
        isOpen={showSearchFlowModal}
        onClose={() => setShowSearchFlowModal(false)}
        currentFilters={filters}
        onLaunchNewSearch={handleLaunchNewSearch}
        history={history}
        onRefreshHistory={reloadHistory}
      />

      {/* 3. Export Modal */}
      <ExportVaultModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        history={history}
        onRefreshHistory={reloadHistory}
        initialTab={exportInitialTab}
        onOpenSheetsModal={() => setShowGoogleSheetsModal(true)}
        syncState={sheetsSyncState}
      />

      {/* 4. History Drawer */}
      <HistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        history={history}
        onOpenExport={openExportModal}
        onOpenImport={openImportModal}
        onDeleteRecord={handleDeleteHistoryRecord}
        onClearAllHistory={handleClearAllHistory}
        onOpenSheetsModal={() => setShowGoogleSheetsModal(true)}
        syncState={sheetsSyncState}
      />

      {/* 5. Google Sheets Master Vault (Persistent Memory) Modal */}
      <GoogleSheetsModal
        isOpen={showGoogleSheetsModal}
        onClose={() => setShowGoogleSheetsModal(false)}
        syncState={sheetsSyncState}
        history={history}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        onSyncNow={handleGoogleSyncNow}
        onLinkCustomSheet={handleLinkCustomSheet}
        onToggleAutoSync={handleToggleAutoSync}
      />
    </div>
  );
};

export default App;
