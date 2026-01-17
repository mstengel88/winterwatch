import { z } from 'zod';

// Account validation schema
export const accountSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),
  address: z.string()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters')
    .trim(),
  city: z.string()
    .max(100, 'City must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  state: z.string()
    .max(50, 'State must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  zip: z.string()
    .regex(/^(\d{5}(-\d{4})?)?$/, 'ZIP must be 5 digits or 5+4 format')
    .optional()
    .or(z.literal('')),
  contact_name: z.string()
    .max(100, 'Contact name must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  contact_phone: z.string()
    .regex(/^([+]?[\d\s\-().]{10,20})?$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  contact_email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  latitude: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= -90 && num <= 90;
    }, 'Latitude must be between -90 and 90'),
  longitude: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= -180 && num <= 180;
    }, 'Longitude must be between -180 and 180'),
  geofence_radius: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 10 && num <= 10000;
    }, 'Geofence radius must be between 10 and 10000 meters'),
  priority: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 1 && num <= 10;
    }, 'Priority must be between 1 and 10'),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean(),
});

// Employee validation schema
export const employeeSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .trim(),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^([+]?[\d\s\-().]{10,20})?$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  category: z.enum(['plow', 'shovel', 'both']),
  hourly_rate: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 1000;
    }, 'Hourly rate must be between $0.01 and $1000'),
  user_id: z.string().optional().or(z.literal('')),
});

// Equipment validation schema
export const equipmentSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  type: z.string()
    .min(1, 'Type is required'),
  make: z.string()
    .max(100, 'Make must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  model: z.string()
    .max(100, 'Model must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  year: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val);
      const currentYear = new Date().getFullYear();
      return !isNaN(num) && num >= 1900 && num <= currentYear + 1;
    }, 'Year must be between 1900 and next year'),
  license_plate: z.string()
    .max(20, 'License plate must be less than 20 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  vin: z.string()
    .max(17, 'VIN must be 17 characters or less')
    .trim()
    .optional()
    .or(z.literal('')),
  status: z.enum(['available', 'in_use', 'maintenance', 'out_of_service']),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean(),
});

// Work log validation schema
export const workLogSchema = z.object({
  snow_depth_inches: z.number()
    .min(0, 'Snow depth must be positive')
    .max(100, 'Snow depth must be less than 100 inches')
    .optional()
    .nullable(),
  salt_used_lbs: z.number()
    .min(0, 'Salt used must be positive')
    .max(10000, 'Salt used must be less than 10000 lbs')
    .optional()
    .nullable(),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .nullable(),
  weather_conditions: z.string()
    .max(100, 'Weather conditions must be less than 100 characters')
    .optional()
    .nullable(),
});

// Type exports
export type AccountFormData = z.infer<typeof accountSchema>;
export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type EquipmentFormData = z.infer<typeof equipmentSchema>;
export type WorkLogFormData = z.infer<typeof workLogSchema>;

// Helper function to get first validation error message
export function getValidationError(error: z.ZodError): string {
  return error.errors[0]?.message || 'Validation error';
}
