import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrimaryVibe, DreadIntensity, OnboardingPreferences, GoogleSheetsSyncState } from '../types';
import { PRIMARY_VIBES, APP_NAME, APP_PITCH, APP_TAGLINE } from '../constants';
import DreadDial from './DreadDial';
import { Flame, ShieldAlert, Sparkles, Check, Info, Skull, ChevronRight, UploadCloud, FileSpreadsheet } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (preferences: OnboardingPreferences) => void;
  onOpenImport?: () => void;
  onOpenSheetsModal?: () => void;
  syncState?: GoogleSheetsSyncState;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  isOpen, 
  onComplete, 
  onOpenImport,
  onOpenSheetsModal,
  syncState
}) => {
  const [selectedVibes, setSelectedVibes] = useState<PrimaryVibe[]>([
    'Elevated',
    'Folk / Ritual',
    'Cerebral Sci-Fi',
    'International Arthouse'
  ]);
  const [dreadIntensity, setDreadIntensity] = useState<DreadIntensity>(3);
  const [noHorrorComedy, setNoHorrorComedy] = useState<boolean>(true);
  const [subtitledOk, setSubtitledOk] = useState<boolean>(true);
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const toggleVibe = (vibe: PrimaryVibe) => {
    if (selectedVibes.includes(vibe)) {
      if (selectedVibes.length > 1) {
        setSelectedVibes(selectedVibes.filter(v => v !== vibe));
      }
    } else {
      setSelectedVibes([...selectedVibes, vibe]);
    }
  };

  const handleFinish = () => {
    onComplete({
      vibes: selectedVibes,
      dreadIntensity,
      noHorrorComedy,
      subtitledOk
    });
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
          className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden my-auto"
        >
          {/* Ambient red bleed background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-900/10 blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="mb-2 relative z-10 border-b border-zinc-850 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-500" /> Taste Protocol
                </span>
                <span className="text-zinc-500 text-[10px] font-mono">Step {step} of 2</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {step === 1 ? `${selectedVibes.length} Selected` : 'Calibration'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              Set up your film taste — 2 quick steps
            </p>
          </div>

          {step === 1 ? (
            /* STEP 1: Primary Vibe Chips Selection */
            <div className="space-y-2 relative z-10">
              {/* Condensed Welcome Intro Panel */}
              <div id="onboarding-welcome-panel" className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-300 leading-snug">
                Swipe to build your horror/cult/arthouse watchlist — right to save, up to super-like.
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Select Core Vibe DNA
                </h3>
                <p className="text-[10px] text-zinc-400">Pick the subgenres you want in your deck.</p>
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
                          ? 'bg-zinc-900 border-red-500/80 shadow-sm shadow-red-950/30'
                          : 'bg-zinc-950/70 border-zinc-850 hover:border-zinc-700 opacity-60 hover:opacity-100'
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

              <div className="pt-0.5 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/40 transition-all active:scale-95"
                >
                  <span>Continue to Dread Calibration</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {onOpenSheetsModal && (
                  <button
                    type="button"
                    onClick={onOpenSheetsModal}
                    className="w-full text-center text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>
                      {syncState?.isConnected ? '✓ Google Sheets Master Vault Linked' : 'Connect Google Sheets to auto-load watched films'}
                    </span>
                  </button>
                )}

                {onOpenImport && (
                  <button
                    type="button"
                    onClick={onOpenImport}
                    className="w-full text-center text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1 transition-colors"
                  >
                    <UploadCloud className="w-3 h-3 text-zinc-400" />
                    <span>Or upload Letterboxd watched.csv manually</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: Intensity Dial & Hard Excludes */
            <div className="space-y-2 relative z-10">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Dread Calibration
                </h3>
                <p className="text-[10px] text-zinc-400">Choose how intense you want it</p>
              </div>

              <DreadDial
                value={dreadIntensity}
                onChange={setDreadIntensity}
                label="BASELINE DREAD INTENSITY"
              />

              {/* Hard Exclude Filter */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 text-red-500" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300">
                      Exclusions & Palate
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setNoHorrorComedy(!noHorrorComedy)}
                  className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition-all ${
                    noHorrorComedy 
                      ? 'bg-red-950/30 border-red-600/50' 
                      : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                      noHorrorComedy ? 'bg-red-600 border-red-500 text-white' : 'border-zinc-700 bg-zinc-900'
                    }`}>
                      {noHorrorComedy && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-white uppercase tracking-tight">
                        ⛔ No Horror-Comedy
                      </div>
                      <p className="text-[9.5px] text-zinc-400 leading-tight">
                        Excludes parodies, slapstick gore, and comedy-horror.
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setSubtitledOk(!subtitledOk)}
                  className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition-all ${
                    subtitledOk 
                      ? 'bg-zinc-900 border-zinc-700' 
                      : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                      subtitledOk ? 'bg-zinc-100 border-white text-black' : 'border-zinc-700 bg-zinc-900'
                    }`}>
                      {subtitledOk && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-white uppercase tracking-tight">
                        Subtitled & International Extremity
                      </div>
                      <p className="text-[9.5px] text-zinc-400 leading-tight">
                        Includes French extremity, Asian horror, and Nordic cinema.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-0.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-zinc-500 hover:text-zinc-300 font-bold uppercase text-[10px] tracking-wider px-2 py-1.5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-xs py-2 rounded-xl shadow-lg shadow-red-950/60 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Start Swiping</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingModal;
