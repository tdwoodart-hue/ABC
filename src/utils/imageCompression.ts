/**
 * Helper to check if a URL or Data URI is a video
 */
export function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  const clean = url.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.mkv') ||
    clean.includes('youtube.com/watch') ||
    clean.includes('youtu.be/') ||
    clean.includes('drive.google.com/file')
  );
}

export const MAX_VIDEO_FILE_SIZE_BYTES = 3.5 * 1024 * 1024; // 3.5 MB max for direct file upload to prevent mobile memory exhaustion

/**
 * Generate a lightweight video thumbnail snapshot (poster image)
 */
export async function generateVideoThumbnail(videoFileOrUrl: File | string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      let objectUrl: string | null = null;
      if (typeof videoFileOrUrl === 'string') {
        video.src = videoFileOrUrl;
      } else {
        objectUrl = URL.createObjectURL(videoFileOrUrl);
        video.src = objectUrl;
      }

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.5, video.duration || 0.1);
        } catch (e) {
          // Ignore seek error
        }
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 480;
          let w = video.videoWidth || 320;
          let h = video.videoHeight || 240;

          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const thumb = canvas.toDataURL('image/jpeg', 0.7);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve(thumb);
            return;
          }
        } catch (e) {
          console.warn('Failed to extract video thumbnail frame:', e);
        }
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve('');
      };

      video.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve('');
      };

      // Timeout fallback after 2.5s
      setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve('');
      }, 2500);
    } catch (err) {
      console.warn('generateVideoThumbnail error:', err);
      resolve('');
    }
  });
}

/**
 * Helper to compress images or read lightweight videos as Data URLs safely
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.80
): Promise<string> {
  // If it's a video, check file size first to prevent browser / Firestore crashes
  if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|mkv|m4v|ogg)$/i)) {
    if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Video dung lượng ${sizeMB}MB quá lớn. Để web chạy nhanh và không bị tràn bộ nhớ điện thoại, vui lòng chọn clip ngắn dưới 3.5MB hoặc dán link video (YouTube/Drive/Cloud)!`
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // Image compression pipeline
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          // Fallback to raw string if canvas fails
          resolve(e.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const compressAndConvertToBase64 = compressImageToDataUrl;
