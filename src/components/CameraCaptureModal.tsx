import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, MapPin, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, autoLocation?: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Fetch current GPS location and geocode to Vietnamese address
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt Google Geocoder if available on window
          if ((window as any).google && (window as any).google.maps) {
            const geocoder = new (window as any).google.maps.Geocoder();
            const latlng = { lat: latitude, lng: longitude };
            geocoder.geocode({ location: latlng }, (results: any, status: any) => {
              setLocating(false);
              if (status === 'OK' && results && results[0]) {
                const formatted = results[0].formatted_address;
                setCurrentLocation(formatted);
              } else {
                fallbackNominatim(latitude, longitude);
              }
            });
            return;
          }
        } catch {
          // fallback
        }
        fallbackNominatim(latitude, longitude);
      },
      (err) => {
        console.warn('Geolocation error during camera capture:', err);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fallbackNominatim = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi`
      );
      if (res.ok) {
        const data = await res.json();
        const display = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setCurrentLocation(display);
      }
    } catch {
      setCurrentLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setLocating(false);
    }
  };

  // Start Camera Stream
  const startCamera = async (mode: 'environment' | 'user') => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Cannot open preferred camera mode, trying fallback:', err);
      try {
        // Fallback to any video device
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
          setIsCameraActive(true);
        }
      } catch (fallbackErr: any) {
        console.error('Camera access completely denied:', fallbackErr);
        setCameraError(
          fallbackErr.name === 'NotAllowedError'
            ? 'Quyền truy cập Camera bị từ chối. Vui lòng cho phép truy cập Camera trong cài đặt trình duyệt.'
            : 'Không tìm thấy thiết bị Camera khả dụng trên máy của bạn.'
        );
        setIsCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
      fetchCurrentLocation();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Toggle Front / Back Camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Take Snapshot
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, flip horizontally for mirror preview
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // High quality JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm photo
  const handleConfirm = () => {
    if (!capturedImage) return;
    onCapture(capturedImage, currentLocation || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="camera-capture-modal"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn select-none"
    >
      <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-white">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Chụp ảnh kỷ niệm trực tiếp
              </h3>
              <p className="text-[11px] text-slate-400">
                Tự động định vị và lưu vị trí chụp ảnh trên web
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black min-h-[320px] sm:min-h-[380px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-300 font-medium leading-relaxed">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Thử lại Camera
              </button>
            </div>
          ) : capturedImage ? (
            // Captured Snapshot Preview
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured"
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
          ) : (
            // Live Video Feed
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[70vh] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Shutter helper grid */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-15 border border-white/40">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>

              {/* Flip camera button */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className="absolute top-3 right-3 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md border border-white/20 transition cursor-pointer shadow-lg z-20"
                title="Đổi camera trước/sau"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Live Location Tagging Display */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 text-xs flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 block font-medium">
              Vị trí tự động nhận diện:
            </span>
            <p className="text-xs text-rose-200 font-semibold truncate">
              {locating ? (
                <span className="flex items-center gap-1 text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                  Đang lấy tọa độ GPS...
                </span>
              ) : currentLocation ? (
                currentLocation
              ) : (
                <span className="text-slate-500 font-normal">Chưa lấy được vị trí (hãy bật GPS trình duyệt)</span>
              )}
            </p>
          </div>
          {!locating && (
            <button
              type="button"
              onClick={fetchCurrentLocation}
              className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline shrink-0 cursor-pointer"
            >
              Làm mới GPS
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Chụp lại
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Sử dụng ảnh & vị trí này</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleTakeSnapshot}
                disabled={!isCameraActive}
                className="w-16 h-16 rounded-full border-4 border-white/80 bg-rose-500 hover:bg-rose-600 active:scale-95 shadow-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-40"
                title="Bấm để chụp ảnh"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
