import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Movie, SwipeDirection } from '../types';
import { IMAGE_BASE_URL, DREAD_LEVELS } from '../constants';
import { fetchMovieByTitle } from '../services/tmdbService';
import { Flame, Bookmark, Heart, X, Film } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSwipe, isTop }) => {
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
  const sickoOpacity = useTransform(y, [-120, -40, 0], [1, 0.4, 0]); // Drag Up -> Sicko Mode
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
      <div className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl pointer-events-none transform scale-[0.96] translate-y-2 opacity-40 border border-zinc-800 bg-zinc-950 transition-all">
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
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing rounded-3xl overflow-hidden shadow-2xl border select-none bg-zinc-950 border-zinc-800/90 shadow-black"
    >
      {/* Background Poster Image with Skeleton Preload */}
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

      {/* Top Gradient & Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-transparent h-24 pointer-events-none" />

      {/* Top Badges: Vibe Chips on Left, Rating Pill on Right (No dread marks) */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
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
              {vibe === 'Sicko Mode' ? '🔥 Sicko' : vibe}
            </span>
          ))}
        </div>

        {/* Clean Rating Pill */}
        <div className="bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
          <span>★</span>
          <span>{movie.vote_average ? movie.vote_average.toFixed(1) : '7.0'}</span>
        </div>
      </div>

      {/* FEEDBACK STAMPS (Fades in during drag) */}
      {/* 1. Passed / Rotten (Left) */}
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-16 right-4 border-4 border-red-500 bg-red-950/90 backdrop-blur-md rounded-2xl px-4 py-2 rotate-[15deg] shadow-2xl z-20 pointer-events-none text-center"
      >
        <span className="text-red-400 font-black text-2xl uppercase tracking-tighter flex items-center gap-1.5 justify-center">
          <X className="w-6 h-6" /> ROTTEN
        </span>
        <p className="text-[9px] font-mono text-red-300 uppercase tracking-widest">Filter Out</p>
      </motion.div>

      {/* 2. Watched / Liked (Right) */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-16 left-4 border-4 border-emerald-500 bg-emerald-950/90 backdrop-blur-md rounded-2xl px-4 py-2 rotate-[-15deg] shadow-2xl z-20 pointer-events-none text-center"
      >
        <span className="text-emerald-300 font-black text-2xl uppercase tracking-tighter flex items-center gap-1.5 justify-center">
          <Heart className="w-6 h-6 fill-emerald-400" /> LIKED
        </span>
        <p className="text-[9px] font-mono text-emerald-200 uppercase tracking-widest">Saved to Vault</p>
      </motion.div>

      {/* 3. Sicko Mode (Up) */}
      <motion.div
        style={{ opacity: sickoOpacity }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 border-4 border-red-600 bg-red-950/95 backdrop-blur-md rounded-3xl px-5 py-3 shadow-2xl z-20 pointer-events-none text-center min-w-[220px]"
      >
        <span className="text-red-300 font-black text-2xl uppercase tracking-tighter flex items-center justify-center gap-1.5">
          <Flame className="w-7 h-7 text-red-500 animate-bounce" /> SICKO MODE
        </span>
        <p className="text-[10px] font-mono text-zinc-200 uppercase tracking-widest mt-0.5">5-Star Anchor</p>
      </motion.div>

      {/* 4. Watchlist (Down) */}
      <motion.div
        style={{ opacity: watchlistOpacity }}
        className="absolute bottom-1/3 left-1/2 -translate-x-1/2 border-4 border-amber-500 bg-amber-950/95 backdrop-blur-md rounded-3xl px-5 py-2.5 shadow-2xl z-20 pointer-events-none text-center min-w-[190px]"
      >
        <span className="text-amber-300 font-black text-xl uppercase tracking-tighter flex items-center justify-center gap-1.5">
          <Bookmark className="w-5 h-5 fill-amber-400" /> QUEUE / WATCHLIST
        </span>
        <p className="text-[9px] font-mono text-amber-200 uppercase tracking-widest">Saved for Later</p>
      </motion.div>

      {/* Bottom Film Details & Synopsis (Refactored for mobile readability) */}
      <div className="absolute bottom-0 inset-x-0 p-3.5 pb-3.5 sm:p-4 sm:pb-4 flex flex-col justify-end z-10 bg-gradient-to-t from-black via-black/90 via-55% to-transparent pt-14 pointer-events-none">
        {/* Title */}
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight mb-1 drop-shadow-md line-clamp-1">
          {movie.title}
        </h2>

        {/* Metadata row */}
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

        {/* Overview Synopsis (Clean 2 lines) */}
        <p className="text-xs text-zinc-300/90 leading-relaxed drop-shadow-sm line-clamp-2">
          {movie.overview}
        </p>
      </div>
    </motion.div>
  );
};

export default MovieCard;
