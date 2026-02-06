import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePhotoUploadOptions {
  bucket?: string;
  folder?: string;
  maxFiles?: number;
  maxSizeMB?: number;
}

// Convert base64 data URL to File object
function base64ToFile(base64: string, filename: string): File | null {
  try {
    const arr = base64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    console.error('Error converting base64 to file:', error);
    return null;
  }
}

export function usePhotoUpload(options: UsePhotoUploadOptions = {}) {
  const {
    bucket = 'work-photos',
    folder = 'uploads',
    maxFiles = 5,
    maxSizeMB = 10,
  } = options;

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Restore photos from persisted base64 previews - recreates File objects
  const restorePhotosFromBase64 = useCallback((base64Previews: string[]) => {
    const restoredFiles: File[] = [];
    const validPreviews: string[] = [];
    
    base64Previews.forEach((base64, index) => {
      const file = base64ToFile(base64, `restored-photo-${index}.jpg`);
      if (file) {
        restoredFiles.push(file);
        validPreviews.push(base64);
      }
    });
    
    if (restoredFiles.length > 0) {
      setPhotos(restoredFiles);
      setPreviews(validPreviews);
    }
  }, []);

  // Legacy restore for previews only (deprecated, use restorePhotosFromBase64)
  const restorePreviews = useCallback((restoredPreviews: string[]) => {
    restorePhotosFromBase64(restoredPreviews);
  }, [restorePhotosFromBase64]);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target?.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  }

  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const validFiles: File[] = [];
    const maxSize = maxSizeMB * 1024 * 1024;

    const currentPhotoCount = photos.length;

    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }
      if (currentPhotoCount + validFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} photos allowed`);
        break;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return previews;

    // Read previews BEFORE updating state so callers can await and persist immediately
    // (iOS can background/suspend quickly after returning from the photo picker).
    let newPreviews: string[] = [];
    try {
      newPreviews = (await Promise.all(validFiles.map(readFileAsDataUrl))).filter(Boolean);
    } catch (error) {
      console.error('Error generating photo previews:', error);
      toast.error('Could not generate photo previews');
      return previews;
    }

    const nextPreviews = [...previews, ...newPreviews];

    setPhotos((prev) => [...prev, ...validFiles]);
    setPreviews(nextPreviews);

    return nextPreviews;
  }, [maxFiles, maxSizeMB, photos.length, previews]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearPhotos = () => {
    setPhotos([]);
    setPreviews([]);
  };

  const uploadPhotos = async (workLogId: string): Promise<string[]> => {
    if (photos.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(0);
    const uploadedPaths: string[] = [];

    try {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${workLogId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Store just the file path instead of public URL
        // Photos will be retrieved using signed URLs
        uploadedPaths.push(fileName);
        setUploadProgress(((i + 1) / photos.length) * 100);
      }

      return uploadedPaths;
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload some photos');
      return uploadedPaths;
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to get signed URLs for viewing photos
  const getSignedUrls = async (filePaths: string[]): Promise<string[]> => {
    if (filePaths.length === 0) return [];

    try {
      const signedUrls: string[] = [];
      
      for (const path of filePaths) {
        // Check if it's already a full URL (legacy data)
        if (path.startsWith('http')) {
          signedUrls.push(path);
          continue;
        }
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiration

        if (error) {
          console.error('Error creating signed URL:', error);
          continue;
        }

        if (data?.signedUrl) {
          signedUrls.push(data.signedUrl);
        }
      }

      return signedUrls;
    } catch (error) {
      console.error('Error getting signed URLs:', error);
      return [];
    }
  };

  return {
    photos,
    previews,
    isUploading,
    uploadProgress,
    addPhotos,
    removePhoto,
    clearPhotos,
    uploadPhotos,
    getSignedUrls,
    restorePreviews,
    restorePhotosFromBase64,
    canAddMore: photos.length < maxFiles,
    hasRestoredPreviews: false, // No longer needed since we restore actual files
  };
}
