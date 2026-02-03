import { useState, useEffect, useRef } from 'react';
import { ShovelWorkLog, Account } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, LogOut, Shovel, Loader2, Clock } from 'lucide-react';
import { PhotoUpload } from './PhotoUpload';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useCheckoutFormPersistence } from '@/hooks/useCheckoutFormPersistence';

interface ActiveShovelWorkCardProps {
  workLog: ShovelWorkLog;
  onCheckOut: (data: CheckOutData) => Promise<boolean>;
}

interface CheckOutData {
  areasCleared?: string[];
  iceMeltUsedLbs?: number;
  weatherConditions?: string;
  notes?: string;
  photoUrls?: string[];
}

const CLEARABLE_AREAS = [
  { id: 'sidewalk', label: 'Sidewalk' },
  { id: 'driveway', label: 'Driveway' },
  { id: 'steps', label: 'Steps/Stairs' },
  { id: 'porch', label: 'Porch' },
  { id: 'walkway', label: 'Walkway' },
  { id: 'entrance', label: 'Building Entrance' },
];

export function ActiveShovelWorkCard({ workLog, onCheckOut }: ActiveShovelWorkCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use persistence hook - formData updates when visibility changes
  const { formData, updateField, updatePhotoPreviews, clearPersistedData } = useCheckoutFormPersistence({
    workLogId: workLog.id,
    variant: 'shovel',
  });
  
  // Form state synced with persistence
  const [areasCleared, setAreasCleared] = useState<string[]>([]);
  const [iceMeltUsed, setIceMeltUsed] = useState('');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');
  const isRestoringRef = useRef(false);
  
  const photoUpload = usePhotoUpload({ folder: 'shovel-logs' });

  // Restore form state from persisted data whenever formData changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      isRestoringRef.current = true;
      setAreasCleared(formData.areasCleared || []);
      setIceMeltUsed(formData.iceMeltUsed || '');
      setWeather(formData.weather || '');
      setNotes(formData.notes || '');
      
      // Restore photos if available
      if (formData.photoPreviews && formData.photoPreviews.length > 0 && photoUpload.previews.length === 0) {
        photoUpload.restorePreviews(formData.photoPreviews);
      }
      
      // Reset flag after a tick to allow state to settle
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }, [formData]); // Re-run when formData updates (e.g., on visibility change)

  // Persist form changes (skip during restoration)
  useEffect(() => {
    if (!isRestoringRef.current && areasCleared.length > 0) {
      updateField('areasCleared', areasCleared);
    }
  }, [areasCleared, updateField]);

  useEffect(() => {
    if (!isRestoringRef.current && iceMeltUsed) {
      updateField('iceMeltUsed', iceMeltUsed);
    }
  }, [iceMeltUsed, updateField]);

  useEffect(() => {
    if (!isRestoringRef.current && weather) {
      updateField('weather', weather);
    }
  }, [weather, updateField]);

  useEffect(() => {
    if (!isRestoringRef.current && notes) {
      updateField('notes', notes);
    }
  }, [notes, updateField]);

  // Persist photo previews when they change (skip during restoration)
  useEffect(() => {
    if (!isRestoringRef.current && photoUpload.previews.length > 0) {
      updatePhotoPreviews(photoUpload.previews);
    }
  }, [photoUpload.previews, updatePhotoPreviews]);

  const handleAreaToggle = (areaId: string) => {
    setAreasCleared((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    
    // Upload photos first
    let photoUrls: string[] = [];
    if (photoUpload.photos.length > 0) {
      photoUrls = await photoUpload.uploadPhotos(workLog.id);
    }
    
    const success = await onCheckOut({
      areasCleared: areasCleared.length > 0 ? areasCleared : undefined,
      iceMeltUsedLbs: iceMeltUsed ? parseFloat(iceMeltUsed) : undefined,
      weatherConditions: weather || undefined,
      notes: notes || undefined,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    });
    
    // Clear persisted data on successful checkout
    if (success) {
      clearPersistedData();
    }
    
    setIsSubmitting(false);
  };

  const account = workLog.account as Account | undefined;
  const checkInTime = workLog.check_in_time
    ? new Date(workLog.check_in_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <Card className="border-shovel/50 theme-shovel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shovel className="h-5 w-5 text-shovel" />
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
        <div className="space-y-3">
          <Label>Areas Cleared</Label>
          <div className="grid grid-cols-2 gap-2">
            {CLEARABLE_AREAS.map((area) => (
              <div key={area.id} className="flex items-center space-x-2">
                <Checkbox
                  id={area.id}
                  checked={areasCleared.includes(area.id)}
                  onCheckedChange={() => handleAreaToggle(area.id)}
                />
                <label
                  htmlFor={area.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {area.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="iceMelt">Ice Melt Used (lbs)</Label>
          <Input
            id="iceMelt"
            type="number"
            step="1"
            min="0"
            placeholder="e.g., 10"
            value={iceMeltUsed}
            onChange={(e) => setIceMeltUsed(e.target.value)}
          />
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
          hasRestoredPreviews={photoUpload.hasRestoredPreviews}
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