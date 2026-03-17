import { Equipment } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Truck, MoreHorizontal, Pencil, Trash2, Wrench, History } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  onEdit: (equipment: Equipment) => void;
  onDelete: (id: string) => void;
  onLogService: (equipment: Equipment) => void;
  onViewHistory: (equipment: Equipment) => void;
}

export function EquipmentCard({ equipment, onEdit, onDelete, onLogService, onViewHistory }: EquipmentCardProps) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available':
      case 'in_use':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'maintenance':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'out_of_service':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'available':
      case 'in_use':
        return 'Active';
      case 'maintenance':
        return 'Maintenance';
      case 'out_of_service':
        return 'Out of Service';
      default:
        return status || 'Unknown';
    }
  };

  const serviceType = (equipment as any).service_type || 'both';

  return (
    <Card className="bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{equipment.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {equipment.make && equipment.model 
                  ? `${equipment.make} ${equipment.model}`
                  : equipment.type}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card z-50">
              <DropdownMenuItem onClick={() => onEdit(equipment)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(equipment)}>
                <History className="h-4 w-4 mr-2" />
                View History
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(equipment.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className={getStatusColor(equipment.status)}>
            {getStatusLabel(equipment.status)}
          </Badge>
          {serviceType === 'plow' && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Plow
            </Badge>
          )}
          {serviceType === 'salt' && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              Salt
            </Badge>
          )}
          {serviceType === 'both' && (
            <>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Plow
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                Salt
              </Badge>
            </>
          )}
        </div>

        {equipment.last_maintenance_date && (
          <p className="text-xs text-muted-foreground mt-3">
            Last service: {new Date(equipment.last_maintenance_date).toLocaleDateString()}
          </p>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-3 gap-2"
          onClick={() => onLogService(equipment)}
        >
          <Wrench className="h-4 w-4" />
          Log Service
        </Button>
      </CardContent>
    </Card>
  );
}
