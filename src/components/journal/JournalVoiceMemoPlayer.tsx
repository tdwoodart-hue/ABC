import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, Mic, Sparkles, Heart } from 'lucide-react';

interface JournalVoiceMemoPlayerProps {
  voiceMemoUrl: string;
  duration?: number;
  title?: string;
  recordedByName?: string;
  compact?: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const JournalVoiceMemoPlayer: React.FC<JournalVoiceMemoPlayerProps> = ({
  voiceMemoUrl,
  duration: initialDuration,
  title,
  recordedByName,
  compact = false,
  onDelete,
  canDelete = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [voiceMemoUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.warn('Audio playback error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audio.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Render wave bars mockup matching playback state
  const waveBars = compact
    ? [30, 60, 90, 75, 45, 85, 100, 65, 85, 55, 90, 60, 80, 50, 30]
    : [
        30, 60, 45, 80, 95, 60, 40, 75, 90, 65,
        45, 85, 100, 70, 50, 65, 85, 55, 40, 70,
        90, 60, 45, 80, 60, 40, 65, 85, 50, 30
      ];

  if (compact) {
    return (
      <div
        className={`rounded-xl border border-rose-200/90 bg-gradient-to-r from-rose-50/90 to-pink-50/80 px-2.5 py-1.5 shadow-2xs transition-all ${
          isPlaying ? 'ring-1.5 ring-rose-400 bg-rose-50' : ''
        }`}
      >
        <audio ref={audioRef} src={voiceMemoUrl} preload="metadata" />

        <div className="flex items-center gap-2">
          {/* Mini Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs active:scale-95 transition cursor-pointer"
            title={isPlaying ? 'Tạm dừng' : 'Phát lời nhắn'}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-white" />
            ) : (
              <Play className="w-3 h-3 fill-white ml-0.5" />
            )}
          </button>

          {/* Mini Waveform & scrubber */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <div className="h-3.5 flex items-center gap-[2px] overflow-hidden">
              {waveBars.map((heightPercent, idx) => {
                const barProgress = (idx / waveBars.length) * 100;
                const isPast = barProgress <= progressPercent;
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all duration-150 ${
                      isPast ? 'bg-rose-500' : 'bg-rose-200'
                    }`}
                    style={{
                      height: isPlaying
                        ? `${Math.max(25, (heightPercent * (0.6 + Math.sin(idx + currentTime * 5) * 0.4)))}%`
                        : `${heightPercent * 0.7}%`,
                    }}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 leading-none">
              <span className="flex items-center gap-1">
                <Mic className="w-2.5 h-2.5 text-rose-500" />
                <span>{formatTime(currentTime)}</span>
              </span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSpeed}
            className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:text-rose-600 bg-white/90 border border-rose-200/60 rounded-md transition cursor-pointer shrink-0"
            title="Đổi tốc độ phát"
          >
            {playbackRate}x
          </button>

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[10px] text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-amber-50/60 p-3 sm:p-4 shadow-xs transition-all ${
        isPlaying ? 'ring-2 ring-rose-300 shadow-sm' : ''
      }`}
    >
      <audio ref={audioRef} src={voiceMemoUrl} preload="metadata" />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Mic className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800 truncate">
                {title || 'Lời thì thầm kỷ niệm'}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-rose-100/90 text-rose-700 px-1.5 py-0.2 rounded-full shrink-0">
                <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                <span>Voice Memo</span>
              </span>
            </div>
            {recordedByName && (
              <p className="text-[11px] text-slate-500 truncate">
                Thu âm bởi: <span className="font-semibold text-rose-600">{recordedByName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleSpeed}
            className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-rose-600 bg-white/80 hover:bg-white border border-rose-200/60 rounded-lg transition cursor-pointer"
            title="Đổi tốc độ phát"
          >
            {playbackRate}x
          </button>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[11px] font-medium text-rose-500 hover:text-rose-700 px-1.5 py-0.5 rounded hover:bg-rose-100/60 transition cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Main Play Controls & Waveform */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
          title={isPlaying ? 'Tạm dừng' : 'Phát lời thì thầm'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>

        {/* Waveform & Scrubber Slider */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          {/* Animated Waveform Visualizer */}
          <div className="h-6 flex items-center gap-[2px] sm:gap-[3px] px-1 overflow-hidden">
            {waveBars.map((heightPercent, idx) => {
              const barProgress = (idx / waveBars.length) * 100;
              const isPast = barProgress <= progressPercent;

              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPast
                      ? 'bg-rose-500'
                      : 'bg-rose-200/80 hover:bg-rose-300'
                  }`}
                  style={{
                    height: isPlaying
                      ? `${Math.max(20, (heightPercent * (0.6 + Math.sin(idx + currentTime * 5) * 0.4)))}%`
                      : `${heightPercent * 0.7}%`,
                  }}
                />
              );
            })}
          </div>

          {/* Scrubber slider */}
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={totalDuration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-rose-200/70 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
            />
          </div>

          {/* Time elapsed / Total duration */}
          <div className="flex items-center justify-between text-[10px] font-mono font-medium text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
