import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Truck, Plus, Loader2, Search, Upload, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Equipment } from '@/types/database';

const EQUIPMENT_TYPES = ['Plow Truck', 'Salt Truck', 'Loader', 'Skid Steer', 'Quadaxle', 'Box Truck', 'Semi', 'Other'];
const STATUS_OPTIONS = ['available', 'in_use', 'maintenance', 'out_of_service'];

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
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

  // Filter equipment by search
  const filteredEquipment = useMemo(() => {
    if (!search) return equipment;
    const searchLower = search.toLowerCase();
    return equipment.filter(eq => 
      eq.name.toLowerCase().includes(searchLower) ||
      eq.type.toLowerCase().includes(searchLower)
    );
  }, [equipment, search]);

  // Stats
  const stats = useMemo(() => {
    const active = equipment.filter(e => e.status === 'available' || e.status === 'in_use').length;
    const maintenance = equipment.filter(e => e.status === 'maintenance').length;
    const overdue = equipment.filter(e => e.status === 'out_of_service').length;
    return { total: equipment.length, active, maintenance, overdue };
  }, [equipment]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'available':
      case 'in_use':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Maintenance</Badge>;
      case 'out_of_service':
        return <Badge variant="destructive">Out of Service</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return <Badge variant="outline" className="bg-muted/50">{type}</Badge>;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment</h1>
          <p className="text-muted-foreground">Manage vehicles and equipment inventory</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Equipment</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-orange-400">{stats.maintenance}</p>
            <p className="text-xs text-muted-foreground">In Maintenance</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue Service</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50"
              />
            </div>
            <Button onClick={() => openDialog()} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Equipment
            </Button>
          </div>

          {/* Equipment Table */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Maintenance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredEquipment.map((equip) => (
                  <tr key={equip.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{equip.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(equip.type)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {equip.make || equip.model ? `${equip.make || ''} ${equip.model || ''}`.trim() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {equip.type.toLowerCase().includes('plow') ? 'Plow' : 
                       equip.type.toLowerCase().includes('salt') ? 'Salt' : 'Both'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">-</td>
                    <td className="px-4 py-3">{getStatusBadge(equip.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialog(equip)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(equip.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredEquipment.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No equipment found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredEquipment.length} of {equipment.length} results
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
  );
}