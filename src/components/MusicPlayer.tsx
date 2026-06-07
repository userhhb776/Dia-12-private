import { useState } from "react";
import { Music, Play, ExternalLink, Heart } from "lucide-react";

interface MusicPlayerProps {
  songName?: string;
  songArtist?: string;
  songLink?: string;
}

export default function MusicPlayer({ songName, songArtist, songLink }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!songName && !songLink) return null;

  // Helper to extract Spotify Embed Link
  const getSpotifyEmbedUrl = (url: string) => {
    // Standard link match: https://open.spotify.com/track/4PTG3Z6ehGkBF3zIqYQGS3?si=...
    const match = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator`;
    }
    // Playlist support: https://open.spotify.com/playlist/([a-zA-Z0-9]+)
    const playlistMatch = url.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (playlistMatch && playlistMatch[1]) {
      return `https://open.spotify.com/embed/playlist/${playlistMatch[1]}`;
    }
    return null;
  };

  // Helper to extract YouTube Embed ID or create search embed
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // watch?v=ID or shorts/ID or youtu.be/ID or embed/ID
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }

    // If it's a youtube search results URL, convert it to a searchable embed playlist
    if (url.includes("youtube.com/results?search_query=")) {
      const matchQuery = url.match(/search_query=([^&]+)/);
      if (matchQuery && matchQuery[1]) {
        return `https://www.youtube.com/embed?listType=search&list=${matchQuery[1]}`;
      }
    }
    return null;
  };

  const spotifyEmbed = songLink ? getSpotifyEmbedUrl(songLink) : null;
  const youtubeEmbed = songLink ? getYouTubeEmbedUrl(songLink) : null;
  const youtubeSearchUrl = youtubeEmbed || (songName ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(songName + " " + (songArtist || ""))}` : null);

  const handleCustomPlay = () => {
    setIsPlaying(!isPlaying);
    if (songLink) {
      window.open(songLink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="w-full my-6 p-5 rounded-2xl bg-white/50 backdrop-blur-md border border-rose-100 shadow-sm flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4 px-3 py-1 bg-rose-50 border border-rose-100/50 rounded-full text-rose-500 text-xs font-semibold uppercase tracking-widest">
        <Music className="w-4 h-4 animate-bounce" />
        Nossa Música
      </div>

      {spotifyEmbed ? (
        <div className="w-full overflow-hidden rounded-xl bg-transparent min-h-[80px]">
          <iframe
            title="Spotify Nossa Música"
            src={spotifyEmbed}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl shadow-xs"
          ></iframe>
        </div>
      ) : youtubeSearchUrl ? (
        <div className="w-full overflow-hidden rounded-xl bg-black aspect-video shadow-md max-w-md">
          <iframe
            title="Youtube Nossa Música"
            src={youtubeSearchUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="w-full h-full"
          ></iframe>
        </div>
      ) : (
        /* Animated customized vinyl player fallback */
        <div className="flex flex-col items-center text-center w-full max-w-sm">
          <div className="relative w-28 h-28 mb-3 flex items-center justify-center">
            {/* Vinyl Record */}
            <div 
              onClick={handleCustomPlay}
              className={`absolute inset-0 bg-slate-950 rounded-full border-4 border-slate-800 flex items-center justify-center cursor-pointer shadow-lg transition-transform duration-1000 ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '6s' }}
            >
              {/* Record grooves */}
              <div className="w-24 h-24 rounded-full border border-dashed border-slate-700 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-slate-800 flex items-center justify-center">
                  {/* Label */}
                  <div className="w-10 h-10 rounded-full bg-rose-400 border border-rose-300 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Record Needle */}
            <div 
              className={`absolute top-0 right-2 w-10 h-14 origin-top-right transform transition-transform duration-500 pointer-events-none ${
                isPlaying ? 'rotate-12' : '-rotate-12'
              }`}
            >
              <div className="w-1.5 h-12 bg-slate-400 rounded-full ml-auto mr-1 shadow-xs"></div>
              <div className="w-3 h-3 bg-slate-500 rounded-xs border border-slate-600 block shadow-xs ml-auto"></div>
            </div>
          </div>

          <div className="px-4">
            <h4 className="font-bold text-slate-800 text-sm leading-snug">
              {songName || "Música Preferida do Casal"}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {songArtist || "Artista Desconhecido"}
            </p>
          </div>

          {songLink && (
            <button
              onClick={handleCustomPlay}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Ouvir Música no Player
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
