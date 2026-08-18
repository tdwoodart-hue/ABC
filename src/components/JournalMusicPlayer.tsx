import React, { useState, useRef } from 'react';
import { Play, Pause, Disc, ExternalLink, Volume2, VolumeX } from 'lucide-react';

interface JournalMusicPlayerProps {
  musicUrl: string;
  musicTitle?: string;
  className?: string;
}

export const JournalMusicPlayer: React.FC<JournalMusicPlayerProps> = ({
  musicUrl,
  musicTitle,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper to extract YouTube ID
  const getYouTubeId = (url: string): string | null => {
    const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Helper to extract Spotify Track/Album/Playlist ID
  const getSpotifyEmbedUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('spotify.com')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const type = parts[0]; // track, album, playlist
          const id = parts[1];
          return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  // Helper to check if URL is a direct audio file
  const isDirectAudioUrl = (url: string): boolean => {
    const cleanUrl = url.split('?')[0].toLowerCase();
    return (
      cleanUrl.endsWith('.mp3') ||
      cleanUrl.endsWith('.m4a') ||
      cleanUrl.endsWith('.wav') ||
      cleanUrl.endsWith('.ogg') ||
      cleanUrl.endsWith('.aac') ||
      cleanUrl.startsWith('data:audio') ||
      cleanUrl.startsWith('blob:')
    );
  };

  // Helper to check SoundCloud
  const isSoundCloudUrl = (url: string): boolean => {
    return url.toLowerCase().includes('soundcloud.com');
  };

  const youtubeId = getYouTubeId(musicUrl);
  const spotifyEmbedUrl = getSpotifyEmbedUrl(musicUrl);
  const isSoundCloud = isSoundCloudUrl(musicUrl);
  const isDirectAudio = isDirectAudioUrl(musicUrl) || (!youtubeId && !spotifyEmbedUrl && !isSoundCloud);

  const displayTitle = musicTitle?.trim() || (
    youtubeId ? 'YouTube Music' :
    spotifyEmbedUrl ? 'Spotify Track' :
    isSoundCloud ? 'SoundCloud Audio' :
    'Bài hát kỷ niệm'
  );

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('Audio playback error:', err);
          setIsPlaying(true);
        });
      }
    } else {
      // Toggle play/pause for YouTube & other background embeds
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden select-none ${
      isPlaying 
        ? 'bg-rose-50/80 border-rose-200/90 shadow-2xs' 
        : 'bg-slate-50/80 hover:bg-rose-50/40 border-slate-200/70 hover:border-rose-200/60'
    } ${className}`}>
      
      {/* Invisible YouTube Player Engine (Audio Only, No Video Screen Displayed) */}
      {youtubeId && isPlaying && (
        <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none -z-50" aria-hidden="true">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&controls=0`}
            title={displayTitle}
            allow="autoplay; encrypted-media"
            className="w-1 h-1 border-0"
          />
        </div>
      )}

      {/* Invisible SoundCloud / Spotify Background Engine if applicable */}
      {isSoundCloud && isPlaying && (
        <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none -z-50" aria-hidden="true">
          <iframe
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(musicUrl)}&color=%23f43f5e&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
            title={displayTitle}
            allow="autoplay"
            className="w-1 h-1 border-0"
          />
        </div>
      )}

      {spotifyEmbedUrl && isPlaying && (
        <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none -z-50" aria-hidden="true">
          <iframe
            src={spotifyEmbedUrl}
            title={displayTitle}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="w-1 h-1 border-0"
          />
        </div>
      )}

      {/* Hidden audio element for direct links */}
      {isDirectAudio && (
        <audio
          ref={audioRef}
          src={musicUrl}
          preload="metadata"
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration || 0);
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setAudioCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setAudioCurrentTime(0);
          }}
        />
      )}

      {/* Sleek Compact Player Bar */}
      <div className="flex items-center justify-between gap-2.5 px-3 py-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Animated Spinning Vinyl Disc */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs ${
              isPlaying
                ? 'bg-rose-500 text-white animate-spin [animation-duration:3s]'
                : 'bg-white text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-200/60'
            }`}
            title={isPlaying ? 'Tạm dừng nhạc' : 'Phát bài hát'}
          >
            {isPlaying ? (
              <Disc className="w-4 h-4" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* Song Info & Equalizer */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-100/80 px-1.5 py-0.2 rounded-md shrink-0">
                Nhạc
              </span>
              <p className="text-xs font-semibold text-slate-800 truncate" title={displayTitle}>
                {displayTitle}
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              {isPlaying ? (
                <div className="flex items-center gap-1.5">
                  {/* Subtle bouncing equalizer wave bars */}
                  <div className="flex items-end gap-0.5 h-2.5">
                    <span className="w-0.5 bg-rose-500 rounded-full animate-bounce [animation-delay:0ms] h-2"></span>
                    <span className="w-0.5 bg-rose-500 rounded-full animate-bounce [animation-delay:150ms] h-3"></span>
                    <span className="w-0.5 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms] h-1.5"></span>
                  </div>
                  <span className="text-[10px] text-rose-600 font-medium truncate">
                    {isDirectAudio && audioDuration > 0 ? `${formatTime(audioCurrentTime)} / ${formatTime(audioDuration)}` : 'Đang phát âm thanh...'}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 truncate">
                  Bấm để nghe nhạc
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Direct audio scrubber if available & playing */}
          {isDirectAudio && isPlaying && audioDuration > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              <input
                type="range"
                min={0}
                max={audioDuration}
                value={audioCurrentTime}
                onChange={handleSeek}
                className="w-16 sm:w-20 h-1 bg-rose-200/80 accent-rose-500 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
                title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* External Link */}
          <a
            href={musicUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition cursor-pointer"
            title="Mở bài hát trên ứng dụng gốc"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Quick Play/Pause pill button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
              isPlaying
                ? 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-2xs'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Dừng</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Nghe</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
