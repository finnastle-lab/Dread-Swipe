import { TMDB_API_KEY, TMDB_BASE_URL, CURATED_MOVIES } from '../constants';
import { Movie, DreadIntensity, PrimaryVibe, FilterState } from '../types';

/**
 * Assigns plausible dread score & vibe tags to dynamically fetched TMDB movies
 */
export const inferDreadAndVibes = (tmdbMovie: any): { dreadScore: DreadIntensity; vibes: PrimaryVibe[]; isSickoTier: boolean } => {
  const title = (tmdbMovie.title || '').toLowerCase();
  const overview = (tmdbMovie.overview || '').toLowerCase();
  const genreIds = tmdbMovie.genre_ids || [];

  let dreadScore: DreadIntensity = 3;
  const vibes: PrimaryVibe[] = [];

  // Body horror keywords
  if (
    overview.includes('flesh') || 
    overview.includes('parasite') || 
    overview.includes('mutation') || 
    overview.includes('body') ||
    overview.includes('infection') ||
    overview.includes('transformation') ||
    overview.includes('disease') ||
    overview.includes('visceral') ||
    overview.includes('cannibal')
  ) {
    vibes.push('Body Horror');
    dreadScore = Math.max(dreadScore, 4) as DreadIntensity;
  }

  // Folk / Ritual keywords
  if (
    overview.includes('cult') || 
    overview.includes('ritual') || 
    overview.includes('village') || 
    overview.includes('pagan') || 
    overview.includes('witch') ||
    overview.includes('folklore') ||
    overview.includes('sacrifice') ||
    overview.includes('occult') ||
    overview.includes('ancestor') ||
    overview.includes('ancient evil')
  ) {
    vibes.push('Folk / Ritual');
    dreadScore = Math.max(dreadScore, 4) as DreadIntensity;
  }

  // Prestige Crime / Thriller keywords
  if (
    genreIds.includes(80) || 
    overview.includes('detective') || 
    overview.includes('serial killer') || 
    overview.includes('crime') || 
    overview.includes('investigation') || 
    overview.includes('cartel') ||
    overview.includes('murder') ||
    overview.includes('assassin') ||
    overview.includes('revenge')
  ) {
    vibes.push('Prestige Crime');
  }

  // Cerebral Sci-Fi keywords
  if (
    genreIds.includes(878) ||
    overview.includes('space') || 
    overview.includes('alien') || 
    overview.includes('dystopian') || 
    overview.includes('sci-fi') || 
    overview.includes('future') ||
    overview.includes('cosmic') ||
    overview.includes('simulation') ||
    overview.includes('spaceship') ||
    overview.includes('dimension')
  ) {
    vibes.push('Cerebral Sci-Fi');
  }

  // International Arthouse
  if (tmdbMovie.original_language && tmdbMovie.original_language !== 'en') {
    vibes.push('International Arthouse');
  }

  // Extreme keywords for Sicko Mode
  if (
    overview.includes('uncompromising') || 
    overview.includes('brutal') || 
    overview.includes('sadistic') || 
    overview.includes('depravity') || 
    overview.includes('extremity') ||
    overview.includes('gore') ||
    overview.includes('torture') ||
    overview.includes('relentless') ||
    overview.includes('nightmarish') ||
    overview.includes('gruesome')
  ) {
    vibes.push('Sicko Mode');
    dreadScore = 5;
  }

  // Default to Elevated if none caught
  if (vibes.length === 0) {
    vibes.push('Elevated');
  }

  // High rating / slow-burn elevated flag
  if (tmdbMovie.vote_average >= 7.0 && !vibes.includes('Elevated')) {
    vibes.push('Elevated');
  }

  return {
    dreadScore,
    vibes: Array.from(new Set(vibes)),
    isSickoTier: dreadScore >= 4
  };
};

export const fetchMovieByTitle = async (title: string): Promise<Movie | null> => {
  // 1. Check curated catalog first for immediate fidelity
  const curatedMatch = CURATED_MOVIES.find(m => m.title.toLowerCase() === title.toLowerCase());
  if (curatedMatch) return curatedMatch;

  try {
    const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const res = data.results[0];
      const { dreadScore, vibes, isSickoTier } = inferDreadAndVibes(res);
      return {
        id: res.id,
        title: res.title,
        year: res.release_date ? res.release_date.split('-')[0] : '2024',
        overview: res.overview || 'No synopsis available.',
        poster_path: res.poster_path || '',
        backdrop_path: res.backdrop_path || '',
        vote_average: res.vote_average ? Number(res.vote_average.toFixed(1)) : 7.0,
        dreadScore,
        vibes,
        isSickoTier,
        isInternational: res.original_language !== 'en',
        pacing: 'immediate',
        goreType: 'practical_gore'
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching movie ${title}:`, error);
    return null;
  }
};

export const fetchRecommendations = async (movieId: number): Promise<Movie[]> => {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    const results = data.results || [];
    
    return results
      .filter((m: any) => m.poster_path && m.overview)
      .map((res: any) => {
        const { dreadScore, vibes, isSickoTier } = inferDreadAndVibes(res);
        return {
          id: res.id,
          title: res.title,
          year: res.release_date ? res.release_date.split('-')[0] : '2024',
          overview: res.overview,
          poster_path: res.poster_path,
          backdrop_path: res.backdrop_path,
          vote_average: res.vote_average ? Number(res.vote_average.toFixed(1)) : 7.0,
          dreadScore,
          vibes,
          isSickoTier,
          isInternational: res.original_language !== 'en',
          pacing: 'immediate',
          goreType: 'practical_gore'
        };
      });
  } catch (error) {
    console.error(`Error fetching recommendations for ${movieId}:`, error);
    return [];
  }
};

export const fetchSimilar = async (movieId: number): Promise<Movie[]> => {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    const results = data.results || [];
    
    return results
      .filter((m: any) => m.poster_path && m.overview)
      .map((res: any) => {
        const { dreadScore, vibes, isSickoTier } = inferDreadAndVibes(res);
        return {
          id: res.id,
          title: res.title,
          year: res.release_date ? res.release_date.split('-')[0] : '2024',
          overview: res.overview,
          poster_path: res.poster_path,
          backdrop_path: res.backdrop_path,
          vote_average: res.vote_average ? Number(res.vote_average.toFixed(1)) : 7.0,
          dreadScore,
          vibes,
          isSickoTier,
          isInternational: res.original_language !== 'en',
          pacing: 'immediate',
          goreType: 'practical_gore'
        };
      });
  } catch (error) {
    console.error(`Error fetching similar for ${movieId}:`, error);
    return [];
  }
};

/**
 * Powerful dynamic TMDB Discover and Seed Recommendation Engine
 * Guarantees endless unswiped horror, thriller, and extreme films matching user filters.
 */
export const discoverDynamicMovies = async (
  filters: FilterState,
  seenIds: Set<number>,
  seedMovieIds: number[] = [],
  page: number = 1
): Promise<Movie[]> => {
  const discoveredMap = new Map<number, Movie>();

  try {
    // 1. If seed movies exist (e.g. from user's uploaded / liked list), query recommendations from 3 random seeds
    if (seedMovieIds.length > 0) {
      const randomSeeds = [...seedMovieIds].sort(() => 0.5 - Math.random()).slice(0, 3);
      const seedPromises = randomSeeds.map(id => fetchRecommendations(id));
      const seedResults = await Promise.allSettled(seedPromises);
      
      seedResults.forEach(res => {
        if (res.status === 'fulfilled') {
          res.value.forEach(m => {
            if (!seenIds.has(m.id) && !discoveredMap.has(m.id)) {
              discoveredMap.set(m.id, m);
            }
          });
        }
      });
    }

    // 2. Discover via TMDB Discover API
    // Map Vibes to TMDB Genre IDs
    // 27 = Horror, 53 = Thriller, 9648 = Mystery, 878 = Sci-Fi, 80 = Crime, 35 = Comedy (exclude)
    const genreList: number[] = [];
    if (filters.selectedVibes.includes('Body Horror') || filters.selectedVibes.includes('Elevated') || filters.selectedVibes.includes('Folk / Ritual') || filters.selectedVibes.includes('Sicko Mode')) {
      genreList.push(27);
    }
    if (filters.selectedVibes.includes('Prestige Crime')) {
      genreList.push(53, 80);
    }
    if (filters.selectedVibes.includes('Cerebral Sci-Fi')) {
      genreList.push(878, 53);
    }
    if (genreList.length === 0) {
      genreList.push(27, 53);
    }

    const genreParam = Array.from(new Set(genreList)).join('|');
    const excludeGenres = filters.noHorrorComedy ? '&without_genres=35,10751,16' : '&without_genres=10751';

    // Query 2 pages of TMDB Discover with different sorts for rich variety
    const pageA = page;
    const pageB = page + 1;

    const urls = [
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreParam}${excludeGenres}&vote_count.gte=40&vote_average.gte=5.5&sort_by=popularity.desc&page=${pageA}`,
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreParam}${excludeGenres}&vote_count.gte=50&vote_average.gte=6.2&sort_by=vote_average.desc&page=${pageB}`,
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=27,53${excludeGenres}&vote_count.gte=30&sort_by=release_date.desc&release_date.lte=2025-12-31&page=${pageA}`
    ];

    const responses = await Promise.allSettled(urls.map(u => fetch(u).then(r => r.json())));

    responses.forEach(res => {
      if (res.status === 'fulfilled' && res.value?.results) {
        res.value.results.forEach((tmdbItem: any) => {
          if (!tmdbItem.poster_path || !tmdbItem.overview) return;
          if (seenIds.has(tmdbItem.id) || discoveredMap.has(tmdbItem.id)) return;

          const { dreadScore, vibes, isSickoTier } = inferDreadAndVibes(tmdbItem);

          // Apply dread filter
          if (dreadScore < filters.minDread || dreadScore > filters.maxDread) return;

          // Apply vibe match
          const hasVibeMatch = vibes.some(v => filters.selectedVibes.includes(v));
          if (!hasVibeMatch) return;

          // Exclude comedy if rule active
          if (filters.noHorrorComedy) {
            const ov = tmdbItem.overview.toLowerCase();
            if (ov.includes('horror-comedy') || ov.includes('dark comedy') || ov.includes('hilarious') || tmdbItem.genre_ids?.includes(35)) {
              return;
            }
          }

          discoveredMap.set(tmdbItem.id, {
            id: tmdbItem.id,
            title: tmdbItem.title,
            year: tmdbItem.release_date ? tmdbItem.release_date.split('-')[0] : '2024',
            overview: tmdbItem.overview,
            poster_path: tmdbItem.poster_path,
            backdrop_path: tmdbItem.backdrop_path || '',
            vote_average: tmdbItem.vote_average ? Number(tmdbItem.vote_average.toFixed(1)) : 7.0,
            dreadScore,
            vibes,
            isSickoTier,
            isInternational: tmdbItem.original_language !== 'en',
            pacing: 'immediate',
            goreType: 'practical_gore'
          });
        });
      }
    });

  } catch (err) {
    console.error('Error during dynamic TMDB movie discovery:', err);
  }

  return Array.from(discoveredMap.values());
};

