import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Plus, Pencil, Trash2, Loader2, Lock, Shield } from 'lucide-react';

interface NotificationType {
  id: string;
  name: string;
  label: string;
  description: string | null;
  is_system: boolean;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
}

export default function NotificationTypesPage() {
  const { toast } = useToast();
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState<NotificationType | null>(null);
  const [deleteType, setDeleteType] = useState<NotificationType | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    description: '',
    is_mandatory: false,
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_types')
        .select('*')
        .order('is_system', { ascending: false })
        .order('label');

      if (error) throw error;
      setTypes(data || []);
    } catch (err) {
      console.error('Error fetching notification types:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notification types',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingType(null);
    setFormData({ name: '', label: '', description: '', is_mandatory: false });
    setShowDialog(true);
  };

  const openEdit = (type: NotificationType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      label: type.label,
      description: type.description || '',
      is_mandatory: type.is_mandatory,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.label.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and label are required',
      });
      return;
    }

    // Validate name format (lowercase, underscores only)
    const nameRegex = /^[a-z][a-z0-9_]*$/;
    if (!nameRegex.test(formData.name)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name must be lowercase letters, numbers, and underscores only',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingType) {
        // Update existing (only label, description, mandatory for non-system)
        const updateData: Record<string, unknown> = {
          label: formData.label.trim(),
          description: formData.description.trim() || null,
        };
        
        if (!editingType.is_system) {
          updateData.is_mandatory = formData.is_mandatory;
        }

        const { error } = await supabase
          .from('notification_types')
          .update(updateData)
          .eq('id', editingType.id);

        if (error) throw error;
        toast({ title: 'Updated', description: 'Notification type updated' });
      } else {
        // Create new
        const { error } = await supabase
          .from('notification_types')
          .insert({
            name: formData.name.trim(),
            label: formData.label.trim(),
            description: formData.description.trim() || null,
            is_mandatory: formData.is_mandatory,
            is_system: false,
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'A notification type with this name already exists',
            });
            return;
          }
          throw error;
        }
        toast({ title: 'Created', description: 'Notification type created' });
      }

      setShowDialog(false);
      fetchTypes();
    } catch (err) {
      console.error('Error saving notification type:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save notification type',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteType) return;

    try {
      const { error } = await supabase
        .from('notification_types')
        .delete()
        .eq('id', deleteType.id);

      if (error) throw error;
      
      toast({ title: 'Deleted', description: 'Notification type deleted' });
      setDeleteType(null);
      fetchTypes();
    } catch (err) {
      console.error('Error deleting notification type:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete notification type',
      });
    }
  };

  const toggleActive = async (type: NotificationType) => {
    try {
      const { error } = await supabase
        .from('notification_types')
        .update({ is_active: !type.is_active })
        .eq('id', type.id);

      if (error) throw error;
      fetchTypes();
    } catch (err) {
      console.error('Error toggling active state:', err);
    }
  };

  const toggleMandatory = async (type: NotificationType) => {
    try {
      const { error } = await supabase
        .from('notification_types')
        .update({ is_mandatory: !type.is_mandatory })
        .eq('id', type.id);

      if (error) throw error;
      fetchTypes();
      toast({
        title: type.is_mandatory ? 'Now Optional' : 'Now Mandatory',
        description: `${type.label} is now ${type.is_mandatory ? 'optional' : 'mandatory'} for employees`,
      });
    } catch (err) {
      console.error('Error toggling mandatory state:', err);
    }
  };

  return (
    <div className="container py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notification Types</h1>
            <p className="text-muted-foreground">Manage notification categories</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notification Types</CardTitle>
          <CardDescription>
            System types cannot be deleted but can have mandatory settings adjusted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : types.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No notification types found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Mandatory</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{type.label}</span>
                        {type.is_system && (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            System
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {type.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {type.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={type.is_mandatory}
                          onCheckedChange={() => toggleMandatory(type)}
                        />
                        {type.is_mandatory && (
                          <Shield className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => toggleActive(type)}
                        disabled={type.is_system}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!type.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteType(type)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Notification Type' : 'Add Notification Type'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Update the notification type details'
                : 'Create a new notification category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (system identifier)</Label>
              <Input
                id="name"
                placeholder="e.g., weather_alert"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                disabled={!!editingType}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Display Label</Label>
              <Input
                id="label"
                placeholder="e.g., Weather Alert"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this notification type..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {(!editingType || !editingType.is_system) && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Mandatory</Label>
                  <p className="text-xs text-muted-foreground">
                    Employees cannot disable this notification type
                  </p>
                </div>
                <Switch
                  checked={formData.is_mandatory}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteType} onOpenChange={() => setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteType?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
