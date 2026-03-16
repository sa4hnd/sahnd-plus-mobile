// Native video sources that return direct stream URLs
// For native playback, we use sources that provide direct .m3u8/.mp4 streams

export interface StreamSource {
  name: string;
  getUrl: (type: 'movie' | 'tv', id: number, season?: number, episode?: number) => string;
}

export const sources: StreamSource[] = [
  {
    name: 'AutoEmbed',
    getUrl: (type, id, s, e) =>
      type === 'tv' && s && e
        ? `https://player.autoembed.cc/embed/${type}/${id}/${s}/${e}`
        : `https://player.autoembed.cc/embed/${type}/${id}`,
  },
  {
    name: 'VidSrc CC',
    getUrl: (type, id, s, e) =>
      type === 'tv' && s && e
        ? `https://vidsrc.cc/v2/embed/${type}/${id}/${s}/${e}`
        : `https://vidsrc.cc/v2/embed/${type}/${id}`,
  },
  {
    name: 'Embed.su',
    getUrl: (type, id, s, e) =>
      type === 'tv' && s && e
        ? `https://embed.su/embed/${type}/${id}/${s}/${e}`
        : `https://embed.su/embed/${type}/${id}`,
  },
  {
    name: 'VidSrc ICU',
    getUrl: (type, id, s, e) =>
      type === 'tv' && s && e
        ? `https://vidsrc.icu/embed/${type}/${id}/${s}/${e}`
        : `https://vidsrc.icu/embed/${type}/${id}`,
  },
  {
    name: 'Multiembed',
    getUrl: (type, id, s, e) =>
      type === 'tv' && s && e
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  },
  {
    name: 'Smashystream',
    getUrl: (type, id, s, e) =>
      type === 'tv' && s && e
        ? `https://player.smashy.stream/${type}/${id}?s=${s}&e=${e}`
        : `https://player.smashy.stream/${type}/${id}`,
  },
];
