import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ImageIcon } from 'lucide-react';

interface PhotoThumbnailsProps {
  photoPaths: string[];
  onViewPhotos: (paths: string[]) => void;
}

export function PhotoThumbnails({ photoPaths, onViewPhotos }: PhotoThumbnailsProps) {
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadThumbnails = async () => {
      if (!photoPaths || photoPaths.length === 0) {
        setIsLoading(false);
        return;
      }

      const urls: string[] = [];
      
      // Only load first 3 thumbnails for performance
      const pathsToLoad = photoPaths.slice(0, 3);
      
      for (const path of pathsToLoad) {
        // Check if it's already a full URL (legacy data)
        if (path.startsWith('http')) {
          urls.push(path);
          continue;
        }
        
        const { data, error } = await supabase.storage
          .from('work-photos')
          .createSignedUrl(path, 3600);

        if (!error && data?.signedUrl) {
          urls.push(data.signedUrl);
        }
      }
      
      setThumbnailUrls(urls);
      setIsLoading(false);
    };

    loadThumbnails();
  }, [photoPaths]);

  if (!photoPaths || photoPaths.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="flex items-center gap-1">
      {thumbnailUrls.map((url, index) => (
        <button
          key={index}
          onClick={() => onViewPhotos(photoPaths)}
          className="h-8 w-8 rounded overflow-hidden border border-border/50 hover:ring-2 ring-primary transition-all flex-shrink-0"
        >
          <img
            src={url}
            alt={`Photo ${index + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
      {photoPaths.length > 3 && (
        <button
          onClick={() => onViewPhotos(photoPaths)}
          className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-muted/80 flex-shrink-0"
        >
          +{photoPaths.length - 3}
        </button>
      )}
    </div>
  );
}
