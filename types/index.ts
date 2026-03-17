export interface Movie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
  media_type?: string;
  popularity: number;
}

export interface MovieDetail extends Movie {
  genres: Genre[];
  runtime?: number;
  status: string;
  tagline?: string;
  number_of_seasons?: number;
  seasons?: Season[];
  videos?: { results: Video[] };
  credits?: { cast: CastMember[] };
  similar?: { results: Movie[] };
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Season {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
}

export interface Episode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  vote_average: number;
  runtime: number;
}

export interface WatchHistoryItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  season?: number;
  episode?: number;
  timestamp: number;
  progress: number;
  completed: boolean;
}

export interface Channel {
  id: string;
  name: string;
  category: string;
  logo?: string;
  stream_url: string;
}

export interface ChannelCategory {
  name: string;
  channels: Channel[];
}

export interface WatchlistItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  vote_average: number;
  addedAt: number;
}
