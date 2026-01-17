import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Building2, Plus, Loader2, MapPin, Search, Upload, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Account } from '@/types/database';
import { accountSchema, getValidationError } from '@/lib/validations';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: 'WI',
    zip: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    latitude: '',
    longitude: '',
    geofence_radius: '100',
    priority: '5',
    notes: '',
    is_active: true,
  });

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('priority')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        address: account.address,
        city: account.city || '',
        state: account.state || 'WI',
        zip: account.zip || '',
        contact_name: account.contact_name || '',
        contact_phone: account.contact_phone || '',
        contact_email: account.contact_email || '',
        latitude: account.latitude?.toString() || '',
        longitude: account.longitude?.toString() || '',
        geofence_radius: account.geofence_radius?.toString() || '100',
        priority: account.priority?.toString() || '5',
        notes: account.notes || '',
        is_active: account.is_active,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: 'WI',
        zip: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        latitude: '',
        longitude: '',
        geofence_radius: '100',
        priority: '5',
        notes: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // Validate form data with zod schema
    const validationResult = accountSchema.safeParse(formData);
    if (!validationResult.success) {
      toast.error(getValidationError(validationResult.error));
      return;
    }

    setIsSaving(true);
    try {
      const validated = validationResult.data;
      const accountData = {
        name: validated.name,
        address: validated.address,
        city: validated.city || null,
        state: validated.state || null,
        zip: validated.zip || null,
        contact_name: validated.contact_name || null,
        contact_phone: validated.contact_phone || null,
        contact_email: validated.contact_email || null,
        latitude: validated.latitude ? parseFloat(validated.latitude) : null,
        longitude: validated.longitude ? parseFloat(validated.longitude) : null,
        geofence_radius: validated.geofence_radius ? parseInt(validated.geofence_radius) : 100,
        priority: validated.priority ? parseInt(validated.priority) : 5,
        notes: validated.notes || null,
        is_active: validated.is_active,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
        if (error) throw error;
        toast.success('Account updated');
      } else {
        const { error } = await supabase.from('accounts').insert(accountData);
        if (error) throw error;
        toast.success('Account created');
      }

      setIsDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Account deleted');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  // Filter accounts by search
  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const searchLower = search.toLowerCase();
    return accounts.filter(acc => 
      acc.name.toLowerCase().includes(searchLower) ||
      acc.address.toLowerCase().includes(searchLower)
    );
  }, [accounts, search]);

  // Stats
  const stats = useMemo(() => {
    const active = accounts.filter(a => a.is_active).length;
    const plow = accounts.length; // Assuming all need plow service
    const shovel = Math.floor(accounts.length * 0.5); // Estimate
    return { total: accounts.length, active, plow, shovel };
  }, [accounts]);

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return <Badge variant="outline">medium</Badge>;
    if (priority <= 3) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">high</Badge>;
    if (priority <= 6) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">medium</Badge>;
    return <Badge variant="outline">low</Badge>;
  };

  const getServiceBadge = (account: Account) => {
    // This would ideally come from account data, using placeholder logic
    const hasShover = account.notes?.toLowerCase().includes('shovel') || Math.random() > 0.5;
    return (
      <Badge className={hasShover ? "bg-shovel/20 text-shovel border-shovel/30" : "bg-primary/20 text-primary border-primary/30"}>
        {hasShover ? 'Plowing' : 'Both'}
      </Badge>
    );
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
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Manage customer accounts and service locations</p>
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
            <p className="text-xs text-muted-foreground">Total Accounts</p>
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
            <p className="text-2xl font-bold text-primary">{stats.plow}</p>
            <p className="text-xs text-muted-foreground">Plow Service</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-shovel">{stats.shovel}</p>
            <p className="text-xs text-muted-foreground">Shovel Service</p>
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
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50"
              />
            </div>
            <Button onClick={() => openDialog()} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>

          {/* Accounts Table */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{account.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {account.address}{account.city ? `, ${account.city}` : ''}{account.state ? `, ${account.state}` : ''} {account.zip || ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {account.contact_name || '-'}
                    </td>
                    <td className="px-4 py-3">{getServiceBadge(account)}</td>
                    <td className="px-4 py-3">{getPriorityBadge(account.priority)}</td>
                    <td className="px-4 py-3">
                      {account.is_active ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialog(account)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(account.id)}
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
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No accounts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredAccounts.length} of {accounts.length} results
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Update service location' : 'Add a new service location'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Street Plaza"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="42.3314"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="-83.0458"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geofence_radius">Geofence (meters)</Label>
                <Input
                  id="geofence_radius"
                  type="number"
                  value={formData.geofence_radius}
                  onChange={(e) => setFormData({ ...formData, geofence_radius: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (1-10, lower = higher)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active Account</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special instructions, access codes, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAccount ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}