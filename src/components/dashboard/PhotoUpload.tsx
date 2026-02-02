import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, X, Plus, Loader2 } from 'lucide-react';

interface PhotoUploadProps {
  photos: File[];
  previews: string[];
  isUploading: boolean;
  uploadProgress: number;
  canAddMore: boolean;
  onAddPhotos: (files: FileList | File[]) => void;
  onRemovePhoto: (index: number) => void;
  maxPhotos?: number;
  hasRestoredPreviews?: boolean; // Kept for backwards compatibility but no longer used
}

export function PhotoUpload({
  photos,
  previews,
  isUploading,
  uploadProgress,
  canAddMore,
  onAddPhotos,
  onRemovePhoto,
  maxPhotos = 5,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPhotos(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Photos ({photos.length}/{maxPhotos})
        </label>
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        )}
      </div>

      {isUploading && (
        <Progress value={uploadProgress} className="h-2" />
      )}

      {/* Photo previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={preview}
                alt={`Photo ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(index)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md"
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add photo buttons */}
      {canAddMore && !isUploading && (
        <div className="flex gap-2">
          {/* Camera button (mobile) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1"
          >
            <Camera className="mr-2 h-4 w-4" />
            Camera
          </Button>

          {/* Gallery button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Plus className="mr-2 h-4 w-4" />
            Gallery
          </Button>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {photos.length === 0 && !isUploading && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Add before/after photos of the completed work
        </p>
      )}
    </div>
  );
}