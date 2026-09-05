import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserHistory, SwipedMovieRecord, SwipeDirection, GoogleSheetsSyncState } from '../types';
import { DREAD_LEVELS, IMAGE_BASE_URL } from '../constants';
import { 
  X, 
  Trash2, 
  Flame, 
  Bookmark, 
  Share2, 
  Search, 
  Film,
  UploadCloud,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: UserHistory;
  onOpenExport: () => void;
  onOpenImport?: () => void;
  onOpenSheetsModal?: () => void;
  syncState?: GoogleSheetsSyncState;
  onDeleteRecord: (record: SwipedMovieRecord) => void;
  onClearAllHistory: () => void;
}

type TabKey = 'all_liked' | 'sicko' | 'watchlist' | 'disliked';

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onOpenExport,
  onOpenImport,
  onOpenSheetsModal,
  syncState,
  onDeleteRecord,
  onClearAllHistory
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('all_liked');
  const [search, setSearch] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const getRecords = (): SwipedMovieRecord[] => {
    let list: SwipedMovieRecord[] = [];
    if (activeTab === 'sicko') list = history.sickoMode;
    else if (activeTab === 'watchlist') list = history.watchlist;
    else if (activeTab === 'disliked') list = history.disliked;
    else {
      // All liked
      const map = new Map<number, SwipedMovieRecord>();
      [...history.sickoMode, ...history.watched].forEach(r => map.set(r.movie.id, r));
      list = Array.from(map.values());
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(r => 
      r.movie.title.toLowerCase().includes(q) ||
      (r.movie.director && r.movie.director.toLowerCase().includes(q)) ||
      r.movie.vibes.some(v => v.toLowerCase().includes(q))
    );
  };

  const records = getRecords();
  const totalCount = history.watched.length + history.sickoMode.length + history.watchlist.length + history.disliked.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xl"
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-black uppercase tracking-tight text-white">
                  Vault & History
                </h3>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Import Watched button */}
                {onOpenImport && (
                  <button
                    type="button"
                    onClick={onOpenImport}
                    title="Upload Watched List (Letterboxd CSV / Text)"
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-red-400" />
                    <span>Import</span>
                  </button>
                )}

                {/* Export button */}
                <button
                  type="button"
                  onClick={onOpenExport}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-950 transition-all active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 border border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Google Sheets Persistent Memory Banner */}
            {onOpenSheetsModal && (
              <div className="mb-3 p-2.5 rounded-xl border bg-zinc-900/90 border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    syncState?.isConnected 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' 
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-750'
                  }`}>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white truncate block">
                        {syncState?.isConnected ? (syncState.spreadsheetTitle || 'Google Sheets Master Vault') : 'Google Sheets Memory'}
                      </span>
                      {syncState?.isConnected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 block truncate font-mono">
                      {syncState?.isConnected ? `${syncState.userEmail || 'Auto-syncing swipes'}` : 'Auto-save & exclude watched films'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenSheetsModal}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase shrink-0 transition-colors border ${
                    syncState?.isConnected
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  }`}
                >
                  {syncState?.isConnected ? 'Manage' : 'Connect'}
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, director, or vibe..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-850">
              <button
                type="button"
                onClick={() => setActiveTab('all_liked')}
                className={`py-1.5 text-[11px] font-black uppercase rounded-lg transition-all ${
                  activeTab === 'all_liked' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Liked ({history.watched.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sicko')}
                className={`py-1.5 text-[11px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'sicko' ? 'bg-red-950/80 text-red-400 border border-red-800/50' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Flame className="w-3 h-3 text-red-500" />
                <span>Sicko ({history.sickoMode.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('watchlist')}
                className={`py-1.5 text-[11px] font-black uppercase rounded-lg transition-all ${
                  activeTab === 'watchlist' ? 'bg-zinc-800 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Queue ({history.watchlist.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('disliked')}
                className={`py-1.5 text-[11px] font-black uppercase rounded-lg transition-all ${
                  activeTab === 'disliked' ? 'bg-zinc-800 text-red-400' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Rotten ({history.disliked.length})
              </button>
            </div>
          </div>

          {/* List of Films */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
            {records.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <Film className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-mono uppercase">No records in this tab</p>
              </div>
            ) : (
              records.map((record) => {
                const m = record.movie;
                const poster = m.poster_path?.startsWith('http')
                  ? m.poster_path
                  : m.poster_path
                  ? `${IMAGE_BASE_URL}${m.poster_path}`
                  : null;
                const dread = DREAD_LEVELS[m.dreadScore];

                return (
                  <div
                    key={m.id}
                    className="p-3 bg-zinc-900/70 border border-zinc-850 hover:border-zinc-700 rounded-2xl flex gap-3 transition-all group"
                  >
                    {poster ? (
                      <img
                        src={poster}
                        alt={m.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-20 object-cover rounded-xl shrink-0 bg-zinc-950"
                      />
                    ) : (
                      <div className="w-14 h-20 bg-zinc-950 rounded-xl flex items-center justify-center text-zinc-700 shrink-0">
                        <Film className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-black uppercase tracking-tight text-white truncate">
                            {m.title}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {m.year}
                          </span>
                        </div>

                        {m.director && (
                          <p className="text-[11px] text-zinc-400 truncate">
                            dir. {m.director}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-zinc-800/50">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${dread?.color || 'text-zinc-400 border-zinc-700'}`}>
                            {dread?.label || 'Dread'}
                          </span>
                          {record.direction === SwipeDirection.UP && (
                            <span className="text-[9px] font-mono bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">
                              🔥 SICKO
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteRecord(record)}
                          title="Remove from history"
                          className="text-zinc-600 hover:text-red-400 p-1 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer with Clear History */}
          {totalCount > 0 && (
            <div className="p-3 sm:p-4 border-t border-zinc-850/80 bg-zinc-950 shrink-0">
              {showClearConfirm ? (
                <div className="bg-red-950/50 border border-red-800/80 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Clear all {totalCount} saved films from history?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllHistory();
                        setShowClearConfirm(false);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs py-1.5 rounded-xl transition-all"
                    >
                      Yes, Clear All History
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-xs rounded-xl border border-zinc-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full text-zinc-500 hover:text-red-400 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Swiped History & Start Clean</span>
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HistoryDrawer;
