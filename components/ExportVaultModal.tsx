import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserHistory, SwipedMovieRecord, GoogleSheetsSyncState } from '../types';
import { 
  generateLetterboxdCSV, 
  generateSheetsTSV, 
  generateMarkdownSlab, 
  generatePlainText,
  importWatchedList,
  ImportResult
} from '../services/sheetsService';
import { 
  Copy, 
  Check, 
  Download, 
  FileSpreadsheet, 
  Film, 
  FileText, 
  Code, 
  Flame,
  Bookmark,
  Heart,
  X,
  AlertCircle,
  UploadCloud,
  FileUp,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExportVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: UserHistory;
  onRefreshHistory: () => void;
  onOpenSheetsModal?: () => void;
  syncState?: GoogleSheetsSyncState;
  initialTab?: 'letterboxd' | 'sheets' | 'markdown' | 'plaintext' | 'import';
}

type TabType = 'letterboxd' | 'sheets' | 'markdown' | 'plaintext' | 'import';
type FilterCategory = 'all_liked' | 'sicko_only' | 'watchlist_only' | 'everything';

const ExportVaultModal: React.FC<ExportVaultModalProps> = ({
  isOpen,
  onClose,
  history,
  onRefreshHistory,
  onOpenSheetsModal,
  syncState,
  initialTab = 'letterboxd'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [category, setCategory] = useState<FilterCategory>('all_liked');
  const [copied, setCopied] = useState<string | null>(null);

  // Import state
  const [importInput, setImportInput] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter records based on active category
  const getFilteredRecords = (): SwipedMovieRecord[] => {
    switch (category) {
      case 'sicko_only':
        return history.sickoMode;
      case 'watchlist_only':
        return history.watchlist;
      case 'everything':
        return [...history.watched, ...history.watchlist];
      case 'all_liked':
      default:
        // Combine unique watched & sicko
        const map = new Map<number, SwipedMovieRecord>();
        [...history.sickoMode, ...history.watched].forEach(r => {
          map.set(r.movie.id, r);
        });
        return Array.from(map.values());
    }
  };

  const records = getFilteredRecords();

  const handleCopy = (text: string, formatName: string) => {
    navigator.clipboard.writeText(text);
    setCopied(formatName);
    try {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ef4444', '#dc2626', '#f87171']
      });
    } catch (e) {}

    setTimeout(() => {
      setCopied(null);
    }, 2500);
  };

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setImportInput(text);
        const res = importWatchedList(text);
        setImportResult(res);
        onRefreshHistory();
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleManualImport = () => {
    if (!importInput.trim()) return;
    const res = importWatchedList(importInput);
    setImportResult(res);
    onRefreshHistory();
  };

  // Content generators
  const letterboxdContent = generateLetterboxdCSV(records);
  const sheetsContent = generateSheetsTSV(records);
  const markdownContent = generateMarkdownSlab(records);
  const plaintextContent = generatePlainText(records);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.94, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 15 }}
          className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden my-auto flex flex-col max-h-[90vh]"
        >
          {/* Header with hidden option for import */}
          <div className="flex items-start justify-between pb-3.5 border-b border-zinc-800/80 mb-3.5 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600/20 text-red-500 border border-red-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest flex items-center gap-1">
                  <Film className="w-3 h-3" /> {activeTab === 'import' ? 'Upload Watched List' : 'Film Vault Export'}
                </span>
                {activeTab !== 'import' && (
                  <span className="text-xs font-mono text-zinc-500">
                    {records.length} Films
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1">
                {activeTab === 'import' ? 'Import Seen / Watched Films' : 'Export Vault'}
              </h2>
              <p className="text-xs text-zinc-400">
                {activeTab === 'import'
                  ? 'Upload your Letterboxd watched.csv or paste titles to exclude duplicates from your deck.'
                  : 'Copy formatted lists or download files for Letterboxd, Google Sheets, Obsidian, or Plain Text.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onOpenSheetsModal && (
                <button
                  type="button"
                  onClick={onOpenSheetsModal}
                  title="Google Sheets Master Vault"
                  className={`text-[11px] font-mono flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors ${
                    syncState?.isConnected
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${syncState?.isConnected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span className="hidden sm:inline">
                    {syncState?.isConnected ? 'Sheets Live' : 'Link Sheets'}
                  </span>
                  {syncState?.isConnected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              )}

              {activeTab !== 'import' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  title="Upload Watched List"
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">Import Watched</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('letterboxd')}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 transition-colors"
                >
                  <span>Back to Export</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {activeTab === 'import' ? (
            /* IMPORT VIEW */
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
              {importResult && (
                <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-2xl p-4 text-xs">
                  <div className="flex items-center gap-2 font-black uppercase text-emerald-300 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Import Complete!</span>
                  </div>
                  <p className="text-zinc-300">
                    Added <strong className="text-emerald-300">{importResult.importedCount}</strong> new films to your Watched Vault.
                    {importResult.matchedCuratedCount > 0 && (
                      <span> ({importResult.matchedCuratedCount} matched curated catalog titles).</span>
                    )}
                    {importResult.skippedCount > 0 && (
                      <span className="text-zinc-400"> {importResult.skippedCount} duplicates already existed.</span>
                    )}
                  </p>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDraggingFile
                    ? 'border-red-500 bg-red-950/30 scale-[0.99]'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />
                <FileUp className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h4 className="text-sm font-black uppercase tracking-tight text-white mb-1">
                  Upload Letterboxd Export CSV or Text List
                </h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Drag & drop your Letterboxd <code className="text-red-400 font-mono">watched.csv</code> or click to browse. Any movies found will be added to your Vault and excluded from future swipes.
                </p>
              </div>

              {/* Manual Paste Area */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-zinc-400 flex items-center justify-between">
                  <span>Or paste movie titles (one per line or CSV)</span>
                  <span className="text-[10px] font-mono text-zinc-500">e.g. The Substance (2024)</span>
                </label>
                <textarea
                  rows={4}
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder="Hereditary (2018)&#10;Midsommar&#10;The Witch&#10;Titane (2021)..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-zinc-200 placeholder-zinc-600 font-mono focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleManualImport}
                  disabled={!importInput.trim()}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition-all active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Import Pasted Films to Watched Vault</span>
                </button>
              </div>
            </div>
          ) : (
            /* EXPORT VIEW */
            <>
              {/* Google Sheets Persistent Memory Promo Banner */}
              {onOpenSheetsModal && (
                <div className="mb-3 p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block">
                        {syncState?.isConnected ? 'Persistent Google Sheets Memory Active' : 'Automatic Persistent Memory via Google Sheets'}
                      </span>
                      <span className="text-[11px] text-zinc-400 block truncate">
                        {syncState?.isConnected
                          ? `Master Sheet: ${syncState.spreadsheetTitle || 'DreadSwipe Vault'} (${syncState.recordCount || records.length} records)`
                          : 'Auto-sync swiped films directly to a master sheet so you never need to re-upload again.'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSheetsModal}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase shrink-0 transition-colors ${
                      syncState?.isConnected
                        ? 'bg-emerald-900/60 hover:bg-emerald-850 text-emerald-200 border border-emerald-700/60'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                    }`}
                  >
                    {syncState?.isConnected ? 'Manage' : 'Connect Sheets'}
                  </button>
                </div>
              )}

              {/* Category Filter Pills */}
          <div className="flex items-center gap-2 mb-3.5 overflow-x-auto pb-1 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 shrink-0 mr-1">
              Source:
            </span>
            <button
              onClick={() => setCategory('all_liked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 shrink-0 ${
                category === 'all_liked'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Liked ({history.watched.length})</span>
            </button>
            <button
              onClick={() => setCategory('sicko_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 shrink-0 ${
                category === 'sicko_only'
                  ? 'bg-rose-700 text-white shadow-md shadow-rose-950'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Sicko ({history.sickoMode.length})</span>
            </button>
            <button
              onClick={() => setCategory('watchlist_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 shrink-0 ${
                category === 'watchlist_only'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-300" />
              <span>Queue ({history.watchlist.length})</span>
            </button>
          </div>

          {/* Tab Navigation (4 clean export options) */}
          <div className="grid grid-cols-4 gap-1 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 mb-3.5 shrink-0">
            <button
              onClick={() => setActiveTab('letterboxd')}
              className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                activeTab === 'letterboxd'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-orange-400" />
              <span className="truncate">Letterboxd</span>
            </button>

            <button
              onClick={() => setActiveTab('sheets')}
              className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                activeTab === 'sheets'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
              <span className="truncate">Sheets TSV</span>
            </button>

            <button
              onClick={() => setActiveTab('markdown')}
              className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                activeTab === 'markdown'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate">Markdown</span>
            </button>

            <button
              onClick={() => setActiveTab('plaintext')}
              className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                activeTab === 'plaintext'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate">Plain Text</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
            {records.length === 0 ? (
              <div className="py-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-6">
                <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h4 className="text-sm font-black uppercase tracking-wider text-zinc-300">
                  No films in this category yet
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Swipe right on movies or super-like to add films to your vault.
                </p>
              </div>
            ) : (
              <>
                {activeTab === 'letterboxd' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-orange-950/20 border border-orange-900/40 rounded-xl p-3 text-xs text-orange-300">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-orange-400 shrink-0" />
                        <span>
                          <strong>Letterboxd Ready:</strong> Complies with standard Letterboxd list & diary import columns.
                        </span>
                      </div>
                      <a 
                        href="https://letterboxd.com/import/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-orange-400 underline flex items-center gap-1 shrink-0 ml-2 font-mono text-[11px]"
                      >
                        letterboxd.com/import
                      </a>
                    </div>

                    <div className="relative">
                      <pre className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                        {letterboxdContent}
                      </pre>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleCopy(letterboxdContent, 'letterboxd')}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition-all active:scale-95"
                      >
                        {copied === 'letterboxd' ? (
                          <>
                            <Check className="w-4 h-4 text-green-300" />
                            <span>Letterboxd CSV Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Letterboxd CSV Block</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadFile(letterboxdContent, `dreadswipe_letterboxd_${category}.csv`, 'text/csv')}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download .csv</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'sheets' && (
                  <div className="space-y-3">
                    <div className="bg-green-950/20 border border-green-900/40 rounded-xl p-3 text-xs text-green-300">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-green-400 shrink-0" />
                        <span>
                          <strong>Direct Google Sheets Paste:</strong> Copy this tab-separated block and paste directly (<kbd className="bg-green-950 px-1 py-0.5 rounded border border-green-800 font-mono">Cmd+V</kbd> / <kbd className="bg-green-950 px-1 py-0.5 rounded border border-green-800 font-mono">Ctrl+V</kbd>) into any empty Google Sheet row!
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <pre className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                        {sheetsContent}
                      </pre>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleCopy(sheetsContent, 'sheets')}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-950 transition-all active:scale-95"
                      >
                        {copied === 'sheets' ? (
                          <>
                            <Check className="w-4 h-4 text-green-200" />
                            <span>Sheets Block Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy TSV for Google Sheets Paste</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadFile(sheetsContent, `dreadswipe_sheets_${category}.tsv`, 'text/tab-separated-values')}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download .tsv</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'markdown' && (
                  <div className="space-y-3">
                    <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-3 text-xs text-blue-300">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>
                          <strong>Markdown Slab:</strong> Formatted for Obsidian, Notion, GitHub, Reddit, or film journal notes.
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <pre className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                        {markdownContent}
                      </pre>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleCopy(markdownContent, 'markdown')}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950 transition-all active:scale-95"
                      >
                        {copied === 'markdown' ? (
                          <>
                            <Check className="w-4 h-4 text-blue-200" />
                            <span>Markdown Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Markdown Slab</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadFile(markdownContent, `dreadswipe_vault_${category}.md`, 'text/markdown')}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download .md</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'plaintext' && (
                  <div className="space-y-3">
                    <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs text-purple-300">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>
                          <strong>Plain Text List:</strong> Lightweight numbered film list for messages or quick notes.
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <pre className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                        {plaintextContent}
                      </pre>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => handleCopy(plaintextContent, 'plaintext')}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950 transition-all active:scale-95"
                      >
                        {copied === 'plaintext' ? (
                          <>
                            <Check className="w-4 h-4 text-purple-200" />
                            <span>Plain Text Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Plain Text List</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExportVaultModal;
