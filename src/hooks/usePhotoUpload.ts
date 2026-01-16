import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePhotoUploadOptions {
  bucket?: string;
  folder?: string;
  maxFiles?: number;
  maxSizeMB?: number;
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

  const addPhotos = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const validFiles: File[] = [];
    const maxSize = maxSizeMB * 1024 * 1024;

    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }
      if (photos.length + validFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} photos allowed`);
        break;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
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
    const uploadedUrls: string[] = [];

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

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
        setUploadProgress(((i + 1) / photos.length) * 100);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload some photos');
      return uploadedUrls;
    } finally {
      setIsUploading(false);
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
    canAddMore: photos.length < maxFiles,
  };
}
