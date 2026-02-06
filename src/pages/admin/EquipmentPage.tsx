import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Truck, Plus, Loader2, Search, Settings } from 'lucide-react';
import { Equipment } from '@/types/database';
import { equipmentSchema, getValidationError } from '@/lib/validations';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { EquipmentDialog } from '@/components/equipment/EquipmentDialog';
import { LogMaintenanceDialog } from '@/components/equipment/LogMaintenanceDialog';
import { MaintenanceHistoryDialog } from '@/components/equipment/MaintenanceHistoryDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaintenanceRequestsTab } from '@/components/equipment/MaintenanceRequestsTab';

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  // Maintenance dialogs
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<Equipment | null>(null);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [historyEquipment, setHistoryEquipment] = useState<Equipment | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Plow Truck',
    make: '',
    model: '',
    year: '',
    license_plate: '',
    vin: '',
    status: 'available',
    service_type: 'both',
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
        service_type: (equip as any).service_type || 'both',
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
        service_type: 'both',
        notes: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const validationResult = equipmentSchema.safeParse(formData);
    if (!validationResult.success) {
      toast.error(getValidationError(validationResult.error));
      return;
    }

    setIsSaving(true);
    try {
      const validated = validationResult.data;
      const equipmentData = {
        name: validated.name,
        type: validated.type,
        make: validated.make || null,
        model: validated.model || null,
        year: validated.year ? parseInt(validated.year) : null,
        license_plate: validated.license_plate || null,
        vin: validated.vin || null,
        status: validated.status,
        service_type: formData.service_type,
        notes: validated.notes || null,
        is_active: validated.is_active,
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

  const handleLogService = (equip: Equipment) => {
    setMaintenanceEquipment(equip);
    setIsMaintenanceDialogOpen(true);
  };

  const handleViewHistory = (equip: Equipment) => {
    setHistoryEquipment(equip);
    setIsHistoryDialogOpen(true);
  };

  // Filter equipment by search
  const filteredEquipment = useMemo(() => {
    if (!search) return equipment;
    const searchLower = search.toLowerCase();
    return equipment.filter(eq => 
      eq.name.toLowerCase().includes(searchLower) ||
      eq.type.toLowerCase().includes(searchLower) ||
      eq.make?.toLowerCase().includes(searchLower) ||
      eq.model?.toLowerCase().includes(searchLower)
    );
  }, [equipment, search]);

  // Stats
  const stats = useMemo(() => {
    const active = equipment.filter(e => e.status === 'available' || e.status === 'in_use').length;
    const maintenance = equipment.filter(e => e.status === 'maintenance').length;
    const overdue = equipment.filter(e => e.status === 'out_of_service').length;
    return { total: equipment.length, active, maintenance, overdue };
  }, [equipment]);

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
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Equipment</h1>
            <p className="text-muted-foreground">Manage vehicles and equipment inventory</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Types
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
            <p className="text-xs text-muted-foreground">Out of Service</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-3">
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

      {/* Equipment Grid */}
      {filteredEquipment.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No equipment found</p>
            <Button onClick={() => openDialog()} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Equipment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEquipment.map((equip) => (
            <EquipmentCard
              key={equip.id}
              equipment={equip}
              onEdit={openDialog}
              onDelete={handleDelete}
              onLogService={handleLogService}
              onViewHistory={handleViewHistory}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredEquipment.length} of {equipment.length} equipment
      </p>

      {/* Dialogs */}
      <EquipmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        isSaving={isSaving}
        isEditing={!!editingEquipment}
      />

      <LogMaintenanceDialog
        equipment={maintenanceEquipment}
        open={isMaintenanceDialogOpen}
        onOpenChange={setIsMaintenanceDialogOpen}
        onSuccess={fetchEquipment}
      />

      <MaintenanceHistoryDialog
        equipment={historyEquipment}
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        onUpdate={fetchEquipment}
      />
    </div>
  );
}
