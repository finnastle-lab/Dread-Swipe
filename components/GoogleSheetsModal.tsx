import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleSheetsSyncState, UserHistory } from '../types';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Link as LinkIcon, 
  ShieldCheck, 
  X, 
  Flame, 
  Bookmark, 
  Eye, 
  Database,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: GoogleSheetsSyncState;
  history: UserHistory;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onLinkCustomSheet: (sheetIdOrUrl: string) => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  syncState,
  history,
  onSignIn,
  onSignOut,
  onSyncNow,
  onLinkCustomSheet,
  onToggleAutoSync
}) => {
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSignInClick = async () => {
    setIsSigningIn(true);
    setFeedbackMessage(null);
    try {
      await onSignIn();
      setFeedbackMessage({ type: 'success', text: 'Successfully authenticated with Google!' });
    } catch (err: any) {
      setFeedbackMessage({ 
        type: 'error', 
        text: err.message || 'Failed to sign in with Google. Please ensure popups are allowed.' 
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSyncClick = async () => {
    setIsSyncingManual(true);
    setFeedbackMessage(null);
    try {
      await onSyncNow();
      setFeedbackMessage({ type: 'success', text: 'Master Google Sheet synchronized successfully!' });
    } catch (err: any) {
      setFeedbackMessage({ 
        type: 'error', 
        text: err.message || 'Failed to sync with Google Sheets. Please check permissions.' 
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const handleCustomLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetInput.trim()) return;

    setIsLinking(true);
    setFeedbackMessage(null);
    try {
      await onLinkCustomSheet(customSheetInput.trim());
      setFeedbackMessage({ type: 'success', text: 'Linked to custom master sheet!' });
      setShowCustomInput(false);
      setCustomSheetInput('');
    } catch (err: any) {
      setFeedbackMessage({ 
        type: 'error', 
        text: err.message || 'Could not access that spreadsheet ID. Ensure you have edit access.' 
      });
    } finally {
      setIsLinking(false);
    }
  };

  const totalVaultMovies = history.watched.length + history.sickoMode.length + history.watchlist.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.94, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 15 }}
          className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Google Sheets Master Vault</span>
                  {syncState.isConnected && (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Memory
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Persistent cloud memory — never re-upload watched movies again
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback banner */}
          {feedbackMessage && (
            <div className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
              feedbackMessage.type === 'success' 
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800/60' 
                : 'bg-red-950/80 text-red-200 border-red-800/60'
            }`}>
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              <span className="leading-tight">{feedbackMessage.text}</span>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-zinc-300">
            {syncState.isConnected ? (
              /* CONNECTED STATE */
              <div className="space-y-4">
                {/* Account & Sheet Dossier */}
                <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {syncState.userPhoto ? (
                        <img 
                          src={syncState.userPhoto} 
                          alt="Google profile" 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
                          {syncState.userName ? syncState.userName[0] : 'G'}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{syncState.userName || 'Connected Account'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 truncate max-w-[220px]">
                          {syncState.userEmail}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onSignOut}
                      className="px-2.5 py-1 text-[11px] font-mono uppercase bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <LogOut className="w-3 h-3 text-zinc-400" />
                      <span>Disconnect</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Master Spreadsheet</span>
                      <span className="text-xs font-bold text-emerald-400 truncate block">
                        {syncState.spreadsheetTitle || 'DreadSwipe - Horror Movie Vault'}
                      </span>
                    </div>

                    {syncState.spreadsheetUrl && (
                      <a
                        href={syncState.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/50 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                      >
                        <span>Open Sheet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Persistent Memory Status Pill */}
                <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-300 block mb-0.5">
                      Persistent Memory Active
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      All films recorded in your master sheet ({syncState.recordCount || totalVaultMovies} titles) are permanently excluded from your swipe deck. You will never need to re-upload watched movies again.
                    </p>
                  </div>
                </div>

                {/* Vault Count Statistics */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-black">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-sm tabular-nums">{history.watched.length}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Watched</span>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-red-400 text-xs font-black">
                      <Flame className="w-3.5 h-3.5" />
                      <span className="text-sm tabular-nums">{history.sickoMode.length}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Sicko Mode</span>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-black">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span className="text-sm tabular-nums">{history.watchlist.length}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Queue</span>
                  </div>
                </div>

                {/* Auto Sync Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-white block">Auto-Save Swipes to Sheet</span>
                    <span className="text-[11px] text-zinc-400 block">
                      Appends every Right, Up, Down swipe directly to your sheet in real time.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
                    <input 
                      type="checkbox" 
                      checked={syncState.autoSyncEnabled} 
                      onChange={e => onToggleAutoSync(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Sync Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncClick}
                    disabled={isSyncingManual || syncState.isSyncing}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all active:scale-98 disabled:opacity-50"
                  >
                    {isSyncingManual || syncState.isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Synchronizing with Master Sheet...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-emerald-200" />
                        <span>Sync Vault Now (Pull & Push)</span>
                      </>
                    )}
                  </button>

                  {/* Link alternate sheet toggle */}
                  <div className="pt-2">
                    {!showCustomInput ? (
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(true)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 mx-auto transition-colors"
                      >
                        <LinkIcon className="w-3 h-3 text-zinc-500" />
                        <span>Link an existing custom Google Sheet instead?</span>
                      </button>
                    ) : (
                      <form onSubmit={handleCustomLinkSubmit} className="space-y-2 bg-zinc-900/90 p-3 rounded-xl border border-zinc-800">
                        <label className="text-[11px] font-mono uppercase text-zinc-400 block">
                          Paste Spreadsheet ID or Google Sheets URL:
                        </label>
                        <input
                          type="text"
                          value={customSheetInput}
                          onChange={e => setCustomSheetInput(e.target.value)}
                          placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowCustomInput(false)}
                            className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLinking || !customSheetInput.trim()}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                          >
                            {isLinking ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            <span>Link Sheet</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* NOT CONNECTED STATE */
              <div className="space-y-4 py-1">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/70 border border-emerald-600/30 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                    <Database className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black uppercase tracking-tight text-white">
                    Connect Your Master Google Sheet
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Auto-save all your swiped films to a private Google Sheet in your personal Google Drive, giving you persistent memory across all devices.
                  </p>
                </div>

                {/* Feature Highlights */}
                <div className="space-y-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Zero Repeated Movies</span>
                      <span className="text-[11px] text-zinc-400 leading-tight block">
                        Films already in your master sheet are automatically excluded from the swipe deck. No manual re-uploads ever needed.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Automatic Real-Time Sync</span>
                      <span className="text-[11px] text-zinc-400 leading-tight block">
                        Every swipe (Watched, Sicko Mode, Watchlist, Passed) appends directly to your Google Sheet.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">100% User Owned & Private</span>
                      <span className="text-[11px] text-zinc-400 leading-tight block">
                        Stored entirely in your own Google Drive. Open, sort, share, or export to Letterboxd anytime.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Official "Sign in with Google" Button (styled per workspace skill guidelines) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSignInClick}
                    disabled={isSigningIn}
                    className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-98 disabled:opacity-75"
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
                        <span className="text-xs font-bold uppercase tracking-wider">Connecting to Google...</span>
                      </>
                    ) : (
                      <>
                        {/* Official Google 4-Color SVG Icon */}
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                          Sign in with Google to Connect Sheets
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center mt-2">
                    Permission requested: view and update your "DreadSwipe - Horror Movie Vault" spreadsheet in Google Drive.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
export default GoogleSheetsModal;
