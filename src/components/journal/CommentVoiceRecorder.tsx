import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Send,
  Loader2,
  Check,
  Heart,
  Volume2,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';
import { uploadAudioBlob } from '../../utils/mediaHelper';

interface CommentVoiceRecorderProps {
  onVoiceCommentSend: (voiceData: { url: string; duration: number; textNote?: string }) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

export const CommentVoiceRecorder: React.FC<CommentVoiceRecorderProps> = ({
  onVoiceCommentSend,
  onCancel,
  disabled = false,
}) => {
  const [recordState, setRecordState] = useState<'recording' | 'paused' | 'review' | 'uploading'>('recording');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isPlayingReview, setIsPlayingReview] = useState(false);
  const [reviewCurrentTime, setReviewCurrentTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textNote, setTextNote] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioReviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioReviewRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setReviewCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlayingReview(false);
      setReviewCurrentTime(0);
    };
    const handlePause = () => setIsPlayingReview(false);
    const handlePlay = () => setIsPlayingReview(true);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [recordedAudioUrl]);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/aac',
      'audio/wav',
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Trình duyệt không hỗ trợ ghi âm trực tiếp.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalType = mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        setRecordedDuration(recordingSeconds);
        setRecordState('review');
        stopTracks();
      };

      mediaRecorder.start(200);
      setRecordingSeconds(0);
      setRecordState('recording');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Lỗi khởi động ghi âm comment:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMsg('Vui lòng cho phép quyền truy cập Micro trên trình duyệt để gửi bình luận thoại.');
      } else {
        setErrorMsg('Không thể mở Micro để thu âm. Hãy kiểm tra kết nối micro thiết bị.');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordState('recording');
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && (recordState === 'recording' || recordState === 'paused')) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTogglePlayReview = () => {
    const audio = audioReviewRef.current;
    if (!audio) return;
    if (isPlayingReview) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  const handleSend = async () => {
    if (!recordedBlob) return;
    setRecordState('uploading');
    setUploadProgress(15);
    setErrorMsg(null);

    try {
      const ext = recordedBlob.type.includes('mp4')
        ? '.mp4'
        : recordedBlob.type.includes('ogg')
        ? '.ogg'
        : '.webm';
      const filename = `voice-cmt-${Date.now()}${ext}`;

      const uploadedUrl = await uploadAudioBlob(
        recordedBlob,
        filename,
        (progress) => setUploadProgress(Math.round(progress))
      );

      await onVoiceCommentSend({
        url: uploadedUrl,
        duration: recordedDuration || recordingSeconds,
        textNote: textNote.trim(),
      });
    } catch (err: any) {
      console.error('Lỗi tải voice comment:', err);
      setErrorMsg(err?.message || 'Không thể gửi bình luận thoại. Vui lòng thử lại.');
      setRecordState('review');
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-3 bg-gradient-to-r from-rose-50 via-pink-50 to-slate-50 border border-rose-200/90 rounded-2xl shadow-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
      {/* Error display */}
      {errorMsg && (
        <div className="p-2 bg-rose-100/90 text-rose-800 text-[11px] rounded-xl flex items-start gap-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* RECORDING / PAUSED STATE */}
      {(recordState === 'recording' || recordState === 'paused') && (
        <div className="flex items-center gap-2.5">
          {/* Animated pulse dot */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                recordState === 'recording' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-xs font-bold text-rose-600">
              {formatTimer(recordingSeconds)}
            </span>
          </div>

          {/* Mini Waveform Visualizer */}
          <div className="flex-1 h-6 bg-rose-100/60 rounded-xl px-2 flex items-center justify-center gap-1 overflow-hidden border border-rose-200/50">
            {[40, 70, 95, 60, 35, 80, 100, 50, 75, 90, 45, 65, 85, 95, 40].map((h, i) => (
              <div
                key={i}
                className="flex-1 max-w-[4px] bg-rose-500 rounded-full transition-all duration-150"
                style={{
                  height:
                    recordState === 'recording'
                      ? `${Math.max(20, h * (0.5 + Math.sin(recordingSeconds * 4 + i) * 0.5))}%`
                      : '25%',
                  opacity: recordState === 'recording' ? 0.9 : 0.4,
                }}
              />
            ))}
          </div>

          {/* Pause / Resume */}
          {recordState === 'recording' ? (
            <button
              type="button"
              onClick={pauseRecording}
              className="p-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition cursor-pointer"
              title="Tạm dừng"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeRecording}
              className="p-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition cursor-pointer"
              title="Tiếp tục thu âm"
            >
              <Play className="w-3.5 h-3.5 fill-rose-600" />
            </button>
          )}

          {/* Finish recording -> Review */}
          <button
            type="button"
            onClick={stopRecording}
            className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
            title="Dừng thu âm & Nghe lại"
          >
            <Square className="w-3 h-3 fill-white" />
            <span>Xong</span>
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
            title="Hủy"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* REVIEW & SEND STATE */}
      {recordState === 'review' && recordedAudioUrl && (
        <div className="space-y-2">
          {recordedAudioUrl && <audio ref={audioReviewRef} src={recordedAudioUrl} />}

          <div className="flex items-center gap-2">
            {/* Play/Pause Review Button */}
            <button
              type="button"
              onClick={handleTogglePlayReview}
              className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              {isPlayingReview ? (
                <Pause className="w-3 h-3 fill-white" />
              ) : (
                <Play className="w-3 h-3 fill-white ml-0.5" />
              )}
            </button>

            {/* Scrubber / Progress */}
            <div className="flex-1 min-w-0 flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-rose-200">
              <span className="text-[10px] font-mono text-rose-600 font-bold">
                {formatTimer(reviewCurrentTime)} / {formatTimer(recordedDuration || recordingSeconds)}
              </span>
              <span className="text-[10px] text-slate-400 truncate">🎙️ Lời nhắn thoại</span>
            </div>

            {/* Re-record button */}
            <button
              type="button"
              onClick={startRecording}
              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Thu âm lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="Hủy bỏ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Send voice button */}
            <button
              type="button"
              disabled={disabled}
              onClick={handleSend}
              className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Gửi</span>
              <Send className="w-3 h-3" />
            </button>
          </div>

          {/* Optional companion text */}
          <div className="pt-0.5">
            <input
              type="text"
              placeholder="Thêm lời nhắn chữ kèm theo (không bắt buộc)..."
              value={textNote}
              onChange={(e) => setTextNote(e.target.value)}
              className="w-full px-2.5 py-1 bg-white/90 border border-rose-200/70 rounded-lg text-slate-700 text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>
        </div>
      )}

      {/* UPLOADING STATE */}
      {recordState === 'uploading' && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-rose-600 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          <span>Đang gửi lời nhắn thoại... {uploadProgress}%</span>
        </div>
      )}
    </div>
  );
};
