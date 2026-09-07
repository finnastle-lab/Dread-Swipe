import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Movie, SwipeDirection } from '../types';
import { DREAD_LEVELS } from '../constants';
import { fetchMovieByTitle } from '../services/tmdbService';
import { Flame, Bookmark, Heart, X, Film, Undo2 } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
  onAction?: (direction: SwipeDirection) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  onSwipe, 
  isTop, 
  onAction, 
  onUndo, 
  canUndo 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dynamicPoster, setDynamicPoster] = useState<string | null>(null);

  // Reset state when movie changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setDynamicPoster(null);
  }, [movie.id, movie.poster_path]);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Dynamic transforms based on horizontal drag
  const rotate = useTransform(x, [-250, 250], [-16, 16]);
  const opacity = useTransform(x, [-250, -180, 0, 180, 250], [0, 0.7, 1, 0.7, 0]);

  // Visual feedback stamps opacity
  const nopeOpacity = useTransform(x, [-120, -40, 0], [1, 0.4, 0]); // Drag Left -> Passed / Rotten
  const likeOpacity = useTransform(x, [0, 40, 120], [0, 0.4, 1]); // Drag Right -> Liked / Watched
  const sickoOpacity = useTransform(y, [-120, -40, 0], [1, 0.4, 0]); // Drag Up -> Sicko Mode / The Deep End
  const watchlistOpacity = useTransform(y, [0, 40, 120], [0, 0.4, 1]); // Drag Down -> Watchlist

  const handleDragEnd = (_: any, info: any) => {
    const thresholdX = 75;
    const thresholdY = 75;
    const { x: dragX, y: dragY } = info.offset;

    // Detect dominant swipe axis
    if (Math.abs(dragX) > Math.abs(dragY)) {
      if (dragX < -thresholdX) {
        onSwipe(SwipeDirection.LEFT);
      } else if (dragX > thresholdX) {
        onSwipe(SwipeDirection.RIGHT);
      }
    } else {
      if (dragY < -thresholdY) {
        onSwipe(SwipeDirection.UP);
      } else if (dragY > thresholdY) {
        onSwipe(SwipeDirection.DOWN);
      }
    }
  };

  const dreadInfo = DREAD_LEVELS[movie.dreadScore] || DREAD_LEVELS[3];

  // Poster resolution logic (High quality TMDB w500)
  const getPosterUrl = (): string | null => {
    if (dynamicPoster) return dynamicPoster;
    if (movie.poster_path) {
      if (movie.poster_path.startsWith('http')) {
        return movie.poster_path;
      }
      return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    }
    if (movie.backdrop_path) {
      if (movie.backdrop_path.startsWith('http')) {
        return movie.backdrop_path;
      }
      return `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`;
    }
    return null;
  };

  const posterSrc = getPosterUrl();

  const handleImageError = async () => {
    // If primary poster failed, try backdrop first
    if (!dynamicPoster && movie.backdrop_path && !posterSrc?.includes(movie.backdrop_path)) {
      setDynamicPoster(`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`);
      return;
    }

    // Attempt dynamic lookup from TMDB search if still failing
    if (!dynamicPoster && movie.title) {
      try {
        const found = await fetchMovieByTitle(movie.title);
        if (found && found.poster_path) {
          setDynamicPoster(`https://image.tmdb.org/t/p/w500${found.poster_path}`);
          return;
        }
      } catch (e) {
        // fail silently
      }
    }

    setImageError(true);
  };

  if (!isTop) {
    return (
      <div className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl pointer-events-none transform scale-[0.96] translate-y-2 opacity-40 border border-zinc-800 bg-zinc-950 transition-all flex flex-col landscape:flex-row">
        <div className="portrait:w-full portrait:h-full portrait:absolute portrait:inset-0 landscape:w-[38%] sm:landscape:w-[40%] landscape:h-full relative overflow-hidden bg-zinc-950 shrink-0">
          {posterSrc && !imageError ? (
            <img
              src={posterSrc}
              alt={movie.title}
              referrerPolicy="no-referrer"
              loading="eager"
              className="w-full h-full object-cover grayscale"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
              <Film className="w-16 h-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        </div>
        <div className="portrait:hidden landscape:flex landscape:w-[62%] sm:landscape:w-[60%] landscape:h-full bg-zinc-900/30 border-l border-zinc-800/40" />
      </div>
    );
  }

  return (
    <motion.div
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.015 }}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing rounded-3xl overflow-hidden shadow-2xl border select-none bg-zinc-950 border-zinc-800/90 shadow-black flex flex-col landscape:flex-row"
    >
      {/* 1. POSTER COLUMN (Full card background in portrait, left column in landscape) */}
      <div className="portrait:absolute portrait:inset-0 portrait:w-full portrait:h-full landscape:relative landscape:w-[38%] sm:landscape:w-[40%] landscape:h-full shrink-0 overflow-hidden bg-zinc-950">
        {posterSrc && !imageError ? (
          <div className="relative w-full h-full bg-zinc-950">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-zinc-900/90 animate-pulse flex items-center justify-center z-0">
                <Film className="w-12 h-12 text-zinc-700 animate-bounce" />
              </div>
            )}
            <img
              src={posterSrc}
              alt={movie.title}
              referrerPolicy="no-referrer"
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 relative z-[1] ${
                imageLoaded ? 'opacity-100' : 'opacity-80'
              }`}
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 text-center">
            <Film className="w-14 h-14 text-zinc-700 mb-3" />
            <h3 className="text-xl font-black uppercase text-white tracking-tight leading-tight">{movie.title}</h3>
            <p className="text-zinc-400 text-xs mt-1">{movie.year} • dir. {movie.director || 'Unknown'}</p>
          </div>
        )}

        {/* Top Vignette overlay on poster (portrait only) */}
        <div className="portrait:block landscape:hidden absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-transparent h-24 pointer-events-none z-[2]" />

        {/* Top Badges in Portrait: Vibe Chips on Left, Rating Pill on Right */}
        <div className="portrait:flex landscape:hidden absolute top-3 inset-x-3 items-center justify-between gap-2 z-10 pointer-events-none">
          <div className="flex flex-wrap gap-1 max-w-[70%]">
            {movie.vibes.slice(0, 2).map((vibe, idx) => (
              <span
                key={idx}
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-md shadow-md ${
                  vibe === 'Sicko Mode'
                    ? 'bg-red-950/90 text-red-300 border-red-500 animate-pulse'
                    : 'bg-black/75 text-zinc-200 border-zinc-700/80'
                }`}
              >
                {vibe === 'Sicko Mode' ? '🔥 Deep End' : vibe}
              </span>
            ))}
          </div>

          <div className="bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
            <span>★</span>
            <span>{movie.vote_average ? movie.vote_average.toFixed(1) : '7.0'}</span>
          </div>
        </div>
      </div>

      {/* PORTRAIT BOTTOM DETAILS OVERLAY (Visible in portrait mode, hidden in landscape) */}
      <div className="portrait:flex landscape:hidden absolute bottom-0 inset-x-0 p-3.5 pb-3.5 sm:p-4 sm:pb-4 flex-col justify-end z-10 bg-gradient-to-t from-black via-black/90 via-55% to-transparent pt-14 pointer-events-none">
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight mb-1 drop-shadow-md line-clamp-1">
          {movie.title}
        </h2>

        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300 mb-1.5 flex-wrap">
          <span className="bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700/80 font-bold text-white shadow-sm text-[10px]">
            {movie.year}
          </span>
          {movie.director && (
            <span className="text-zinc-300 truncate max-w-[160px] sm:max-w-[200px]">
              dir. <strong className="text-white font-medium">{movie.director}</strong>
            </span>
          )}
          {movie.runtime && (
            <span className="text-zinc-400 text-[10px]">• {movie.runtime}</span>
          )}
        </div>

        <p className="text-xs text-zinc-300/90 leading-relaxed drop-shadow-sm line-clamp-2">
          {movie.overview}
        </p>
      </div>

      {/* 2. LANDSCAPE RIGHT COLUMN (Title, Metadata, Overview, and Action Buttons) */}
      <div className="portrait:hidden landscape:flex landscape:w-[62%] sm:landscape:w-[60%] landscape:h-full flex-col justify-between p-3.5 sm:p-5 bg-gradient-to-br from-zinc-900/95 via-zinc-950/95 to-black backdrop-blur-xl border-l border-zinc-800/80 min-h-0 relative z-10">
        {/* Top: Header Info */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex flex-wrap gap-1">
              {movie.vibes.map((vibe, idx) => (
                <span
                  key={idx}
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    vibe === 'Sicko Mode'
                      ? 'bg-red-950/90 text-red-300 border-red-500'
                      : 'bg-zinc-900/90 text-zinc-200 border-zinc-700/80'
                  }`}
                >
                  {vibe === 'Sicko Mode' ? '🔥 Deep End' : vibe}
                </span>
              ))}
            </div>

            <div className="bg-black/80 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md shrink-0">
              <span>★</span>
              <span>{movie.vote_average ? movie.vote_average.toFixed(1) : '7.0'}</span>
            </div>
          </div>

          <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-white leading-tight mb-1 line-clamp-1">
            {movie.title}
          </h2>

          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-zinc-400 mb-2 flex-wrap">
            <span className="bg-zinc-800/90 px-1.5 py-0.5 rounded border border-zinc-700/80 font-bold text-white text-[10px]">
              {movie.year}
            </span>
            {movie.director && (
              <span className="text-zinc-300 truncate max-w-[180px] sm:max-w-[240px]">
                dir. <strong className="text-white font-medium">{movie.director}</strong>
              </span>
            )}
            {movie.runtime && (
              <span className="text-zinc-500 text-[10px]">• {movie.runtime}</span>
            )}
          </div>
        </div>

        {/* Middle: Scrollable Synopsis */}
        <div className="flex-1 overflow-y-auto min-h-0 my-1 pr-1.5 scrollbar-thin">
          <p className="text-xs sm:text-[13px] text-zinc-300/90 leading-relaxed drop-shadow-sm">
            {movie.overview}
          </p>
        </div>

        {/* Bottom: Action Buttons Pod on Landscape */}
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="pt-2 sm:pt-2.5 border-t border-zinc-850 flex items-center justify-between gap-2 shrink-0 cursor-default"
        >
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Pass / Rotten (Left) */}
            <button
              type="button"
              title="Pass / Rotten (Left Arrow)"
              onClick={() => (onAction ? onAction(SwipeDirection.LEFT) : onSwipe(SwipeDirection.LEFT))}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-zinc-900 border border-zinc-800 hover:border-red-500/70 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 shadow-md transition-all active:scale-90"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Watchlist Queue (Down) */}
            <button
              type="button"
              title="Add to Watchlist (Down Arrow)"
              onClick={() => (onAction ? onAction(SwipeDirection.DOWN) : onSwipe(SwipeDirection.DOWN))}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-zinc-900 border border-zinc-800 hover:border-amber-500/70 rounded-full flex items-center justify-center text-zinc-400 hover:text-amber-400 shadow-md transition-all active:scale-90"
            >
              <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* 3. Deep End / 5-Star Anchor (Up) */}
            <button
              type="button"
              title="THE DEEP END (Up Arrow): 5-Star Anchor"
              onClick={() => (onAction ? onAction(SwipeDirection.UP) : onSwipe(SwipeDirection.UP))}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-950 hover:brightness-110 transition-all active:scale-90 border-2 border-red-400/40"
            >
              <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* 4. Liked / Watched (Right) */}
            <button
              type="button"
              title="Liked / Watched (Right Arrow): Saves to Vault"
              onClick={() => (onAction ? onAction(SwipeDirection.RIGHT) : onSwipe(SwipeDirection.RIGHT))}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/70 rounded-full flex items-center justify-center text-zinc-400 hover:text-emerald-400 shadow-md transition-all active:scale-90"
            >
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Optional Undo Pill on Landscape */}
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase transition-all ${
                canUndo
                  ? 'bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:text-white cursor-pointer active:scale-95 shadow-md'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <Undo2 className="w-3 h-3 text-zinc-400" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK STAMPS (Fades in during drag - visible in both portrait & landscape) */}
      {/* 1. Passed / Rotten (Left) */}
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-10 sm:top-14 right-4 sm:right-8 border-4 border-red-500 bg-red-950/90 backdrop-blur-md rounded-2xl px-4 py-2 rotate-[15deg] shadow-2xl z-30 pointer-events-none text-center"
      >
        <span className="text-red-400 font-black text-xl sm:text-2xl uppercase tracking-tighter flex items-center gap-1.5 justify-center">
          <X className="w-5 h-5 sm:w-6 sm:h-6" /> ROTTEN
        </span>
        <p className="text-[9px] font-mono text-red-300 uppercase tracking-widest">Filter Out</p>
      </motion.div>

      {/* 2. Watched / Liked (Right) */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-10 sm:top-14 left-4 sm:left-8 border-4 border-emerald-500 bg-emerald-950/90 backdrop-blur-md rounded-2xl px-4 py-2 rotate-[-15deg] shadow-2xl z-30 pointer-events-none text-center"
      >
        <span className="text-emerald-300 font-black text-xl sm:text-2xl uppercase tracking-tighter flex items-center gap-1.5 justify-center">
          <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-emerald-400" /> LIKED
        </span>
        <p className="text-[9px] font-mono text-emerald-200 uppercase tracking-widest">Saved to Vault</p>
      </motion.div>

      {/* 3. Deep End / 5-Star Anchor (Up) */}
      <motion.div
        style={{ opacity: sickoOpacity }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 border-4 border-red-600 bg-red-950/95 backdrop-blur-md rounded-3xl px-5 py-3 shadow-2xl z-30 pointer-events-none text-center min-w-[200px] sm:min-w-[220px]"
      >
        <span className="text-red-300 font-black text-xl sm:text-2xl uppercase tracking-tighter flex items-center justify-center gap-1.5">
          <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-red-500 animate-bounce" /> THE DEEP END
        </span>
        <p className="text-[10px] font-mono text-zinc-200 uppercase tracking-widest mt-0.5">5-Star Anchor</p>
      </motion.div>

      {/* 4. Watchlist (Down) */}
      <motion.div
        style={{ opacity: watchlistOpacity }}
        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 border-4 border-amber-500 bg-amber-950/95 backdrop-blur-md rounded-3xl px-5 py-2.5 shadow-2xl z-30 pointer-events-none text-center min-w-[180px] sm:min-w-[190px]"
      >
        <span className="text-amber-300 font-black text-lg sm:text-xl uppercase tracking-tighter flex items-center justify-center gap-1.5">
          <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400" /> QUEUE / WATCHLIST
        </span>
        <p className="text-[9px] font-mono text-amber-200 uppercase tracking-widest">Saved for Later</p>
      </motion.div>
    </motion.div>
  );
};

export default MovieCard;
