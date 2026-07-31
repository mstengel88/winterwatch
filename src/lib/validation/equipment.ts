export type EquipmentFormData = {
  name: string;
  type: string;
  make: string;
  model: string;
  year: string;
  license_plate: string;
  vin: string;
  status: string;
  notes: string;
  is_active: boolean;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validateEquipmentForm(formData: EquipmentFormData): ValidationResult<EquipmentFormData> {
  const data: EquipmentFormData = {
    ...formData,
    name: formData.name.trim(),
    type: formData.type.trim(),
    make: formData.make.trim(),
    model: formData.model.trim(),
    year: formData.year.trim(),
    license_plate: formData.license_plate.trim(),
    vin: formData.vin.trim(),
    notes: formData.notes.trim(),
  };

  if (!data.name) return { success: false, error: 'Name is required' };
  if (data.name.length > 100) return { success: false, error: 'Name must be less than 100 characters' };
  if (!data.type) return { success: false, error: 'Type is required' };
  if (data.make.length > 100) return { success: false, error: 'Make must be less than 100 characters' };
  if (data.model.length > 100) return { success: false, error: 'Model must be less than 100 characters' };
  if (data.license_plate.length > 20) return { success: false, error: 'License plate must be less than 20 characters' };
  if (data.vin.length > 17) return { success: false, error: 'VIN must be 17 characters or less' };
  if (!['available', 'in_use', 'maintenance', 'out_of_service'].includes(data.status)) {
    return { success: false, error: 'Invalid equipment status' };
  }

  if (data.year) {
    const year = parseInt(data.year, 10);
    const currentYear = new Date().getFullYear();
    if (Number.isNaN(year) || year < 1900 || year > currentYear + 1) {
      return { success: false, error: 'Year must be between 1900 and next year' };
    }
  }

  if (data.notes.length > 2000) return { success: false, error: 'Notes must be less than 2000 characters' };

  return { success: true, data };
}
