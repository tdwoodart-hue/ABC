/**
 * mediaHelper.ts — Couple app media -> The Luvin Firebase Storage
 *
 * IMPORTANT ISOLATION:
 * - Auth + Firestore stay on the couple app's existing Firebase project.
 * - Media only is uploaded to the shop project `the-luvin` as a SECONDARY Firebase app.
 * - Every object created by this helper is under `couple-app/`.
 * - This file never writes to the shop Firestore/Auth and has no delete operation.
 * - No /api/upload fallback and no Base64 fallback into Firestore.
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';

import firebaseConfig from '../../firebase-applet-config.json';

const SHOP_STORAGE_APP_NAME = 'the-luvin-storage-for-couple-app';
const SHOP_STORAGE_ROOT = 'couple-app';

// Secondary Firebase app used ONLY for Storage.
// This does not replace or mutate the couple app's main Firebase config.
const SHOP_STORAGE_CONFIG = {
  apiKey: 'AIzaSyCEEblAsaEQPDGeEO7PLrzDLfpa7Z8O1ss',
  authDomain: 'the-luvin.firebaseapp.com',
  projectId: 'the-luvin',
  storageBucket: 'the-luvin.firebasestorage.app',
  messagingSenderId: '280180645664',
  appId: '1:280180645664:web:616b7a84d214629e064145',
};

export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/jpg',
];

export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/ogg',
  'video/x-matroska',
  'video/3gpp',
  'video/avi',
];

export const ALL_SUPPORTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.mp4',
  '.mov',
  '.webm',
  '.m4v',
  '.mkv',
  '.avi',
  '.3gp',
  '.ogg',
  '.ogv',
];

const VIDEO_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.webm',
  '.m4v',
  '.mkv',
  '.avi',
  '.3gp',
  '.ogg',
  '.ogv',
];

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
];

const MAX_FILE_SIZE = 500 * 1024 * 1024;

function getExtension(filename = ''): string {
  const clean = filename.toLowerCase().split('?')[0];
  const dotIndex = clean.lastIndexOf('.');
  return dotIndex >= 0 ? clean.slice(dotIndex) : '';
}

function isVideoFile(file: File): boolean {
  const extension = getExtension(file.name);

  return (
    file.type.startsWith('video/') ||
    VIDEO_EXTENSIONS.includes(extension)
  );
}

function isImageFile(file: File): boolean {
  const extension = getExtension(file.name);

  return (
    file.type.startsWith('image/') ||
    IMAGE_EXTENSIONS.includes(extension)
  );
}

function humanFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function sanitizeFilename(
  file: File,
  isVideo: boolean
): string {
  const extension =
    getExtension(file.name) ||
    (isVideo ? '.mp4' : '.jpg');

  const rawBaseName = (file.name || 'upload')
    .replace(/\.[^/.]+$/, '');

  const safeBaseName =
    sanitizeText(rawBaseName).slice(0, 60) ||
    'upload';

  return `${safeBaseName}${extension}`;
}

function inferContentType(
  file: File,
  isVideo: boolean
): string {
  if (file.type) return file.type;

  const extension = getExtension(file.name);

  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.ogv': 'video/ogg',
    '.3gp': 'video/3gpp',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/avi',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
  };

  return (
    mimeMap[extension] ||
    (isVideo ? 'video/mp4' : 'image/jpeg')
  );
}

function randomId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getFirebaseServices() {
  // Main/default Firebase app remains the couple app project.
  const primaryApp =
    getApps().find((app) => app.name === '[DEFAULT]') ||
    initializeApp(firebaseConfig);

  const auth = getAuth(primaryApp);
  const user = auth.currentUser;

  if (!user) {
    const error = new Error(
      'Phiên đăng nhập của app couple chưa sẵn sàng. Hãy đăng nhập lại rồi thử upload.'
    ) as Error & { code?: string };

    error.code = 'storage/unauthenticated';
    throw error;
  }

  // A named SECONDARY Firebase app is created only for the shop Storage bucket.
  // It does not become [DEFAULT], so Auth/Firestore of the couple app stay untouched.
  const shopStorageApp =
    getApps().find((app) => app.name === SHOP_STORAGE_APP_NAME) ||
    initializeApp(SHOP_STORAGE_CONFIG, SHOP_STORAGE_APP_NAME);

  const storage = getStorage(
    shopStorageApp,
    `gs://${SHOP_STORAGE_CONFIG.storageBucket}`
  );

  return {
    storage,
    user,
  };
}

function createObjectPath(
  userId: string,
  folder: 'images' | 'videos' | 'thumbnails' | 'audio',
  filename: string
): string {
  const now = new Date();

  const yearMonth =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

  return [
    SHOP_STORAGE_ROOT,
    userId,
    yearMonth,
    folder,
    `${randomId()}-${sanitizeText(filename)}`,
  ].join('/');
}

function explainStorageError(error: any): string {
  const code =
    error?.code || '';

  const message =
    error?.message ||
    String(error || '');

  if (code === 'storage/unauthorized') {
    return (
      'Firebase Storage shop từ chối quyền upload (storage/unauthorized). ' +
      'Không sửa Rules shop vội; kiểm tra bucket hoặc quyền hiện tại.'
    );
  }

  if (code === 'storage/unauthenticated') {
    return (
      'Firebase Storage chưa nhận được phiên đăng nhập. ' +
      'Đăng nhập lại rồi thử lại.'
    );
  }

  if (code === 'storage/bucket-not-found') {
    return (
      'Không tìm thấy Storage bucket của shop. ' +
      'Bucket dự kiến: the-luvin.firebasestorage.app.'
    );
  }

  if (code === 'storage/quota-exceeded') {
    return 'Storage của shop đã vượt quota.';
  }

  if (code === 'storage/retry-limit-exceeded') {
    return (
      'Upload bị timeout/retry quá nhiều lần. ' +
      'Kiểm tra mạng và thử lại.'
    );
  }

  if (code === 'storage/canceled') {
    return 'Upload đã bị hủy.';
  }

  return code
    ? `${code}: ${message}`
    : message;
}

function uploadBlobResumable(
  blob: Blob,
  objectPath: string,
  metadata: {
    contentType: string;
    originalName: string;
    uploadedBy: string;
    mediaType:
      | 'image'
      | 'video'
      | 'thumbnail'
      | 'audio';
  },
  onProgress?: (
    percent: number
  ) => void
): Promise<string> {
  const {
    storage,
  } = getFirebaseServices();

  const fileRef =
    storageRef(
      storage,
      objectPath
    );

  return new Promise(
    (resolve, reject) => {
      const task =
        uploadBytesResumable(
          fileRef,
          blob,
          {
            contentType:
              metadata.contentType,

            customMetadata: {
              originalName:
                metadata.originalName,

              uploadedBy:
                metadata.uploadedBy,

              mediaType:
                metadata.mediaType,
            },
          }
        );

      task.on(
        'state_changed',

        (snapshot) => {
          if (
            onProgress &&
            snapshot.totalBytes > 0
          ) {
            onProgress(
              Math.max(
                0,
                Math.min(
                  100,
                  (snapshot.bytesTransferred /
                    snapshot.totalBytes) *
                    100
                )
              )
            );
          }
        },

        (error) => {
          reject(error);
        },

        async () => {
          try {
            const url =
              await getDownloadURL(
                task.snapshot.ref
              );

            onProgress?.(100);
            resolve(url);
          } catch (error) {
            reject(error);
          }
        }
      );
    }
  );
}

/**
 * Detect media type from local/Firebase URL.
 */
export function isVideoUrl(
  url?: string | null
): boolean {
  if (!url) return false;

  const lower =
    url.toLowerCase();

  if (
    lower.startsWith(
      'data:video/'
    )
  ) {
    return true;
  }

  if (
    lower.startsWith(
      'blob:'
    )
  ) {
    return false;
  }

  let clean =
    lower.split('?')[0];

  try {
    clean =
      decodeURIComponent(
        clean
      );
  } catch {
    // keep original URL
  }

  return (
    VIDEO_EXTENSIONS.some(
      (ext) =>
        clean.endsWith(ext)
    ) ||
    clean.includes('/videos/') ||
    clean.includes('/video/')
  );
}

/**
 * Local video thumbnail.
 * Failure never blocks main video upload.
 */
export function generateVideoThumbnail(
  fileOrUrl: File | string
): Promise<string> {
  return new Promise(
    (resolve) => {
      let objectUrl = '';
      let finished = false;

      const finish = (
        value = ''
      ) => {
        if (finished) return;

        finished = true;

        if (objectUrl) {
          try {
            URL.revokeObjectURL(
              objectUrl
            );
          } catch {
            // ignore
          }
        }

        resolve(value);
      };

      try {
        const video =
          document.createElement(
            'video'
          );

        video.muted = true;
        video.playsInline = true;
        video.preload =
          'metadata';

        if (
          typeof fileOrUrl ===
          'string'
        ) {
          if (
            !fileOrUrl.startsWith(
              'data:'
            ) &&
            !fileOrUrl.startsWith(
              'blob:'
            )
          ) {
            video.crossOrigin =
              'anonymous';
          }

          video.src =
            fileOrUrl;
        } else {
          objectUrl =
            URL.createObjectURL(
              fileOrUrl
            );

          video.src =
            objectUrl;
        }

        const capture =
          () => {
            try {
              if (
                !video.videoWidth ||
                !video.videoHeight
              ) {
                finish('');
                return;
              }

              const maxDimension =
                360;

              const ratio =
                Math.min(
                  1,
                  maxDimension /
                    Math.max(
                      video.videoWidth,
                      video.videoHeight
                    )
                );

              const canvas =
                document.createElement(
                  'canvas'
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

              const ctx =
                canvas.getContext(
                  '2d'
                );

              if (!ctx) {
                finish('');
                return;
              }

              ctx.drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height
              );

              finish(
                canvas.toDataURL(
                  'image/jpeg',
                  0.72
                )
              );
            } catch {
              finish('');
            }
          };

        video.onloadedmetadata =
          () => {
            try {
              const duration =
                Number.isFinite(
                  video.duration
                )
                  ? video.duration
                  : 1;

              video.currentTime =
                Math.min(
                  Math.max(
                    duration * 0.05,
                    0.03
                  ),
                  0.5
                );
            } catch {
              capture();
            }
          };

        video.onseeked =
          capture;

        video.onerror =
          () => finish('');

        /*
         * Do not let thumbnail extraction make the
         * upload feel stuck on iPhone.
         */
        window.setTimeout(
          () => finish(''),
          1500
        );

        video.load();
      } catch {
        finish('');
      }
    }
  );
}

/**
 * Compatibility export for old components.
 * New Journal/Memory media must not store this Base64 in Firestore.
 */
export function compressImageToBase64(
  file: File,
  maxDim = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload =
        (event) => {
          const image =
            new Image();

          image.onload =
            () => {
              const ratio =
                Math.min(
                  1,
                  maxDim /
                    Math.max(
                      image.width,
                      image.height
                    )
                );

              const canvas =
                document.createElement(
                  'canvas'
                );

              canvas.width =
                Math.max(
                  1,
                  Math.round(
                    image.width *
                      ratio
                  )
                );

              canvas.height =
                Math.max(
                  1,
                  Math.round(
                    image.height *
                      ratio
                  )
                );

              const ctx =
                canvas.getContext(
                  '2d'
                );

              if (!ctx) {
                reject(
                  new Error(
                    'Không thể xử lý ảnh.'
                  )
                );
                return;
              }

              ctx.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
              );

              resolve(
                canvas.toDataURL(
                  'image/jpeg',
                  quality
                )
              );
            };

          image.onerror =
            () =>
              reject(
                new Error(
                  'Không thể đọc ảnh.'
                )
              );

          image.src =
            event.target
              ?.result as string;
        };

      reader.onerror =
        () =>
          reject(
            new Error(
              'Không thể đọc ảnh.'
            )
          );

      reader.readAsDataURL(
        file
      );
    }
  );
}

/**
 * Resize large JPEG/WebP photos before upload.
 * Other formats stay untouched for compatibility.
 */
async function prepareImageForUpload(
  file: File
): Promise<{
  blob: Blob;
  contentType: string;
  filename: string;
}> {
  const extension =
    getExtension(file.name);

  const canCompress =
    extension === '.jpg' ||
    extension === '.jpeg' ||
    extension === '.webp';

  if (
    !canCompress ||
    file.size < 1024 * 1024
  ) {
    return {
      blob: file,
      contentType:
        inferContentType(
          file,
          false
        ),
      filename:
        sanitizeFilename(
          file,
          false
        ),
    };
  }

  try {
    const bitmap =
      await createImageBitmap(
        file
      );

    const maxDimension =
      1920;

    const ratio =
      Math.min(
        1,
        maxDimension /
          Math.max(
            bitmap.width,
            bitmap.height
          )
      );

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      Math.max(
        1,
        Math.round(
          bitmap.width *
            ratio
        )
      );

    canvas.height =
      Math.max(
        1,
        Math.round(
          bitmap.height *
            ratio
        )
      );

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      bitmap.close();

      return {
        blob: file,
        contentType:
          inferContentType(
            file,
            false
          ),
        filename:
          sanitizeFilename(
            file,
            false
          ),
      };
    }

    ctx.drawImage(
      bitmap,
      0,
      0,
      canvas.width,
      canvas.height
    );

    bitmap.close();

    const compressed =
      await new Promise<
        Blob | null
      >((resolve) => {
        canvas.toBlob(
          resolve,
          'image/jpeg',
          0.82
        );
      });

    if (
      !compressed ||
      compressed.size >=
        file.size
    ) {
      return {
        blob: file,
        contentType:
          inferContentType(
            file,
            false
          ),
        filename:
          sanitizeFilename(
            file,
            false
          ),
      };
    }

    return {
      blob: compressed,
      contentType:
        'image/jpeg',
      filename:
        sanitizeFilename(
          file,
          false
        ).replace(
          /\.[^/.]+$/,
          '.jpg'
        ),
    };
  } catch {
    /*
     * createImageBitmap is not available for every
     * image format/browser. Upload original instead.
     */
    return {
      blob: file,
      contentType:
        inferContentType(
          file,
          false
        ),
      filename:
        sanitizeFilename(
          file,
          false
        ),
    };
  }
}

function dataUrlToBlob(
  dataUrl: string
): Blob {
  const match =
    dataUrl.match(
      /^data:([^;,]+)?(;base64)?,(.*)$/
    );

  if (!match) {
    throw new Error(
      'Ảnh camera không hợp lệ.'
    );
  }

  const contentType =
    match[1] ||
    'image/jpeg';

  const isBase64 =
    Boolean(match[2]);

  const data =
    match[3] || '';

  if (!isBase64) {
    return new Blob(
      [
        decodeURIComponent(
          data
        ),
      ],
      {
        type: contentType,
      }
    );
  }

  const binary =
    atob(data);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return new Blob(
    [bytes],
    {
      type: contentType,
    }
  );
}

async function uploadThumbnail(
  dataUrl: string,
  userId: string,
  sourceFilename: string
): Promise<string | undefined> {
  if (!dataUrl) {
    return undefined;
  }

  try {
    const blob =
      dataUrlToBlob(dataUrl);

    const filename =
      `${sourceFilename.replace(
        /\.[^/.]+$/,
        ''
      )}-thumb.jpg`;

    const objectPath =
      createObjectPath(
        userId,
        'thumbnails',
        filename
      );

    return await uploadBlobResumable(
      blob,
      objectPath,
      {
        contentType:
          'image/jpeg',

        originalName:
          filename,

        uploadedBy:
          userId,

        mediaType:
          'thumbnail',
      }
    );
  } catch (error) {
    console.warn(
      'Không thể upload thumbnail video:',
      error
    );

    return undefined;
  }
}

export interface UploadResult {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  originalName: string;
}

/**
 * Upload one file directly to the shop Firebase Storage, under couple-app/ only.
 */
export async function uploadMediaFile(
  file: File,
  onProgress?: (
    percent: number
  ) => void
): Promise<UploadResult> {
  if (!file) {
    throw new Error(
      'Không tìm thấy file để tải lên.'
    );
  }

  const isVideo =
    isVideoFile(file);

  const isImage =
    isImageFile(file);

  if (
    !isVideo &&
    !isImage
  ) {
    throw new Error(
      `Định dạng "${
        getExtension(
          file.name
        ) ||
        file.type ||
        'không xác định'
      }" chưa được hỗ trợ.`
    );
  }

  if (file.size <= 0) {
    throw new Error(
      'File đang trống hoặc không đọc được.'
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      `File quá lớn (${humanFileSize(
        file.size
      )}). Giới hạn hiện tại là 500 MB.`
    );
  }

  const {
    user,
  } = getFirebaseServices();

  const thumbnailPromise =
    isVideo
      ? generateVideoThumbnail(
          file
        ).catch(() => '')
      : Promise.resolve('');

  let uploadBlob: Blob =
    file;

  let contentType =
    inferContentType(
      file,
      isVideo
    );

  let filename =
    sanitizeFilename(
      file,
      isVideo
    );

  if (isImage) {
    const prepared =
      await prepareImageForUpload(
        file
      );

    uploadBlob =
      prepared.blob;

    contentType =
      prepared.contentType;

    filename =
      prepared.filename;
  }

  const folder:
    | 'images'
    | 'videos' =
    isVideo
      ? 'videos'
      : 'images';

  const objectPath =
    createObjectPath(
      user.uid,
      folder,
      filename
    );

  try {
    const url =
      await uploadBlobResumable(
        uploadBlob,
        objectPath,
        {
          contentType,

          originalName:
            file.name ||
            filename,

          uploadedBy:
            user.uid,

          mediaType:
            isVideo
              ? 'video'
              : 'image',
        },
        onProgress
      );

    let thumbnailUrl:
      | string
      | undefined;

    if (isVideo) {
      const thumbnailDataUrl =
        await thumbnailPromise;

      if (
        thumbnailDataUrl
      ) {
        thumbnailUrl =
          await uploadThumbnail(
            thumbnailDataUrl,
            user.uid,
            filename
          );
      }
    }

    return {
      url,
      type:
        isVideo
          ? 'video'
          : 'image',
      thumbnailUrl,
      originalName:
        file.name,
    };
  } catch (error: any) {
    throw new Error(
      `Không thể upload ${
        isVideo
          ? 'video'
          : 'ảnh'
      } "${file.name}" lên Firebase Storage. ${explainStorageError(
        error
      )}`
    );
  }
}

/**
 * Upload several files concurrently.
 * Concurrency=3 is much faster than for+await but still reasonable on iPhone.
 */
export async function uploadMediaFilesConcurrently(
  files: File[],
  concurrency = 3
): Promise<UploadResult[]> {
  if (!files.length) {
    return [];
  }

  const results =
    new Array<UploadResult>(
      files.length
    );

  let nextIndex = 0;

  const worker =
    async () => {
      while (true) {
        const index =
          nextIndex++;

        if (
          index >=
          files.length
        ) {
          return;
        }

        results[index] =
          await uploadMediaFile(
            files[index]
          );
      }
    };

  const workerCount =
    Math.min(
      Math.max(
        1,
        concurrency
      ),
      files.length
    );

  await Promise.all(
    Array.from(
      {
        length:
          workerCount,
      },
      () => worker()
    )
  );

  return results;
}

/**
 * Camera Data URL -> Firebase Storage.
 */
export async function uploadDataUrlToFirebaseStorage(
  dataUrl: string,
  filename =
    `camera-${Date.now()}.jpg`,
  onProgress?: (
    percent: number
  ) => void
): Promise<string> {
  const {
    user,
  } = getFirebaseServices();

  const blob =
    dataUrlToBlob(dataUrl);

  const safeFilename =
    sanitizeText(filename) ||
    `camera-${Date.now()}.jpg`;

  const objectPath =
    createObjectPath(
      user.uid,
      'images',
      safeFilename
    );

  try {
    return await uploadBlobResumable(
      blob,
      objectPath,
      {
        contentType:
          blob.type ||
          'image/jpeg',

        originalName:
          safeFilename,

        uploadedBy:
          user.uid,

        mediaType:
          'image',
      },
      onProgress
    );
  } catch (error: any) {
    throw new Error(
      `Không thể upload ảnh Camera lên Firebase Storage của shop. ${explainStorageError(
        error
      )}`
    );
  }
}

/**
 * Upload an audio Blob (from Voice Memo recorder) to Firebase Storage under couple-app/{userId}/{yearMonth}/audio/
 */
export async function uploadAudioBlob(
  blob: Blob,
  filename = `voice-memo-${Date.now()}.webm`,
  onProgress?: (percent: number) => void
): Promise<string> {
  const { user } = getFirebaseServices();

  const safeFilename =
    sanitizeText(filename) || `voice-memo-${Date.now()}.webm`;

  const objectPath = createObjectPath(
    user.uid,
    'audio',
    safeFilename
  );

  try {
    return await uploadBlobResumable(
      blob,
      objectPath,
      {
        contentType: blob.type || 'audio/webm',
        originalName: safeFilename,
        uploadedBy: user.uid,
        mediaType: 'audio',
      },
      onProgress
    );
  } catch (error: any) {
    throw new Error(
      `Không thể tải đoạn ghi âm lên Firebase Storage: ${explainStorageError(error)}`
    );
  }
}

/**
 * Upload an audio File (selected from user's device) to Firebase Storage.
 */
export async function uploadAudioFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; originalName: string }> {
  if (!file) {
    throw new Error('Không tìm thấy file ghi âm.');
  }

  const { user } = getFirebaseServices();

  const safeFilename = sanitizeFilename(file, false);
  const objectPath = createObjectPath(user.uid, 'audio', safeFilename);

  try {
    const url = await uploadBlobResumable(
      file,
      objectPath,
      {
        contentType: file.type || 'audio/mpeg',
        originalName: file.name || safeFilename,
        uploadedBy: user.uid,
        mediaType: 'audio',
      },
      onProgress
    );

    return {
      url,
      originalName: file.name,
    };
  } catch (error: any) {
    throw new Error(
      `Không thể tải file âm thanh lên: ${explainStorageError(error)}`
    );
  }
}
