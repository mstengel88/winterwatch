import { useState } from 'react';
import { WorkLog, ShovelWorkLog, Account } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Clock, MapPin, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecentWorkListProps {
  workLogs: (WorkLog | ShovelWorkLog)[];
  variant?: 'plow' | 'shovel';
}

export function RecentWorkList({ workLogs, variant = 'plow' }: RecentWorkListProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<string[] | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (workLogs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No work logs today</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="mr-1 h-3 w-3" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn) return '--';
    const start = new Date(checkIn).getTime();
    const end = checkOut ? new Date(checkOut).getTime() : Date.now();
    const diff = end - start;
    const minutes = Math.round(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const openPhotoViewer = (photos: string[]) => {
    setSelectedPhotos(photos);
    setCurrentPhotoIndex(0);
  };

  const closePhotoViewer = () => {
    setSelectedPhotos(null);
    setCurrentPhotoIndex(0);
  };

  const nextPhoto = () => {
    if (selectedPhotos) {
      setCurrentPhotoIndex((prev) => (prev + 1) % selectedPhotos.length);
    }
  };

  const prevPhoto = () => {
    if (selectedPhotos) {
      setCurrentPhotoIndex((prev) => (prev - 1 + selectedPhotos.length) % selectedPhotos.length);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {workLogs.map((log) => {
          const account = log.account as Account | undefined;
          const photos = log.photo_urls || [];
          
          return (
            <Card key={log.id}>
              <CardHeader className="py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {account?.name || 'Unknown Account'}
                    </CardTitle>
                    {account && (
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        {account.address}
                      </CardDescription>
                    )}
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatTime(log.check_in_time)} - {formatTime(log.check_out_time)}
                  </span>
                  <span className="font-medium">
                    {calculateDuration(log.check_in_time, log.check_out_time)}
                  </span>
                </div>
                
                {/* Photo thumbnails */}
                {photos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex gap-1">
                      {photos.slice(0, 3).map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => openPhotoViewer(photos)}
                          className="h-10 w-10 rounded overflow-hidden border hover:ring-2 ring-primary transition-all"
                        >
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                      {photos.length > 3 && (
                        <button
                          onClick={() => openPhotoViewer(photos)}
                          className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-muted/80"
                        >
                          +{photos.length - 3}
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {photos.length} photo{photos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={selectedPhotos !== null} onOpenChange={closePhotoViewer}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Photo {currentPhotoIndex + 1} of {selectedPhotos?.length || 0}
            </DialogTitle>
          </DialogHeader>
          {selectedPhotos && (
            <div className="relative">
              <img
                src={selectedPhotos[currentPhotoIndex]}
                alt={`Photo ${currentPhotoIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              {selectedPhotos.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}