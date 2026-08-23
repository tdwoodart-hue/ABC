import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Upload,
  Sparkles,
  Loader2,
  Check,
  Heart,
  Volume2,
  AlertCircle,
  Music2,
  FileAudio
} from 'lucide-react';
import { uploadAudioBlob, uploadAudioFile } from '../../utils/mediaHelper';
import { JournalVoiceMemoPlayer } from './JournalVoiceMemoPlayer';

interface VoiceMemoRecorderProps {
  currentVoiceUrl?: string;
  currentVoiceDuration?: number;
  currentVoiceTitle?: string;
  recordedByName?: string;
  onVoiceMemoSaved: (data: {
    url: string;
    duration: number;
    title: string;
    recordedByName?: string;
  }) => void;
  onVoiceMemoRemoved: () => void;
  disabled?: boolean;
}

const PRESET_TITLES = [
  '💌 Lời thì thầm',
  '🌙 Chúc ngủ ngon',
  '❤️ Lời yêu thương',
  '😂 Tiếng cười kỷ niệm',
  '🌊 Âm thanh nơi đây',
  '🎶 Hát vu vơ',
];

export const VoiceMemoRecorder: React.FC<VoiceMemoRecorderProps> = ({
  currentVoiceUrl,
  currentVoiceDuration = 0,
  currentVoiceTitle = '',
  recordedByName,
  onVoiceMemoSaved,
  onVoiceMemoRemoved,
  disabled = false,
}) => {
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'paused' | 'review' | 'uploading'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [memoTitle, setMemoTitle] = useState(currentVoiceTitle || '💌 Lời thì thầm');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync title when initial title changes
  useEffect(() => {
    if (currentVoiceTitle) {
      setMemoTitle(currentVoiceTitle);
    }
  }, [currentVoiceTitle]);

  // Clean up recording streams on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
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
      setErrorMsg('Trình duyệt hiện tại không hỗ trợ ghi âm trực tiếp.');
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

      mediaRecorder.start(250); // collect 250ms chunks
      setRecordingSeconds(0);
      setRecordState('recording');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Lỗi khởi động ghi âm:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMsg('Bạn chưa cấp quyền Micro. Vui lòng cho phép quyền truy cập Micro trên trình duyệt để ghi âm.');
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

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    setRecordState('idle');
    setRecordingSeconds(0);
    setRecordedBlob(null);
    if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
  };

  const handleSaveRecordedMemo = async () => {
    if (!recordedBlob) return;
    setRecordState('uploading');
    setUploadProgress(10);
    setErrorMsg(null);

    try {
      const ext = recordedBlob.type.includes('mp4')
        ? '.mp4'
        : recordedBlob.type.includes('ogg')
        ? '.ogg'
        : '.webm';
      const filename = `whisper-${Date.now()}${ext}`;

      const uploadedUrl = await uploadAudioBlob(
        recordedBlob,
        filename,
        (progress) => setUploadProgress(Math.round(progress))
      );

      onVoiceMemoSaved({
        url: uploadedUrl,
        duration: recordedDuration || recordingSeconds,
        title: memoTitle.trim() || '💌 Lời thì thầm',
        recordedByName,
      });

      setRecordState('idle');
      setRecordedBlob(null);
      setRecordedAudioUrl(null);
    } catch (err: any) {
      console.error('Lỗi tải lên đoạn ghi âm:', err);
      setErrorMsg(err?.message || 'Không thể tải đoạn ghi âm lên. Vui lòng thử lại.');
      setRecordState('review');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can pick again if needed
    e.target.value = '';

    setRecordState('uploading');
    setUploadProgress(10);
    setErrorMsg(null);

    try {
      const { url } = await uploadAudioFile(file, (progress) => {
        setUploadProgress(Math.round(progress));
      });

      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');

      onVoiceMemoSaved({
        url,
        duration: 0,
        title: cleanFileName || '🎙️ Đoạn âm thanh kỷ niệm',
        recordedByName,
      });

      setRecordState('idle');
    } catch (err: any) {
      console.error('Lỗi upload file âm thanh:', err);
      setErrorMsg(err?.message || 'Không thể tải file âm thanh lên.');
      setRecordState('idle');
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // If already has an attached voice memo and not in recording/review mode
  if (currentVoiceUrl && recordState === 'idle') {
    return (
      <div className="space-y-3 p-4 bg-rose-50/50 border border-rose-200/80 rounded-2xl animate-in fade-in duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-100 text-rose-600 rounded-xl">
              <Mic className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-800">Đã đính kèm lời thì thầm</span>
              <p className="text-[11px] text-slate-500">Đoạn ghi âm này sẽ phát cùng với bài viết kỷ niệm</p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={onVoiceMemoRemoved}
              className="text-xs font-medium text-rose-500 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition cursor-pointer"
            >
              Gỡ ghi âm
            </button>
          )}
        </div>

        <JournalVoiceMemoPlayer
          voiceMemoUrl={currentVoiceUrl}
          duration={currentVoiceDuration}
          title={currentVoiceTitle || 'Lời thì thầm kỷ niệm'}
          recordedByName={recordedByName}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-br from-rose-50/60 via-pink-50/40 to-slate-50/60 border border-rose-200/70 rounded-2xl space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.webm"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Ghi âm giọng nói & Lời thì thầm</span>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-100/80 px-1.5 py-0.2 rounded-full">
                Mới
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Lưu giữ giọng nói, lời chúc, tiếng cười hoặc âm thanh kỷ niệm của hai đứa
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* STATE: IDLE */}
      {recordState === 'idle' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>Bắt đầu thu âm ngay</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-white hover:bg-slate-50 border border-rose-200 text-slate-700 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
          >
            <FileAudio className="w-4 h-4 text-rose-500" />
            <span>Tải file âm thanh (.mp3, .m4a)</span>
          </button>
        </div>
      )}

      {/* STATE: RECORDING / PAUSED */}
      {(recordState === 'recording' || recordState === 'paused') && (
        <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  recordState === 'recording' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-bold text-slate-800">
                {recordState === 'recording' ? 'Đang thu âm...' : 'Đã tạm dừng thu âm'}
              </span>
            </div>

            {/* Timer */}
            <div className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-full font-mono text-sm font-bold text-rose-600">
              {formatTimer(recordingSeconds)}
            </div>
          </div>

          {/* Animated sound wave bars */}
          <div className="h-10 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-4 bg-rose-50/50 rounded-xl border border-rose-100 overflow-hidden">
            {[40, 70, 90, 60, 30, 80, 100, 50, 75, 95, 45, 65, 85, 90, 40, 70, 100, 60, 35, 80].map((h, i) => (
              <div
                key={i}
                className="flex-1 max-w-[6px] bg-rose-500 rounded-full transition-all duration-150"
                style={{
                  height: recordState === 'recording'
                    ? `${Math.max(15, h * (0.5 + Math.sin((recordingSeconds * 4) + i) * 0.5))}%`
                    : '20%',
                  opacity: recordState === 'recording' ? 0.85 : 0.4,
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hủy bỏ</span>
            </button>

            <div className="flex items-center gap-2">
              {recordState === 'recording' ? (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Tạm dừng</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-rose-600" />
                  <span>Tiếp tục</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>Hoàn tất ({formatTimer(recordingSeconds)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE: REVIEW (Before upload & attach) */}
      {recordState === 'review' && recordedAudioUrl && (
        <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" />
              Nghe lại đoạn thu âm vừa ghi ({formatTimer(recordedDuration || recordingSeconds)})
            </span>
            <button
              type="button"
              onClick={startRecording}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Thu lại</span>
            </button>
          </div>

          {/* Audio Player Preview */}
          <JournalVoiceMemoPlayer
            voiceMemoUrl={recordedAudioUrl}
            duration={recordedDuration || recordingSeconds}
            title={memoTitle}
            recordedByName={recordedByName}
          />

          {/* Edit title / Prompt chips */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Đặt tên hoặc chủ đề cho lời thì thầm:
            </label>
            <input
              type="text"
              value={memoTitle}
              onChange={(e) => setMemoTitle(e.target.value)}
              placeholder="VD: Lời chúc ngủ ngon, Tiếng cười, Tâm sự tối..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {PRESET_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMemoTitle(t)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg border transition cursor-pointer ${
                    memoTitle === t
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-slate-50 text-slate-600 hover:bg-rose-50 border-slate-200/70 hover:border-rose-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Review actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-2 text-slate-500 hover:text-rose-600 text-xs font-semibold cursor-pointer"
            >
              Hủy đoạn này
            </button>

            <button
              type="button"
              onClick={handleSaveRecordedMemo}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>Gắn lời thì thầm vào bài viết</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE: UPLOADING */}
      {recordState === 'uploading' && (
        <div className="p-5 bg-white rounded-2xl border border-rose-200 shadow-xs flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in">
          <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
          <div>
            <p className="text-xs font-bold text-slate-800">Đang lưu đoạn ghi âm lên đám mây...</p>
            <p className="text-[11px] text-slate-500">Tiến trình: {uploadProgress}%</p>
          </div>
          <div className="w-full max-w-xs h-1.5 bg-rose-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-200"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
