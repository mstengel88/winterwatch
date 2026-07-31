import type { EmployeeCategory } from '@/types/database';

export type EmployeeFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  category: EmployeeCategory;
  hourly_rate: string;
  user_id: string;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const PHONE_REGEX = /^([+]?[\d\s\-().]{10,20})?$/;

export function validateEmployeeForm(formData: EmployeeFormData): ValidationResult<EmployeeFormData> {
  const data: EmployeeFormData = {
    ...formData,
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    hourly_rate: formData.hourly_rate.trim(),
    user_id: formData.user_id.trim(),
  };

  if (!data.first_name) return { success: false, error: 'First name is required' };
  if (data.first_name.length > 100) return { success: false, error: 'First name must be less than 100 characters' };
  if (!data.last_name) return { success: false, error: 'Last name is required' };
  if (data.last_name.length > 100) return { success: false, error: 'Last name must be less than 100 characters' };
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { success: false, error: 'Invalid email address' };
  }
  if (!PHONE_REGEX.test(data.phone)) return { success: false, error: 'Invalid phone number format' };
  if (!['plow', 'shovel', 'both', 'manager', 'trucker'].includes(data.category)) {
    return { success: false, error: 'Invalid employee category' };
  }

  if (data.hourly_rate) {
    const hourlyRate = parseFloat(data.hourly_rate);
    if (Number.isNaN(hourlyRate) || hourlyRate <= 0 || hourlyRate > 1000) {
      return { success: false, error: 'Hourly rate must be between $0.01 and $1000' };
    }
  }

  return { success: true, data };
}
