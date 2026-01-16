import { useState } from 'react';
import { WorkLog, Account } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, LogOut, Snowflake, Loader2, Clock } from 'lucide-react';
import { PhotoUpload } from './PhotoUpload';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';

interface ActiveWorkCardProps {
  workLog: WorkLog;
  onCheckOut: (data: CheckOutData) => Promise<boolean>;
  variant?: 'plow' | 'shovel';
}

interface CheckOutData {
  snowDepthInches?: number;
  saltUsedLbs?: number;
  weatherConditions?: string;
  notes?: string;
  photoUrls?: string[];
}

export function ActiveWorkCard({ workLog, onCheckOut, variant = 'plow' }: ActiveWorkCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  
  const photoUpload = usePhotoUpload({ folder: 'work-logs' });

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    
    // Upload photos first
    let photoUrls: string[] = [];
    if (photoUpload.photos.length > 0) {
      photoUrls = await photoUpload.uploadPhotos(workLog.id);
    }
    
    await onCheckOut({
      snowDepthInches: snowDepth ? parseFloat(snowDepth) : undefined,
      saltUsedLbs: saltUsed ? parseFloat(saltUsed) : undefined,
      weatherConditions: weather || undefined,
      notes: notes || undefined,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    });
    setIsSubmitting(false);
  };

  const account = workLog.account as Account | undefined;
  const checkInTime = workLog.check_in_time
    ? new Date(workLog.check_in_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  const themeClass = variant === 'shovel' ? 'border-shovel/50' : 'border-plow/50';
  const iconColorClass = variant === 'shovel' ? 'text-shovel' : 'text-plow';

  return (
    <Card className={themeClass}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Snowflake className={`h-5 w-5 ${iconColorClass}`} />
              Active Work
            </CardTitle>
            <CardDescription className="mt-1">
              {account?.name || 'Unknown Account'}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Checked in at {checkInTime}
            </p>
          </div>
        </div>
        {account && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {account.address}
            {account.city && `, ${account.city}`}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="snowDepth">Snow Depth (inches)</Label>
            <Input
              id="snowDepth"
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g., 3.5"
              value={snowDepth}
              onChange={(e) => setSnowDepth(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saltUsed">Salt Used (lbs)</Label>
            <Input
              id="saltUsed"
              type="number"
              step="5"
              min="0"
              placeholder="e.g., 50"
              value={saltUsed}
              onChange={(e) => setSaltUsed(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weather">Weather Conditions</Label>
          <Select value={weather} onValueChange={setWeather}>
            <SelectTrigger id="weather">
              <SelectValue placeholder="Select conditions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light_snow">Light Snow</SelectItem>
              <SelectItem value="heavy_snow">Heavy Snow</SelectItem>
              <SelectItem value="freezing_rain">Freezing Rain</SelectItem>
              <SelectItem value="sleet">Sleet</SelectItem>
              <SelectItem value="clear">Clear</SelectItem>
              <SelectItem value="cloudy">Cloudy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes about the work..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <PhotoUpload
          photos={photoUpload.photos}
          previews={photoUpload.previews}
          isUploading={photoUpload.isUploading}
          uploadProgress={photoUpload.uploadProgress}
          canAddMore={photoUpload.canAddMore}
          onAddPhotos={photoUpload.addPhotos}
          onRemovePhoto={photoUpload.removePhoto}
        />

        <Button
          onClick={handleCheckOut}
          disabled={isSubmitting || photoUpload.isUploading}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Check Out
        </Button>
      </CardContent>
    </Card>
  );
}