import React, { useRef, useState } from 'react';
import { PrimaryVibe, DreadIntensity, FilterState } from '../types';
import { PRIMARY_VIBES } from '../constants';
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
  Globe
} from 'lucide-react';

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

// Short label mapper for vibe icons
const getShortVibeLabel = (id: PrimaryVibe) => {
  switch (id) {
    case 'Elevated':
      return 'Elevated';
    case 'Body Horror':
      return 'Body';
    case 'Folk / Ritual':
      return 'Folk';
    case 'Prestige Crime':
      return 'Crime';
    case 'Cerebral Sci-Fi':
      return 'Sci-Fi';
    case 'International Arthouse':
      return 'Arthouse';
    case 'Sicko Mode':
      return 'Deep End';
    default:
      return id;
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

  return (
    <div className="w-full max-w-sm sm:max-w-lg md:max-w-xl landscape:max-w-2xl px-2 shrink-0 z-30 relative">
      <div className="flex items-center justify-between bg-zinc-950/70 border border-zinc-800/60 rounded-2xl py-1 px-2.5 backdrop-blur-xl shadow-lg">
        {/* Filter Toggle Button (Clean icon with visible label - tap only) */}
        <button
          type="button"
          onClick={onToggleOpen}
          title={`Dread Calibration & Rules (${filters.selectedVibes.length} vibes active)`}
          aria-label="Filter Settings"
          className={`flex flex-col items-center justify-center shrink-0 transition-opacity active:scale-90 px-1 py-0.5 ${
            isOpen
              ? 'opacity-100 text-red-500'
              : 'opacity-40 hover:opacity-80 text-zinc-400'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[8px] font-medium leading-tight mt-0.5">Filter</span>
        </button>

        {/* Subtle Separator */}
        <div className="w-px h-6 bg-zinc-800/80 shrink-0 mx-1.5" />

        {/* Draggable Vibe Buttons with visible short text labels (Tap to toggle) */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex-1 flex items-center justify-around gap-1 overflow-x-auto py-0.5 px-0.5 no-scrollbar cursor-grab ${
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
                aria-label={v.title}
                className={`flex flex-col items-center justify-center shrink-0 transition-opacity active:scale-90 px-1 py-0.5 ${
                  isSelected
                    ? isSicko
                      ? 'opacity-100 text-red-500'
                      : 'opacity-100 text-zinc-100'
                    : 'opacity-30 hover:opacity-75 text-zinc-400'
                }`}
              >
                {getVibeIcon(v.id)}
                <span className={`text-[8px] font-medium leading-tight mt-0.5 ${
                  isSelected ? (isSicko ? 'text-red-400 font-bold' : 'text-zinc-200') : 'text-zinc-500'
                }`}>
                  {getShortVibeLabel(v.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {isOpen && (
        <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-3 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-red-500" />
                <span>Dread Calibration</span>
              </span>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Choose how intense you want it
              </p>
            </div>
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
                {filters.minDread === 5 ? '🔥 5★ Deep End Only' : `${filters.minDread}★ & Above`}
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

