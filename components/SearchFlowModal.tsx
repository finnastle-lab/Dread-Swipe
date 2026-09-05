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
          className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose-900/10 blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-zinc-800/80 mb-3 shrink-0 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-600/20 text-red-500 border border-red-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 text-red-500" /> New Search Protocol
                </span>
                <span className="text-zinc-500 text-xs font-mono">Step {activeStep} of 3</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>Start New Discovery Search</span>
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-emerald-400 font-mono">
                <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Your saved Vault ({totalSavedCount} films) is preserved and excluded from deck</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 mb-4 shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`py-2 px-2 rounded-xl text-xs font-black uppercase tracking-tight flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 1
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>1. Vibe DNA</span>
              <span className="text-[10px] opacity-80">({selectedVibes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`py-2 px-2 rounded-xl text-xs font-black uppercase tracking-tight flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 2
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>2. Dread & Rules</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`py-2 px-2 rounded-xl text-xs font-black uppercase tracking-tight flex items-center justify-center gap-1.5 transition-all ${
                activeStep === 3
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>3. Upload Seen</span>
            </button>
          </div>

          {/* STEP 1: Vibe DNA */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 relative z-10">
            {activeStep === 1 && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">
                      Configure Target Subgenres
                    </h3>
                    <p className="text-xs text-zinc-400">Choose the horror tones to seed your new deck.</p>
                  </div>
                  <span className="text-xs font-mono text-red-400 bg-red-950/50 border border-red-800/60 px-2.5 py-1 rounded-lg">
                    {selectedVibes.length} Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">
                  {PRIMARY_VIBES.map((vibe) => {
                    const isSelected = selectedVibes.includes(vibe.id);
                    return (
                      <button
                        key={vibe.id}
                        type="button"
                        onClick={() => toggleVibe(vibe.id)}
                        className={`text-left p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-zinc-900 border-red-500/80 shadow-md shadow-red-950/30'
                            : 'bg-zinc-950/60 border-zinc-850 hover:border-zinc-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-xs sm:text-sm font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                            {vibe.title}
                          </span>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border text-[10px] shrink-0 transition-colors ${
                            isSelected ? 'bg-red-600 border-red-500 text-white' : 'border-zinc-700 bg-zinc-900 text-transparent'
                          }`}>
                            ✓
                          </div>
                        </div>

                        <p className="text-[11px] text-zinc-400 italic mb-2 leading-tight">
                          "{vibe.subtext}"
                        </p>

                        <div className="flex flex-wrap gap-1 mt-auto">
                          {vibe.anchors.slice(0, 3).map((anchor, i) => (
                            <span key={i} className="text-[9px] bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                              {anchor}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Dread Intensity & Rules */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <DreadDial
                  value={dreadIntensity}
                  onChange={setDreadIntensity}
                  label="MINIMUM DREAD INTENSITY"
                />

                <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300">
                        Negative Filtration Rules
                      </span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setNoHorrorComedy(!noHorrorComedy)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      noHorrorComedy 
                        ? 'bg-red-950/30 border-red-600/50' 
                        : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center border shrink-0 ${
                      noHorrorComedy ? 'bg-red-600 border-red-500 text-white' : 'border-zinc-700 bg-zinc-900'
                    }`}>
                      {noHorrorComedy && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <span>⛔ Strictly No Horror-Comedy</span>
                        <span className="text-[9px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded font-mono">Recommended</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                        Excludes lighthearted parodies and comedy horror. Keeps the deck strictly dedicated to genuine dread and high-tension cinema.
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSubtitledOk(!subtitledOk)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      subtitledOk 
                        ? 'bg-zinc-900 border-zinc-700' 
                        : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center border shrink-0 ${
                      subtitledOk ? 'bg-zinc-100 border-white text-black' : 'border-zinc-700 bg-zinc-900'
                    }`}>
                      {subtitledOk && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-tight">
                        Subtitled & International Extremity Welcome
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                        Allows French Extremity, Asian psychological thrillers, and international festival masterworks (e.g. Martyrs, The Wailing, Titane).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Upload Watched & Liked List */}
            {activeStep === 3 && (
              <div className="space-y-3 animate-in fade-in">
                <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-3.5 text-xs text-zinc-300 space-y-1.5">
                  <div className="flex items-center gap-2 text-red-400 font-black uppercase tracking-wider">
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Watched & Liked (Optional)</span>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Drop your <strong>Letterboxd CSV</strong> or paste titles of films you've already seen or liked. DreadSwipe adds them to your Watched Vault so they <strong>never appear as duplicates</strong> in this search deck.
                  </p>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
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
                  <FileUp className="w-7 h-7 text-red-500 mx-auto mb-1.5" />
                  <p className="text-xs font-black uppercase tracking-wider text-white">
                    Drop Letterboxd CSV or Text file here
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    or click to browse (.csv, .txt, .tsv)
                  </p>
                </div>

                {/* Paste Text Area */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    Or Paste Film Titles:
                  </label>
                  <textarea
                    rows={3}
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="The Substance (2024)&#10;Hereditary (2018)&#10;Titane&#10;Martyrs&#10;Kill List"
                    className="w-full bg-black/80 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500"
                  />
                  {importInput.trim() && (
                    <button
                      type="button"
                      onClick={handleManualImport}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-black uppercase text-xs py-2 rounded-xl transition-all"
                    >
                      Process & Mark Watched
                    </button>
                  )}
                </div>

                {/* Import Confirmation Banner */}
                {importResult && (
                  <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-3 text-xs text-emerald-300 space-y-1">
                    <div className="flex items-center gap-2 font-black uppercase tracking-wider text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{importResult.importedCount} Films Imported & Excluded from Deck</span>
                    </div>
                    <p className="text-zinc-300 text-[11px]">
                      Your Vault has been updated. None of these films will appear in your new discovery search.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-zinc-800/80 mt-3 flex items-center justify-between gap-3 shrink-0 relative z-10">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="text-zinc-400 hover:text-white font-black uppercase text-xs px-3 py-2 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                <span>Vault: {totalSavedCount} films</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleLaunch}
                className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl shadow-xl shadow-red-950 transition-all active:scale-95 flex items-center gap-2"
              >
                <Flame className="w-4 h-4" />
                <span>Launch New Search Deck</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchFlowModal;
