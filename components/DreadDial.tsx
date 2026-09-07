import React from 'react';
import { DreadIntensity } from '../types';
import { DREAD_LEVELS } from '../constants';
import { Flame, ShieldAlert, AlertTriangle, Skull } from 'lucide-react';

interface DreadDialProps {
  value: DreadIntensity;
  onChange: (value: DreadIntensity) => void;
  label?: string;
  showDescription?: boolean;
}

const DreadDial: React.FC<DreadDialProps> = ({
  value,
  onChange,
  label = "DREAD INTENSITY DIAL",
  showDescription = true
}) => {
  const current = DREAD_LEVELS[value];

  return (
    <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
            {label}
          </span>
        </div>
        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${current.color}`}>
          {current.label} • Tier {value}/5
        </span>
      </div>

      {/* 5-Step Dial Selector */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-3">
        {([1, 2, 3, 4, 5] as DreadIntensity[]).map((level) => {
          const isSelected = value === level;
          const isPast = value >= level;
          const levelInfo = DREAD_LEVELS[level];

          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={`flex flex-col items-center justify-center py-2 px-1 min-h-[58px] sm:min-h-[64px] rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-red-600/20 border-red-500 shadow-lg shadow-red-950/50 scale-[1.03]'
                  : isPast
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  : 'bg-zinc-950 border-zinc-850 text-zinc-600 hover:border-zinc-700'
              }`}
            >
              <span className="text-sm sm:text-base mb-0.5">{levelInfo.skulls}</span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-center leading-tight">
                {levelInfo.short}
              </span>
            </button>
          );
        })}
      </div>

      {showDescription && (
        <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/60 rounded-xl px-3.5 py-2 border border-zinc-800/60">
          <span className="italic">"{current.description}"</span>
          <span className="font-mono text-zinc-500 ml-2 whitespace-nowrap">Tier {value}</span>
        </div>
      )}
    </div>
  );
};

export default DreadDial;
