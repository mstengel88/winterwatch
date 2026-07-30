export type AccountFormData = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  latitude: string;
  longitude: string;
  geofence_radius: string;
  priority: string;
  notes: string;
  is_active: boolean;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ZIP_CODE_REGEX = /^(\d{5}(-\d{4})?)?$/;
const PHONE_REGEX = /^([+]?[\d\s\-().]{10,20})?$/;

export function validateAccountForm(formData: AccountFormData): ValidationResult<AccountFormData> {
  const data: AccountFormData = {
    ...formData,
    name: formData.name.trim(),
    address: formData.address.trim(),
    city: formData.city.trim(),
    state: formData.state.trim(),
    zip: formData.zip.trim(),
    contact_name: formData.contact_name.trim(),
    contact_phone: formData.contact_phone.trim(),
    contact_email: formData.contact_email.trim(),
    latitude: formData.latitude.trim(),
    longitude: formData.longitude.trim(),
    geofence_radius: formData.geofence_radius.trim(),
    priority: formData.priority.trim(),
    notes: formData.notes.trim(),
  };

  if (!data.name) return { success: false, error: 'Name is required' };
  if (data.name.length > 255) return { success: false, error: 'Name must be less than 255 characters' };
  if (!data.address) return { success: false, error: 'Address is required' };
  if (data.address.length > 500) return { success: false, error: 'Address must be less than 500 characters' };
  if (data.city.length > 100) return { success: false, error: 'City must be less than 100 characters' };
  if (data.state.length > 50) return { success: false, error: 'State must be less than 50 characters' };
  if (!ZIP_CODE_REGEX.test(data.zip)) return { success: false, error: 'ZIP must be 5 digits or 5+4 format' };
  if (data.contact_name.length > 100) return { success: false, error: 'Contact name must be less than 100 characters' };
  if (!PHONE_REGEX.test(data.contact_phone)) return { success: false, error: 'Invalid phone number format' };
  if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
    return { success: false, error: 'Invalid email address' };
  }

  if (data.latitude) {
    const latitude = parseFloat(data.latitude);
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return { success: false, error: 'Latitude must be between -90 and 90' };
    }
  }

  if (data.longitude) {
    const longitude = parseFloat(data.longitude);
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return { success: false, error: 'Longitude must be between -180 and 180' };
    }
  }

  if (data.geofence_radius) {
    const radius = parseInt(data.geofence_radius, 10);
    if (Number.isNaN(radius) || radius < 10 || radius > 10000) {
      return { success: false, error: 'Geofence radius must be between 10 and 10000 meters' };
    }
  }

  if (data.priority) {
    const priority = parseInt(data.priority, 10);
    if (Number.isNaN(priority) || priority < 1 || priority > 10) {
      return { success: false, error: 'Priority must be between 1 and 10' };
    }
  }

  if (data.notes.length > 2000) return { success: false, error: 'Notes must be less than 2000 characters' };

  return { success: true, data };
}
