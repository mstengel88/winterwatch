import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePhotoUploadOptions {
  bucket?: string;
  folder?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  initialPreviews?: string[]; // For restoring persisted previews
}

export function usePhotoUpload(options: UsePhotoUploadOptions = {}) {
  const {
    bucket = 'work-photos',
    folder = 'uploads',
    maxFiles = 5,
    maxSizeMB = 10,
    initialPreviews = [],
  } = options;

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(initialPreviews);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Restore previews from persistence (photos will need to be re-added)
  const restorePreviews = useCallback((restoredPreviews: string[]) => {
    setPreviews(restoredPreviews);
  }, []);

  const addPhotos = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const validFiles: File[] = [];
    const maxSize = maxSizeMB * 1024 * 1024;

    // Clear any restored previews when user adds new photos
    // (since we can't upload the restored ones anyway)
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

    if (validFiles.length > 0) {
      // If we had restored previews without files, clear them first
      if (previews.length > photos.length) {
        setPreviews([]);
      }
      
      setPhotos((prev) => [...prev, ...validFiles]);
      
      // Create previews
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

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
    canAddMore: photos.length < maxFiles,
    hasRestoredPreviews: previews.length > photos.length, // True if showing restored previews
  };
}
