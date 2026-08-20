/**
 * Media Helper: Handles image compression, video thumbnail generation,
 * format validation, and reliable file uploading for Journals and Memories.
 */

export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/jpg'];
export const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/ogg', 'video/x-matroska'];

export const ALL_SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm', '.m4v', '.mkv', '.avi', '.3gp'];

/**
 * Checks if a given URL or data string is a video
 */
export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.mkv') ||
    clean.endsWith('.avi') ||
    clean.endsWith('.3gp') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.ogv') ||
    url.startsWith('data:video/') ||
    url.includes('/video/') ||
    (url.includes('.firebasestorage.app') && url.includes('video'))
  ) {
    return true;
  }
  return false;
}

/**
 * Generates a visual thumbnail from a video File or Video URL
 */
export function generateVideoThumbnail(fileOrUrl: File | string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const isFile = typeof fileOrUrl !== 'string';
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      const videoUrl = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
      
      // Only set crossOrigin for remote URLs, never for local blob/data URLs
      if (!isFile && !videoUrl.startsWith('data:') && !videoUrl.startsWith('blob:')) {
        video.crossOrigin = 'anonymous';
      }

      video.src = videoUrl;

      let isDone = false;
      const cleanUp = () => {
        if (isDone) return;
        isDone = true;
        if (isFile) {
          try {
            URL.revokeObjectURL(videoUrl);
          } catch {
            // ignore
          }
        }
      };

      const captureFrame = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 480;
          let w = video.videoWidth || 480;
          let h = video.videoHeight || 320;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = (h * maxDim) / w;
              w = maxDim;
            } else {
              w = (w * maxDim) / h;
              h = maxDim;
            }
          }

          canvas.width = Math.max(1, Math.round(w));
          canvas.height = Math.max(1, Math.round(h));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
            cleanUp();
            resolve(thumbUrl);
            return;
          }
        } catch (err) {
          console.warn('Canvas frame capture fallback:', err);
        }
        cleanUp();
        resolve('');
      };

      video.onloadeddata = () => {
        try {
          const targetTime = Math.min(0.5, Math.max(0.1, (video.duration || 1) / 5));
          video.currentTime = targetTime;
        } catch {
          captureFrame();
        }
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        cleanUp();
        resolve('');
      };

      // Maximum 2.5s wait for thumbnail extraction
      setTimeout(() => {
        cleanUp();
        resolve('');
      }, 2500);
    } catch (e) {
      console.warn('Video thumbnail extraction error:', e);
      resolve('');
    }
  });
}

/**
 * Compresses an image file to Base64 (used as instant preview and local fallback)
 */
export function compressImageToBase64(file: File, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export interface UploadResult {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  originalName: string;
}

/**
 * Uploads a file (Image or Video) to the backend storage
 */
export async function uploadMediaFile(file: File): Promise<UploadResult> {
  const isVideo = file.type.startsWith('video/') ||
    ['.mp4', '.mov', '.webm', '.m4v', '.mkv', '.avi', '.3gp', '.ogg'].some(ext =>
      (file.name || '').toLowerCase().endsWith(ext)
    );

  // Generate thumbnail for video in parallel
  const thumbnailPromise = isVideo
    ? generateVideoThumbnail(file).catch(() => '')
    : Promise.resolve('');

  // Sanitize filename to avoid multipart header encoding issues with special characters (#, emojis, non-ascii)
  const fileExt = (file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : (isVideo ? '.mp4' : '.jpg')).toLowerCase();
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
  const safeFilename = `${safeBaseName || 'upload'}${fileExt}`;

  // Helper for single upload attempt
  const attemptUpload = async (): Promise<UploadResult | null> => {
    const formData = new FormData();
    formData.append('files', file, safeFilename);

    const [uploadResponse, videoThumbnail] = await Promise.all([
      fetch('/api/upload', {
        method: 'POST',
        body: formData,
      }),
      thumbnailPromise,
    ]);

    if (uploadResponse.ok) {
      const data = await uploadResponse.json();
      if (data.success && data.files && data.files.length > 0) {
        const uploaded = data.files[0];
        return {
          url: uploaded.url,
          type: isVideo ? 'video' : 'image',
          thumbnailUrl: videoThumbnail || undefined,
          originalName: file.name,
        };
      }
    } else {
      let msg = '';
      try {
        const errJson = await uploadResponse.json();
        msg = errJson?.error || `HTTP ${uploadResponse.status}`;
      } catch {
        msg = await uploadResponse.text();
      }
      throw new Error(msg || `HTTP ${uploadResponse.status}`);
    }
    return null;
  };

  let serverErrorMsg = '';

  try {
    const result = await attemptUpload();
    if (result) return result;
  } catch (err: any) {
    serverErrorMsg = err?.message || '';
    // Retry once on failure
    try {
      await new Promise(r => setTimeout(r, 600));
      const retryResult = await attemptUpload();
      if (retryResult) return retryResult;
    } catch (retryErr: any) {
      serverErrorMsg = retryErr?.message || serverErrorMsg || 'Không thể kết nối đến máy chủ lưu trữ.';
    }
  }

  // Fallback for image: encode to Base64
  if (!isVideo) {
    try {
      const base64 = await compressImageToBase64(file);
      return {
        url: base64,
        type: 'image',
        originalName: file.name,
      };
    } catch {
      // ignore
    }
  }

  // If server upload failed for video, throw clear message
  throw new Error(
    `Không thể tải video "${file.name}" lên máy chủ: ${serverErrorMsg || 'Vui lòng kiểm tra dung lượng hoặc định dạng.'}`
  );
}
