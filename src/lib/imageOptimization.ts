/**
 * Image Optimization Utilities for iOS
 * Handles lazy loading, caching, and memory-efficient image display
 */

/**
 * Generate optimized image URL with size parameters
 * Works with Supabase Storage URLs
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): string {
  if (!url) return '';
  
  // If it's a Supabase storage URL, we can use transform parameters
  if (url.includes('supabase.co/storage')) {
    const transformParams = new URLSearchParams();
    if (options.width) transformParams.set('width', options.width.toString());
    if (options.height) transformParams.set('height', options.height.toString());
    if (options.quality) transformParams.set('quality', options.quality.toString());
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${transformParams.toString()}`;
  }
  
  return url;
}

/**
 * Check if an image is cached in browser
 */
export function isImageCached(url: string): boolean {
  if (typeof Image === 'undefined') return false;
  
  const img = new Image();
  img.src = url;
  return img.complete;
}

/**
 * Preload images for smoother transitions
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Don't fail on error
          img.src = url;
        })
    )
  );
}

/**
 * Convert blob to base64 for efficient caching
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress image before upload (reduces bandwidth and storage)
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to compress image'));
          },
          'image/jpeg',
          quality
        );
      } else {
        reject(new Error('Canvas context not available'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get placeholder color from image (for loading states)
 */
export function getDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 1;
      canvas.height = 1;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        resolve(`rgb(${r}, ${g}, ${b})`);
      } else {
        resolve('rgb(128, 128, 128)');
      }
    };
    
    img.onerror = () => resolve('rgb(128, 128, 128)');
    img.src = imageUrl;
  });
}
