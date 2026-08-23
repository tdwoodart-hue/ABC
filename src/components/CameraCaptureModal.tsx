import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Loader2,
  MapPin,
  RefreshCw,
  Video,
  X,
} from 'lucide-react';

import {
  getDeviceHighAccuracyGPS,
  reverseGeocodeGPS,
} from '../utils/geolocation';

export interface CameraLocationMetadata {
  lat: number;
  lng: number;
  accuracy?: number;
  locationTimestamp?: string;
  locationName?: string;
  address?: string;
}

export type CameraCaptureMode = 'photo' | 'video';

export interface CameraCapturedMedia {
  kind: CameraCaptureMode;
  blob: Blob;
  mimeType: string;
  fileName: string;
  durationSeconds?: number;
}

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;

  /**
   * Legacy photo callback used by the current LightHomeScreen.
   * Kept intact so this file can be replaced safely before file #2.
   */
  onCapture: (
    imageDataUrl: string,
    autoLocation?: string,
    locationData?: CameraLocationMetadata
  ) => void | Promise<void>;

  /**
   * New media callback.
   * File #2 (LightHomeScreen.tsx) will connect this to Firebase Storage
   * so recorded video is stored in the existing /videos/ flow.
   */
  onCaptureMedia?: (
    media: CameraCapturedMedia,
    locationData?: CameraLocationMetadata
  ) => void | Promise<void>;
}

type PermissionStateLike = PermissionState | 'unknown';

interface CachedLocation {
  savedAt: number;
  data: CameraLocationMetadata;
}

const LOCATION_CACHE_KEY = 'us:camera-location:v2';
const LOCATION_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const MAX_RECORDING_SECONDS = 60;

const readCachedLocation = (): CameraLocationMetadata | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedLocation;

    if (
      !parsed ||
      !parsed.data ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > LOCATION_CACHE_MAX_AGE_MS ||
      typeof parsed.data.lat !== 'number' ||
      typeof parsed.data.lng !== 'number'
    ) {
      window.sessionStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
};

const writeCachedLocation = (data: CameraLocationMetadata) => {
  if (typeof window === 'undefined') return;

  try {
    const payload: CachedLocation = {
      savedAt: Date.now(),
      data,
    };

    window.sessionStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // Cache failure must never block camera usage.
  }
};

const getGeolocationPermissionState =
  async (): Promise<PermissionStateLike> => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.permissions?.query
    ) {
      return 'unknown';
    }

    try {
      const status = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });

      return status.state;
    } catch {
      // Safari / iOS versions that do not expose geolocation via
      // Permissions API should not trigger a permission prompt here.
      return 'unknown';
    }
  };

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không thể đọc ảnh vừa chụp.'));
      }
    };

    reader.onerror = () =>
      reject(new Error('Không thể đọc ảnh vừa chụp.'));

    reader.readAsDataURL(blob);
  });

const chooseRecorderMimeType = (): string => {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof MediaRecorder.isTypeSupported !== 'function'
  ) {
    return '';
  }

  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return (
    candidates.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType)
    ) || ''
  );
};

const extensionForMimeType = (mimeType: string): string =>
  mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';

const formatTimer = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');

  return `${mins}:${secs}`;
};

export const CameraCaptureModal: React.FC<
  CameraCaptureModalProps
> = ({
  isOpen,
  onClose,
  onCapture,
  onCaptureMedia,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const cameraRequestIdRef = useRef(0);

  const [captureMode, setCaptureMode] =
    useState<CameraCaptureMode>('photo');

  const [facingMode, setFacingMode] =
    useState<'environment' | 'user'>('environment');

  const [capturedImage, setCapturedImage] =
    useState<string | null>(null);

  const [recordedVideo, setRecordedVideo] = useState<{
    blob: Blob;
    url: string;
    mimeType: string;
    durationSeconds: number;
  } | null>(null);

  const [isCameraActive, setIsCameraActive] =
    useState(false);

  const [cameraError, setCameraError] =
    useState<string | null>(null);

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const [audioAvailable, setAudioAvailable] =
    useState(true);

  const [videoError, setVideoError] =
    useState<string | null>(null);

  const [gpsMetadata, setGpsMetadata] =
    useState<CameraLocationMetadata | null>(null);

  const [locationPermission, setLocationPermission] =
    useState<PermissionStateLike>('unknown');

  const [locating, setLocating] =
    useState(false);

  const [locationError, setLocationError] =
    useState<string | null>(null);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopCamera = () => {
    cameraRequestIdRef.current += 1;

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  };

  const discardRecordedVideo = () => {
    setRecordedVideo((current) => {
      if (current?.url) {
        try {
          URL.revokeObjectURL(current.url);
        } catch {
          // ignore
        }
      }

      return null;
    });
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== 'inactive'
    ) {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }

    clearRecordingTimer();
  };

  const resetCapturedMedia = () => {
    setCapturedImage(null);
    discardRecordedVideo();
    setVideoError(null);
    setRecordingSeconds(0);
  };

  const getVideoConstraints = (
    mode: 'environment' | 'user'
  ): MediaTrackConstraints => ({
    facingMode: {
      ideal: mode,
    },
    width: {
      ideal: 1920,
    },
    height: {
      ideal: 1080,
    },
    frameRate: {
      ideal: 30,
      max: 60,
    },
  });

  const attachStream = async (
    stream: MediaStream,
    requestId: number
  ) => {
    if (
      requestId !== cameraRequestIdRef.current
    ) {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      return;
    }

    streamRef.current = stream;
    setAudioAvailable(
      stream.getAudioTracks().length > 0
    );

    const videoElement = videoRef.current;

    if (!videoElement) {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      return;
    }

    videoElement.srcObject = stream;

    try {
      await videoElement.play();
    } catch {
      // playsInline + muted usually allows autoplay.
      // If the browser blocks it, the stream is still attached.
    }

    if (
      requestId === cameraRequestIdRef.current
    ) {
      setIsCameraActive(true);
    }
  };

  const describeCameraError = (
    error: any
  ): string => {
    const errorName =
      error?.name || '';

    if (
      !window.isSecureContext &&
      window.location.hostname !== 'localhost'
    ) {
      return 'Camera trên web cần HTTPS. Hãy mở bản đã deploy bằng HTTPS.';
    }

    if (
      errorName === 'NotAllowedError' ||
      errorName === 'SecurityError'
    ) {
      return 'Camera đang bị chặn. Hãy cho phép quyền Camera cho trang này rồi thử lại.';
    }

    if (
      errorName === 'NotFoundError' ||
      errorName === 'DevicesNotFoundError'
    ) {
      return 'Không tìm thấy camera khả dụng trên thiết bị này.';
    }

    if (
      errorName === 'NotReadableError' ||
      errorName === 'TrackStartError'
    ) {
      return 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
    }

    if (
      errorName === 'OverconstrainedError' ||
      errorName === 'ConstraintNotSatisfiedError'
    ) {
      return 'Camera không hỗ trợ cấu hình được yêu cầu. Hãy thử lại.';
    }

    return 'Không thể mở Camera. Hãy kiểm tra quyền Camera của trình duyệt.';
  };

  const requestCameraStream = async (
    mode: 'environment' | 'user',
    targetMode: CameraCaptureMode
  ): Promise<MediaStream> => {
    const videoConstraints =
      getVideoConstraints(mode);

    if (targetMode === 'photo') {
      return navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
    }

    /**
     * VIDEO:
     * Ask for microphone only when the user actually switches to VIDEO.
     * If microphone is denied/unavailable, recording still works silently.
     */
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (audioError: any) {
      console.warn(
        'Video + microphone unavailable, retrying video-only:',
        audioError
      );

      const silentStream =
        await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

      setAudioAvailable(false);

      return silentStream;
    }
  };

  const startCamera = async (
    mode: 'environment' | 'user',
    targetMode: CameraCaptureMode
  ) => {
    setCameraError(null);
    setVideoError(null);

    stopRecording();
    stopCamera();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        'Trình duyệt này không hỗ trợ Camera trực tiếp. Hãy dùng Safari/Chrome trên thiết bị thật.'
      );
      return;
    }

    const requestId =
      cameraRequestIdRef.current + 1;

    cameraRequestIdRef.current =
      requestId;

    try {
      const stream =
        await requestCameraStream(
          mode,
          targetMode
        );

      await attachStream(
        stream,
        requestId
      );
    } catch (error: any) {
      console.error(
        'Camera access failed:',
        error
      );

      if (
        requestId ===
        cameraRequestIdRef.current
      ) {
        setCameraError(
          describeCameraError(error)
        );
        setIsCameraActive(false);
      }
    }
  };

  const fetchCurrentLocation =
    async () => {
      if (locating) return;

      setLocating(true);
      setLocationError(null);

      try {
        const gps =
          await getDeviceHighAccuracyGPS();

        const geocoded =
          await reverseGeocodeGPS(
            gps.latitude,
            gps.longitude
          );

        const nextMetadata:
          CameraLocationMetadata = {
          lat: gps.latitude,
          lng: gps.longitude,
          accuracy: gps.accuracy,
          locationTimestamp:
            gps.timestamp,
          locationName:
            geocoded.placeName,
          address:
            geocoded.formattedAddress,
        };

        setGpsMetadata(
          nextMetadata
        );

        writeCachedLocation(
          nextMetadata
        );

        setLocationPermission(
          'granted'
        );
      } catch (error: any) {
        console.warn(
          'Camera location unavailable:',
          error
        );

        const message =
          error?.message ||
          'Không thể lấy vị trí hiện tại.';

        setLocationError(message);

        const permission =
          await getGeolocationPermissionState();

        setLocationPermission(
          permission
        );
      } finally {
        setLocating(false);
      }
    };

  /**
   * CAMERA LIFECYCLE
   *
   * Delayed by one tick so React StrictMode's development
   * mount -> cleanup -> remount cycle does not fire two immediate
   * getUserMedia requests.
   *
   * Notice GPS is NOT here. Flipping camera never requests GPS again.
   */
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      stopCamera();
      return;
    }

    resetCapturedMedia();
    setCameraError(null);

    const timer =
      window.setTimeout(() => {
        void startCamera(
          facingMode,
          captureMode
        );
      }, 60);

    return () => {
      window.clearTimeout(timer);
      stopRecording();
      stopCamera();
    };
    // startCamera intentionally excluded; this effect is driven
    // only by the actual hardware mode switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    facingMode,
    captureMode,
  ]);

  /**
   * LOCATION LIFECYCLE
   *
   * - Reuses location captured in the last 5 minutes.
   * - Auto-refreshes ONLY if browser permission is already granted.
   * - If permission is "prompt" or unknown, opening Camera DOES NOT
   *   trigger the location permission popup. User taps the location chip.
   */
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const prepareLocation =
      async () => {
        setLocationError(null);

        const cached =
          readCachedLocation();

        if (cached) {
          setGpsMetadata(cached);
        }

        const permission =
          await getGeolocationPermissionState();

        if (cancelled) return;

        setLocationPermission(
          permission
        );

        if (
          permission === 'granted' &&
          !cached
        ) {
          void fetchCurrentLocation();
        }
      };

    void prepareLocation();

    return () => {
      cancelled = true;
    };
    // Deliberately isolated from facingMode/captureMode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /**
   * Cleanup object URLs when the modal leaves the DOM.
   */
  useEffect(
    () => () => {
      clearRecordingTimer();

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !== 'inactive'
      ) {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }

      stopCamera();

      setRecordedVideo(
        (current) => {
          if (current?.url) {
            try {
              URL.revokeObjectURL(
                current.url
              );
            } catch {
              // ignore
            }
          }

          return null;
        }
      );
    },
    []
  );

  const handleToggleCamera = () => {
    if (isRecording) return;

    resetCapturedMedia();

    setFacingMode((current) =>
      current === 'environment'
        ? 'user'
        : 'environment'
    );
  };

  const handleSelectMode = (
    nextMode: CameraCaptureMode
  ) => {
    if (
      nextMode === captureMode ||
      isRecording
    ) {
      return;
    }

    resetCapturedMedia();
    setCaptureMode(nextMode);
  };

  const handleTakeSnapshot =
    async () => {
      const video =
        videoRef.current;

      if (
        !video ||
        !isCameraActive ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }

      const canvas =
        canvasRef.current ||
        document.createElement(
          'canvas'
        );

      const maxDimension = 1600;

      const ratio =
        Math.min(
          1,
          maxDimension /
            Math.max(
              video.videoWidth,
              video.videoHeight
            )
        );

      canvas.width =
        Math.max(
          1,
          Math.round(
            video.videoWidth *
              ratio
          )
        );

      canvas.height =
        Math.max(
          1,
          Math.round(
            video.videoHeight *
              ratio
          )
        );

      const context =
        canvas.getContext('2d');

      if (!context) return;

      context.save();

      if (
        facingMode === 'user'
      ) {
        context.translate(
          canvas.width,
          0
        );

        context.scale(
          -1,
          1
        );
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.restore();

      const blob =
        await new Promise<
          Blob | null
        >((resolve) => {
          canvas.toBlob(
            resolve,
            'image/jpeg',
            0.86
          );
        });

      if (!blob) {
        setCameraError(
          'Không thể tạo ảnh vừa chụp. Hãy thử lại.'
        );
        return;
      }

      try {
        const dataUrl =
          await blobToDataUrl(
            blob
          );

        setCapturedImage(
          dataUrl
        );

        stopCamera();
      } catch (error: any) {
        setCameraError(
          error?.message ||
            'Không thể xử lý ảnh vừa chụp.'
        );
      }
    };

  const startRecording = () => {
    if (
      !isCameraActive ||
      !streamRef.current ||
      isRecording
    ) {
      return;
    }

    if (
      typeof MediaRecorder ===
      'undefined'
    ) {
      setVideoError(
        'Trình duyệt này chưa hỗ trợ quay video trực tiếp. Hãy thử Safari/Chrome mới nhất.'
      );
      return;
    }

    setVideoError(null);
    discardRecordedVideo();

    const mimeType =
      chooseRecorderMimeType();

    try {
      const recorder =
        mimeType
          ? new MediaRecorder(
              streamRef.current,
              {
                mimeType,
                videoBitsPerSecond:
                  4_000_000,
              }
            )
          : new MediaRecorder(
              streamRef.current
            );

      recordedChunksRef.current =
        [];

      recorder.ondataavailable =
        (event) => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            recordedChunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onerror = (
        event: Event
      ) => {
        console.error(
          'MediaRecorder error:',
          event
        );

        setVideoError(
          'Có lỗi khi quay video. Hãy thử lại.'
        );

        setIsRecording(false);
        clearRecordingTimer();
      };

      recorder.onstop = () => {
        const actualMimeType =
          recorder.mimeType ||
          mimeType ||
          recordedChunksRef
            .current[0]?.type ||
          'video/webm';

        const blob =
          new Blob(
            recordedChunksRef.current,
            {
              type:
                actualMimeType,
            }
          );

        const durationSeconds =
          recordingStartedAtRef.current
            ? Math.max(
                1,
                Math.round(
                  (Date.now() -
                    recordingStartedAtRef.current) /
                    1000
                )
              )
            : Math.max(
                1,
                recordingSeconds
              );

        recordedChunksRef.current =
          [];

        setIsRecording(false);
        clearRecordingTimer();

        if (
          blob.size <= 0
        ) {
          setVideoError(
            'Video vừa quay đang trống. Hãy quay lại.'
          );
          return;
        }

        const url =
          URL.createObjectURL(
            blob
          );

        setRecordedVideo({
          blob,
          url,
          mimeType:
            actualMimeType,
          durationSeconds,
        });

        stopCamera();
      };

      mediaRecorderRef.current =
        recorder;

      recordingStartedAtRef.current =
        Date.now();

      setRecordingSeconds(0);
      setIsRecording(true);

      recorder.start(500);

      recordingTimerRef.current =
        window.setInterval(() => {
          const elapsed =
            Math.floor(
              (Date.now() -
                recordingStartedAtRef.current) /
                1000
            );

          setRecordingSeconds(
            elapsed
          );

          if (
            elapsed >=
            MAX_RECORDING_SECONDS
          ) {
            stopRecording();
          }
        }, 250);
    } catch (error: any) {
      console.error(
        'Unable to start MediaRecorder:',
        error
      );

      setVideoError(
        'Không thể bắt đầu quay video trên trình duyệt này.'
      );

      setIsRecording(false);
      clearRecordingTimer();
    }
  };

  const handlePrimaryCapture =
    () => {
      if (
        captureMode === 'photo'
      ) {
        void handleTakeSnapshot();
        return;
      }

      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

  const handleRetake = () => {
    resetCapturedMedia();

    void startCamera(
      facingMode,
      captureMode
    );
  };

  const handleConfirm =
    async () => {
      if (capturedImage) {
        await onCapture(
          capturedImage,
          undefined,
          gpsMetadata || undefined
        );

        onClose();
        return;
      }

      if (
        captureMode === 'video' &&
        recordedVideo
      ) {
        if (!onCaptureMedia) {
          /**
           * Safe incremental rollout:
           * do NOT feed a video blob into the old JPEG upload handler.
           * File #2 wires this callback to uploadMediaFile(), which stores
           * video in the existing /videos/ Firebase Storage path.
           */
          setVideoError(
            'Video đã quay xong. Hãy cài file LightHomeScreen tiếp theo để bật lưu video.'
          );
          return;
        }

        const extension =
          extensionForMimeType(
            recordedVideo.mimeType
          );

        await onCaptureMedia(
          {
            kind: 'video',
            blob:
              recordedVideo.blob,
            mimeType:
              recordedVideo.mimeType,
            fileName:
              `camera-${Date.now()}.${extension}`,
            durationSeconds:
              recordedVideo.durationSeconds,
          },
          gpsMetadata ||
            undefined
        );

        onClose();
      }
    };

  const handleClose = () => {
    stopRecording();
    stopCamera();
    resetCapturedMedia();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const hasCapturedMedia =
    Boolean(
      capturedImage ||
        recordedVideo
    );

  const locationLabel =
    gpsMetadata
      ? gpsMetadata.locationName ||
        gpsMetadata.address ||
        'Đã lưu vị trí'
      : locationPermission ===
          'denied'
        ? 'Vị trí đang tắt'
        : 'Thêm vị trí';

  return (
    <div
      id="camera-capture-modal"
      className="fixed inset-0 z-[200] bg-black text-white select-none"
    >
      <div className="relative mx-auto h-[100dvh] w-full max-w-3xl overflow-hidden bg-black">
        {/* CAMERA / PREVIEW */}
        <div className="absolute inset-0 bg-black">
          {cameraError ? (
            <div className="flex h-full items-center justify-center px-7">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  <AlertCircle className="h-6 w-6 text-rose-400" />
                </div>

                <h3 className="mt-4 text-base font-bold text-white">
                  Không mở được Camera
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  {cameraError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void startCamera(
                      facingMode,
                      captureMode
                    )
                  }
                  className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition active:scale-95"
                >
                  Mở lại Camera
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Ảnh vừa chụp"
              className="h-full w-full object-contain"
            />
          ) : recordedVideo ? (
            <video
              src={recordedVideo.url}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  facingMode ===
                  'user'
                    ? 'scale-x-[-1]'
                    : ''
                }`}
              />

              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Loader2 className="h-7 w-7 animate-spin text-white/70" />
                </div>
              )}
            </>
          )}
        </div>

        {/* SUBTLE CAMERA GRADIENTS */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 via-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

        {/* TOP BAR */}
        <div
          className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4"
          style={{
            paddingTop:
              'calc(0.75rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition active:scale-95"
            aria-label="Đóng Camera"
          >
            <X className="h-5 w-5" />
          </button>

          {isRecording ? (
            <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-xs font-bold tabular-nums backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {formatTimer(
                recordingSeconds
              )}
            </div>
          ) : (
            <div />
          )}

          {!hasCapturedMedia ? (
            <button
              type="button"
              onClick={handleToggleCamera}
              disabled={isRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition active:scale-95 disabled:opacity-40"
              aria-label="Đổi Camera trước sau"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-10 w-10" />
          )}
        </div>

        {/* LOCATION CHIP */}
        <div className="absolute inset-x-0 bottom-44 z-20 flex justify-center px-5">
          <button
            type="button"
            onClick={() =>
              void fetchCurrentLocation()
            }
            disabled={locating}
            className={`flex max-w-[88vw] items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold backdrop-blur-xl transition active:scale-[0.98] ${
              gpsMetadata
                ? 'border-white/20 bg-black/45 text-white'
                : 'border-white/15 bg-black/35 text-white/75'
            }`}
            title={
              locationError ||
              undefined
            }
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5 shrink-0" />
            )}

            <span className="max-w-[65vw] truncate">
              {locating
                ? 'Đang lấy vị trí…'
                : locationLabel}
            </span>

            {gpsMetadata?.accuracy !==
              undefined && (
              <span className="shrink-0 text-[10px] font-medium text-white/45">
                ±
                {Math.round(
                  gpsMetadata.accuracy
                )}
                m
              </span>
            )}
          </button>
        </div>

        {/* VIDEO STATUS */}
        {captureMode === 'video' &&
          !hasCapturedMedia &&
          !cameraError && (
            <div className="absolute inset-x-0 bottom-[8.8rem] z-20 text-center">
              <p className="text-[10px] font-medium text-white/45">
                {audioAvailable
                  ? `Tối đa ${MAX_RECORDING_SECONDS}s · có âm thanh`
                  : `Tối đa ${MAX_RECORDING_SECONDS}s · không có âm thanh`}
              </p>
            </div>
          )}

        {videoError && (
          <div className="absolute inset-x-0 bottom-[12.3rem] z-30 flex justify-center px-5">
            <div className="max-w-sm rounded-2xl bg-rose-500/95 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xl backdrop-blur-md">
              {videoError}
            </div>
          </div>
        )}

        {/* BOTTOM CAMERA CONTROLS */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 px-5"
          style={{
            paddingBottom:
              'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {hasCapturedMedia ? (
            <div className="mx-auto flex max-w-md items-center gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-bold text-white backdrop-blur-md transition active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                {capturedImage
                  ? 'Chụp lại'
                  : 'Quay lại'}
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleConfirm()
                }
                className="flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-full bg-white text-sm font-black text-black transition active:scale-[0.98]"
              >
                <Check className="h-4 w-4" />
                Dùng{' '}
                {capturedImage
                  ? 'ảnh'
                  : 'video'}
              </button>
            </div>
          ) : (
            <>
              {/* PHOTO / VIDEO MODE */}
              <div className="mb-4 flex justify-center">
                <div className="flex items-center rounded-full bg-black/35 p-1 backdrop-blur-lg">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMode(
                        'photo'
                      )
                    }
                    disabled={
                      isRecording
                    }
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      captureMode ===
                      'photo'
                        ? 'bg-white text-black'
                        : 'text-white/60'
                    }`}
                  >
                    ẢNH
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMode(
                        'video'
                      )
                    }
                    disabled={
                      isRecording
                    }
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      captureMode ===
                      'video'
                        ? 'bg-white text-black'
                        : 'text-white/60'
                    }`}
                  >
                    VIDEO
                  </button>
                </div>
              </div>

              {/* SHUTTER ROW */}
              <div className="relative mx-auto flex h-20 max-w-md items-center justify-center">
                <button
                  type="button"
                  onClick={
                    handlePrimaryCapture
                  }
                  disabled={
                    !isCameraActive ||
                    Boolean(
                      cameraError
                    )
                  }
                  className="group flex h-[74px] w-[74px] items-center justify-center rounded-full border-[4px] border-white bg-transparent transition active:scale-95 disabled:opacity-35"
                  aria-label={
                    captureMode ===
                    'photo'
                      ? 'Chụp ảnh'
                      : isRecording
                        ? 'Dừng quay'
                        : 'Bắt đầu quay video'
                  }
                >
                  {captureMode ===
                  'photo' ? (
                    <span className="h-[58px] w-[58px] rounded-full bg-white transition group-active:scale-90" />
                  ) : (
                    <span
                      className={`bg-red-500 transition-all ${
                        isRecording
                          ? 'h-7 w-7 rounded-md'
                          : 'h-[58px] w-[58px] rounded-full'
                      }`}
                    />
                  )}
                </button>

                <div className="absolute right-2 flex h-10 w-10 items-center justify-center text-white/35">
                  {captureMode ===
                  'photo' ? (
                    <Camera className="h-4 w-4" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>
    </div>
  );
};