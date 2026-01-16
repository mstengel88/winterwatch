import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Wrench, Plus, Pencil, Trash2, Loader2, Truck } from 'lucide-react';
import { Equipment } from '@/types/database';

const EQUIPMENT_TYPES = ['Plow Truck', 'Salt Spreader', 'Loader', 'Skid Steer', 'ATV/UTV', 'Other'];
const STATUS_OPTIONS = ['available', 'in_use', 'maintenance', 'out_of_service'];

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Plow Truck',
    make: '',
    model: '',
    year: '',
    license_plate: '',
    vin: '',
    status: 'available',
    notes: '',
    is_active: true,
  });

  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const openDialog = (equip?: Equipment) => {
    if (equip) {
      setEditingEquipment(equip);
      setFormData({
        name: equip.name,
        type: equip.type,
        make: equip.make || '',
        model: equip.model || '',
        year: equip.year?.toString() || '',
        license_plate: equip.license_plate || '',
        vin: equip.vin || '',
        status: equip.status || 'available',
        notes: equip.notes || '',
        is_active: equip.is_active,
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        name: '',
        type: 'Plow Truck',
        make: '',
        model: '',
        year: '',
        license_plate: '',
        vin: '',
        status: 'available',
        notes: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      toast.error('Name and type are required');
      return;
    }

    setIsSaving(true);
    try {
      const equipmentData = {
        name: formData.name,
        type: formData.type,
        make: formData.make || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        license_plate: formData.license_plate || null,
        vin: formData.vin || null,
        status: formData.status,
        notes: formData.notes || null,
        is_active: formData.is_active,
      };

      if (editingEquipment) {
        const { error } = await supabase
          .from('equipment')
          .update(equipmentData)
          .eq('id', editingEquipment.id);
        if (error) throw error;
        toast.success('Equipment updated');
      } else {
        const { error } = await supabase.from('equipment').insert(equipmentData);
        if (error) throw error;
        toast.success('Equipment created');
      }

      setIsDialogOpen(false);
      fetchEquipment();
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast.error('Failed to save equipment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
      toast.success('Equipment deleted');
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500 text-white">Available</Badge>;
      case 'in_use':
        return <Badge className="bg-plow text-plow-foreground">In Use</Badge>;
      case 'maintenance':
        return <Badge className="bg-warning text-warning-foreground">Maintenance</Badge>;
      case 'out_of_service':
        return <Badge variant="destructive">Out of Service</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment</h1>
          <p className="text-muted-foreground">Manage vehicles and equipment</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEquipment ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
              <DialogDescription>
                {editingEquipment ? 'Update equipment details' : 'Add a new vehicle or equipment'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Truck #1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="Ford"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="F-350"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2023"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license_plate">License Plate</Label>
                  <Input
                    id="license_plate"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="capitalize">{status.replace('_', ' ')}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Maintenance notes, special instructions, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingEquipment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            All Equipment
          </CardTitle>
          <CardDescription>
            {equipment.length} piece{equipment.length !== 1 ? 's' : ''} of equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Vehicle Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((equip) => (
                  <TableRow key={equip.id} className={!equip.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{equip.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{equip.type}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {equip.year || equip.make || equip.model ? (
                          <div>{[equip.year, equip.make, equip.model].filter(Boolean).join(' ')}</div>
                        ) : null}
                        {equip.license_plate && (
                          <div className="text-muted-foreground">Plate: {equip.license_plate}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(equip.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openDialog(equip)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(equip.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {equipment.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No equipment yet. Click "Add Equipment" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
