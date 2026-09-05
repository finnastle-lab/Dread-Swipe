import React, { useRef, useState } from 'react';
import { PrimaryVibe, DreadIntensity, FilterState } from '../types';
import { PRIMARY_VIBES, DREAD_LEVELS } from '../constants';
import { 
  Filter, 
  Flame, 
  Sparkles, 
  X, 
  GraduationCap, 
  Activity, 
  Trees, 
  ShieldAlert, 
  Cpu, 
  Globe,
  CheckCircle2,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

// Icon mapper for vibe IDs
const getVibeIcon = (id: PrimaryVibe) => {
  switch (id) {
    case 'Elevated':
      return <GraduationCap className="w-4 h-4" />;
    case 'Body Horror':
      return <Activity className="w-4 h-4" />;
    case 'Folk / Ritual':
      return <Trees className="w-4 h-4" />;
    case 'Prestige Crime':
      return <ShieldAlert className="w-4 h-4" />;
    case 'Cerebral Sci-Fi':
      return <Cpu className="w-4 h-4" />;
    case 'International Arthouse':
      return <Globe className="w-4 h-4" />;
    case 'Sicko Mode':
      return <Flame className="w-4 h-4 text-red-500" />;
    default:
      return <Sparkles className="w-4 h-4" />;
  }
};

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  isOpen,
  onToggleOpen
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hoveredVibe, setHoveredVibe] = useState<PrimaryVibe | 'settings' | null>(null);

  const toggleVibe = (vibe: PrimaryVibe) => {
    let next: PrimaryVibe[];
    if (filters.selectedVibes.includes(vibe)) {
      if (filters.selectedVibes.length === 1) return; // keep at least 1 active
      next = filters.selectedVibes.filter(v => v !== vibe);
    } else {
      next = [...filters.selectedVibes, vibe];
    }
    onFilterChange({ ...filters, selectedVibes: next });
  };

  // Mouse Drag to Scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const hoveredVibeDef = PRIMARY_VIBES.find(v => v.id === hoveredVibe);

  return (
    <div className="w-full max-w-sm sm:max-w-md px-3 shrink-0 z-30 relative">
      <div className="flex items-center justify-between bg-zinc-950/70 border border-zinc-800/60 rounded-full py-1 px-2.5 backdrop-blur-xl shadow-lg">
        {/* Filter Toggle Button (Clean icon, no clunky holding shape) */}
        <button
          type="button"
          onClick={onToggleOpen}
          onMouseEnter={() => setHoveredVibe('settings')}
          onMouseLeave={() => setHoveredVibe(null)}
          title={`Dread Calibration & Rules (${filters.selectedVibes.length} vibes active)`}
          aria-label="Filter Settings"
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-opacity active:scale-90 ${
            isOpen
              ? 'opacity-100 text-red-500'
              : 'opacity-40 hover:opacity-80 text-zinc-400'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>

        {/* Subtle Separator */}
        <div className="w-px h-3.5 bg-zinc-800/80 shrink-0 mx-1.5" />

        {/* Draggable & Minimal Icon-Only Vibe Buttons */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={() => {
            handleMouseUpOrLeave();
            setHoveredVibe(null);
          }}
          className={`flex-1 flex items-center justify-around gap-1.5 overflow-x-auto py-0.5 px-0.5 no-scrollbar cursor-grab ${
            isDragging ? 'cursor-grabbing select-none' : ''
          }`}
        >
          {PRIMARY_VIBES.map((v) => {
            const isSelected = filters.selectedVibes.includes(v.id);
            const isSicko = v.id === 'Sicko Mode';

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => toggleVibe(v.id)}
                onMouseEnter={() => {
                  if (!isDragging) setHoveredVibe(v.id);
                }}
                onMouseLeave={() => setHoveredVibe(null)}
                title={`${v.title} — ${v.subtext}`}
                aria-label={v.title}
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-opacity active:scale-90 ${
                  isSelected
                    ? isSicko
                      ? 'opacity-100 text-red-500'
                      : 'opacity-100 text-zinc-100'
                    : 'opacity-30 hover:opacity-75 text-zinc-400'
                }`}
              >
                {getVibeIcon(v.id)}
              </button>
            );
          })}
        </div>
      </div>

      {/* HOVER EXPLAINER TOOLTIP POPUP (Matches style of bottom action buttons) */}
      <AnimatePresence>
        {hoveredVibe && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-3 right-3 top-11 z-40 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl pointer-events-none"
          >
            {hoveredVibe === 'settings' ? (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-400 shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-white tracking-tight">
                      Dread Deck Calibration
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      Click to open
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    Fine-tune minimum dread score (1★ to 5★), strict horror-comedy exclusions, and subtitled extremity settings.
                  </p>
                </div>
              </div>
            ) : hoveredVibeDef ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-400 shrink-0">
                      {getVibeIcon(hoveredVibeDef.id)}
                    </div>
                    <span className="text-xs font-black uppercase text-white tracking-tight">
                      {hoveredVibeDef.title}
                    </span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    filters.selectedVibes.includes(hoveredVibeDef.id)
                      ? 'bg-red-950 text-red-300 border-red-600'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}>
                    {filters.selectedVibes.includes(hoveredVibeDef.id) ? 'Active in Deck' : 'Disabled'}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 italic leading-snug">
                  "{hoveredVibeDef.subtext}"
                </p>

                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto text-[9px] font-mono text-zinc-400">
                  <span className="text-zinc-500 shrink-0 uppercase font-black text-[8px]">Anchors:</span>
                  <span className="text-zinc-300 truncate">
                    {hoveredVibeDef.anchors.slice(0, 3).join(' • ')}
                  </span>
                </div>

                <div className="text-[9px] font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-900 pt-1 mt-1">
                  <span>Click icon to toggle on/off</span>
                  <span>{filters.selectedVibes.includes(hoveredVibeDef.id) ? '✓ Included' : '✕ Excluded'}</span>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Filter Panel */}
      {isOpen && (
        <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-3 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-red-500" />
              <span>Dread Deck Calibration</span>
            </span>
            <button 
              type="button"
              onClick={onToggleOpen} 
              className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vibe Selection Legend */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">
                Active Vibes ({filters.selectedVibes.length}/7):
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMARY_VIBES.map((v) => {
                const isSelected = filters.selectedVibes.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVibe(v.id)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border text-left ${
                      isSelected
                        ? v.id === 'Sicko Mode'
                          ? 'bg-red-950/90 text-red-300 border-red-500'
                          : 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    {getVibeIcon(v.id)}
                    <span className="truncate">{v.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">
                Min Dread Score:
              </label>
              <span className="text-[10px] font-mono text-red-400 font-bold">
                {filters.minDread === 5 ? '🔥 5★ Sicko Only' : `${filters.minDread}★ & Above`}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {([1, 2, 3, 4, 5] as DreadIntensity[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, minDread: d })}
                  className={`py-1 rounded-lg text-xs font-mono font-black transition-all border ${
                    filters.minDread === d
                      ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-950'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {d === 5 ? '🔥 5★' : `${d}★`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
            <label className="text-xs text-zinc-300 font-bold uppercase flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.noHorrorComedy}
                onChange={(e) => onFilterChange({ ...filters, noHorrorComedy: e.target.checked })}
                className="rounded accent-red-600 w-4 h-4 cursor-pointer"
              />
              <span>Hard Exclude Horror-Comedy</span>
            </label>
            <span className="text-[9px] font-mono text-zinc-500">Strict mode</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;

