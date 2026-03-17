const API_KEY = '3ea9ba88a81be0f283362871b7f6b19e';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

export const img = (path: string | null, size = 'w500') =>
  path ? `${IMG}/${size}${path}` : null;

export const backdrop = (path: string | null) =>
  path ? `${IMG}/original${path}` : null;

async function get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const q = new URLSearchParams({ api_key: API_KEY, ...params });
  const res = await fetch(`${BASE}${endpoint}?${q}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export const trending = (time: 'day' | 'week' = 'week') => get<any>(`/trending/all/${time}`);
export const popularMovies = (page = 1) => get<any>('/movie/popular', { page: String(page) });
export const topRatedMovies = () => get<any>('/movie/top_rated');
export const nowPlayingMovies = () => get<any>('/movie/now_playing');
export const upcomingMovies = () => get<any>('/movie/upcoming');
export const popularTV = () => get<any>('/tv/popular');
export const topRatedTV = () => get<any>('/tv/top_rated');
export const airingTodayTV = () => get<any>('/tv/airing_today');
export const onTheAirTV = () => get<any>('/tv/on_the_air');
export const movieDetail = (id: number) => get<any>(`/movie/${id}`, { append_to_response: 'videos,credits,similar' });
export const tvDetail = (id: number) => get<any>(`/tv/${id}`, { append_to_response: 'videos,credits,similar' });
export const seasonDetail = (tvId: number, s: number) => get<any>(`/tv/${tvId}/season/${s}`);
export const searchMulti = (query: string) => get<any>('/search/multi', { query });
export const movieGenres = () => get<any>('/genre/movie/list');
export const tvGenres = () => get<any>('/genre/tv/list');
export const discoverByGenre = (genreId: number, type: 'movie' | 'tv' = 'movie') =>
  get<any>(`/discover/${type}`, { with_genres: String(genreId), sort_by: 'popularity.desc' });
