import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrimaryVibe, DreadIntensity, FilterState, UserHistory } from '../types';
import { PRIMARY_VIBES, APP_NAME, APP_TAGLINE } from '../constants';
import DreadDial from './DreadDial';
import { 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Check, 
  UploadCloud, 
  FileUp, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  ChevronLeft,
  RotateCcw,
  Film,
  Lock,
  Heart
} from 'lucide-react';
import { importWatchedList, ImportResult } from '../services/sheetsService';
import confetti from 'canvas-confetti';

interface SearchFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterState;
  onLaunchNewSearch: (newFilters: FilterState) => void;
  history: UserHistory;
  onRefreshHistory: () => void;
}

const SearchFlowModal: React.FC<SearchFlowModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onLaunchNewSearch,
  history,
  onRefreshHistory
}) => {
  const [selectedVibes, setSelectedVibes] = useState<PrimaryVibe[]>(currentFilters.selectedVibes);
  const [dreadIntensity, setDreadIntensity] = useState<DreadIntensity>(currentFilters.minDread);
  const [noHorrorComedy, setNoHorrorComedy] = useState<boolean>(currentFilters.noHorrorComedy);
  const [subtitledOk, setSubtitledOk] = useState<boolean>(currentFilters.subtitledOk);
  
  // Step tracking: 1 = Vibes, 2 = Dread & Rules, 3 = Optional Upload Seen
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Import Watched / Liked state
  const [importInput, setImportInput] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const totalSavedCount = history.watched.length + history.watchlist.length + history.sickoMode.length;

  const toggleVibe = (vibe: PrimaryVibe) => {
    if (selectedVibes.includes(vibe)) {
      if (selectedVibes.length > 1) {
        setSelectedVibes(selectedVibes.filter(v => v !== vibe));
      }
    } else {
      setSelectedVibes([...selectedVibes, vibe]);
    }
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
        try {
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.7 }
          });
        } catch (err) {}
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

  const handleLaunch = () => {
    onLaunchNewSearch({
      ...currentFilters,
      selectedVibes,
      minDread: dreadIntensity,
      noHorrorComedy,
      subtitledOk
    });
    onClose();
  };

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
          className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl relative overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose-900/10 blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 mb-1.5 shrink-0 relative z-10">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white truncate">
                  Start New Discovery Search
                </h2>
                <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded">
                  Step {activeStep}/3
                </span>
              </div>
              <p className="text-[9.5px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5 truncate">
                <Lock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                <span>Saved Vault ({totalSavedCount} films) preserved and excluded from deck</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 mb-2 shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`py-1 px-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-tight flex items-center justify-center gap-1 transition-all ${
                activeStep === 1
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>1. Vibe DNA</span>
              <span className="text-[9px] opacity-80">({selectedVibes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`py-1 px-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-tight flex items-center justify-center gap-1 transition-all ${
                activeStep === 2
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>2. Exclusions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`py-1 px-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-tight flex items-center justify-center gap-1 transition-all ${
                activeStep === 3
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UploadCloud className="w-3 h-3" />
              <span>3. Upload Seen</span>
            </button>
          </div>

          {/* STEP 1: Vibe DNA */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0 relative z-10">
            {activeStep === 1 && (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-200">
                      Configure Target Subgenres
                    </h3>
                    <p className="text-[10px] text-zinc-400">Choose the horror tones to seed your new deck.</p>
                  </div>
                  <span className="text-[10px] font-mono text-red-400 bg-red-950/50 border border-red-800/60 px-1.5 py-0.5 rounded">
                    {selectedVibes.length} Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-[46vh] sm:max-h-[48vh] overflow-y-auto pr-0.5">
                  {PRIMARY_VIBES.map((vibe) => {
                    const isSelected = selectedVibes.includes(vibe.id);
                    return (
                      <button
                        key={vibe.id}
                        type="button"
                        onClick={() => toggleVibe(vibe.id)}
                        className={`text-left p-2 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-zinc-900 border-red-500/80 shadow-md shadow-red-950/30'
                            : 'bg-zinc-950/60 border-zinc-850 hover:border-zinc-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                            {vibe.title}
                          </span>
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] shrink-0 transition-colors ${
                            isSelected ? 'bg-red-600 border-red-500 text-white' : 'border-zinc-700 bg-zinc-900 text-transparent'
                          }`}>
                            ✓
                          </div>
                        </div>

                        <p className="text-[9.5px] text-zinc-400 italic line-clamp-1 leading-tight">
                          "{vibe.subtext}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Dread Intensity & Rules */}
            {activeStep === 2 && (
              <div className="space-y-2 animate-in fade-in">
                <DreadDial
                  value={dreadIntensity}
                  onChange={setDreadIntensity}
                  label="MINIMUM DREAD INTENSITY"
                />

                <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                      Exclusions
                    </span>
                  </div>

                  <div 
                    onClick={() => setNoHorrorComedy(!noHorrorComedy)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      noHorrorComedy 
                        ? 'bg-red-950/30 border-red-600/50' 
                        : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      noHorrorComedy ? 'bg-red-600 border-red-500 text-white' : 'border-zinc-700 bg-zinc-900'
                    }`}>
                      {noHorrorComedy && <Check className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-white tracking-tight">
                          No horror-comedy
                        </span>
                        <span className="text-[8.5px] bg-red-600/20 text-red-400 px-1 py-0.2 rounded font-mono">Recommended</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        Excludes parodies and comedy-horror.
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSubtitledOk(!subtitledOk)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      subtitledOk 
                        ? 'bg-zinc-900 border-zinc-700' 
                        : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      subtitledOk ? 'bg-zinc-100 border-white text-black' : 'border-zinc-700 bg-zinc-900'
                    }`}>
                      {subtitledOk && <Check className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-white tracking-tight block">
                        Subtitles & world horror OK
                      </span>
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        Includes French, Asian, and Nordic extremity.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Upload Watched & Liked List */}
            {activeStep === 3 && (
              <div className="space-y-2 animate-in fade-in">
                <div className="bg-red-950/20 border border-red-900/40 rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-300">
                  Optional — import a Letterboxd CSV or paste titles you've already seen so they never repeat in the deck.
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-red-500 bg-red-950/40 scale-[1.01]'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <FileUp className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                    Drop Letterboxd CSV or text file
                  </p>
                  <p className="text-[9.5px] text-zinc-500">
                    or click to browse (.csv, .txt, .tsv)
                  </p>
                </div>

                {/* Paste Text Area */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Or paste film titles:
                  </label>
                  <textarea
                    rows={2}
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="The Substance (2024), Hereditary, Titane, Martyrs..."
                    className="w-full bg-black/80 border border-zinc-800 rounded-lg p-2 text-[11px] font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500"
                  />
                  {importInput.trim() && (
                    <button
                      type="button"
                      onClick={handleManualImport}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold uppercase text-[11px] py-1.5 rounded-lg transition-all"
                    >
                      Process & Mark Watched
                    </button>
                  )}
                </div>

                {/* Import Confirmation Banner */}
                {importResult && (
                  <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-2.5 text-xs text-emerald-300 space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{importResult.importedCount} Films Imported & Excluded</span>
                    </div>
                    <p className="text-zinc-300 text-[10px]">
                      Your Vault has been updated. Excluded from your new discovery search.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="pt-2 border-t border-zinc-800/80 mt-2 flex items-center justify-between gap-2 shrink-0 relative z-10">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="text-zinc-400 hover:text-white font-bold uppercase text-[11px] px-2 py-1.5 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div className="text-[9.5px] font-mono text-zinc-500 flex items-center gap-1">
                <span>Vault: {totalSavedCount} films</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold uppercase tracking-wider text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleLaunch}
                className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-[11px] px-3.5 py-1.5 rounded-xl shadow-xl shadow-red-950 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Launch Deck</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchFlowModal;
