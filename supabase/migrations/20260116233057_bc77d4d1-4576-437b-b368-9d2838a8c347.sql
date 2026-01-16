-- =====================================================
-- PHASE 2: WORK LOGGING SYSTEM - WinterWatch-Pro
-- Accounts, equipment, work logs, time clock with GPS
-- =====================================================

-- 1. Create service type enum
CREATE TYPE public.service_type AS ENUM ('plow', 'salt', 'both', 'shovel', 'ice_melt');

-- 2. Create work status enum
CREATE TYPE public.work_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- =====================================================
-- 3. ACCOUNTS TABLE (service locations)
-- =====================================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'MI',
  zip TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  priority INTEGER DEFAULT 5,
  geofence_radius INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. EQUIPMENT TABLE
-- =====================================================
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  license_plate TEXT,
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  status TEXT DEFAULT 'available',
  notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. WORK_LOGS TABLE (plow operations)
-- =====================================================
CREATE TABLE public.work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  service_type service_type NOT NULL DEFAULT 'both',
  status work_status NOT NULL DEFAULT 'pending',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  snow_depth_inches DECIMAL(4, 1),
  salt_used_lbs DECIMAL(6, 1),
  weather_conditions TEXT,
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_work_logs_updated_at
  BEFORE UPDATE ON public.work_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. SHOVEL_WORK_LOGS TABLE (shovel crew operations)
-- =====================================================
CREATE TABLE public.shovel_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  service_type service_type NOT NULL DEFAULT 'shovel',
  status work_status NOT NULL DEFAULT 'pending',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  areas_cleared TEXT[],
  ice_melt_used_lbs DECIMAL(6, 1),
  weather_conditions TEXT,
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.shovel_work_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_shovel_work_logs_updated_at
  BEFORE UPDATE ON public.shovel_work_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. TIME_CLOCK TABLE
-- =====================================================
CREATE TABLE public.time_clock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  clock_in_latitude DECIMAL(10, 8),
  clock_in_longitude DECIMAL(11, 8),
  clock_out_latitude DECIMAL(10, 8),
  clock_out_longitude DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.time_clock ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_time_clock_updated_at
  BEFORE UPDATE ON public.time_clock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. HELPER FUNCTION: Check if user is assigned to employee
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_user_employee(_user_id UUID, _employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id = _employee_id
      AND user_id = _user_id
  )
$$;

-- =====================================================
-- 9. RLS POLICIES - ACCOUNTS
-- =====================================================

-- Staff, managers, and admins can view active accounts
CREATE POLICY "Staff and managers can view accounts"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid()) 
    OR public.is_staff(auth.uid())
    OR client_id = auth.uid()
  );

-- Only admins and managers can insert accounts
CREATE POLICY "Admins and managers can insert accounts"
  ON public.accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Only admins and managers can update accounts
CREATE POLICY "Admins and managers can update accounts"
  ON public.accounts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Only admins and managers can delete accounts
CREATE POLICY "Admins and managers can delete accounts"
  ON public.accounts
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- =====================================================
-- 10. RLS POLICIES - EQUIPMENT
-- =====================================================

-- Staff, managers, and admins can view equipment
CREATE POLICY "Staff and managers can view equipment"
  ON public.equipment
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid()) 
    OR public.is_staff(auth.uid())
  );

-- Only admins and managers can insert equipment
CREATE POLICY "Admins and managers can insert equipment"
  ON public.equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Only admins and managers can update equipment
CREATE POLICY "Admins and managers can update equipment"
  ON public.equipment
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Only admins and managers can delete equipment
CREATE POLICY "Admins and managers can delete equipment"
  ON public.equipment
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- =====================================================
-- 11. RLS POLICIES - WORK_LOGS
-- =====================================================

-- Staff can view their own logs, managers/admins see all
CREATE POLICY "Users can view work logs"
  ON public.work_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Staff can insert their own logs, managers/admins can insert any
CREATE POLICY "Users can insert work logs"
  ON public.work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Staff can update their own logs, managers/admins can update any
CREATE POLICY "Users can update work logs"
  ON public.work_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  )
  WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Only admins and managers can delete work logs
CREATE POLICY "Admins and managers can delete work logs"
  ON public.work_logs
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- =====================================================
-- 12. RLS POLICIES - SHOVEL_WORK_LOGS
-- =====================================================

-- Staff can view their own logs, managers/admins see all
CREATE POLICY "Users can view shovel work logs"
  ON public.shovel_work_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Staff can insert their own logs
CREATE POLICY "Users can insert shovel work logs"
  ON public.shovel_work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Staff can update their own logs
CREATE POLICY "Users can update shovel work logs"
  ON public.shovel_work_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  )
  WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Only admins and managers can delete shovel work logs
CREATE POLICY "Admins and managers can delete shovel work logs"
  ON public.shovel_work_logs
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- =====================================================
-- 13. RLS POLICIES - TIME_CLOCK
-- =====================================================

-- Staff can view their own entries, managers/admins see all
CREATE POLICY "Users can view time clock entries"
  ON public.time_clock
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Staff can insert their own entries
CREATE POLICY "Users can insert time clock entries"
  ON public.time_clock
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Staff can update their own entries (for clock out)
CREATE POLICY "Users can update time clock entries"
  ON public.time_clock
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  )
  WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR public.is_user_employee(auth.uid(), employee_id)
  );

-- Only admins and managers can delete time clock entries
CREATE POLICY "Admins and managers can delete time clock entries"
  ON public.time_clock
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- =====================================================
-- 14. STORAGE BUCKET FOR WORK PHOTOS
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-photos', 'work-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload work photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'work-photos');

-- Allow public read access to work photos
CREATE POLICY "Public can view work photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'work-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update their own work photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'work-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own work photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'work-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- 15. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_work_logs_account ON public.work_logs(account_id);
CREATE INDEX idx_work_logs_employee ON public.work_logs(employee_id);
CREATE INDEX idx_work_logs_status ON public.work_logs(status);
CREATE INDEX idx_work_logs_check_in ON public.work_logs(check_in_time);

CREATE INDEX idx_shovel_work_logs_account ON public.shovel_work_logs(account_id);
CREATE INDEX idx_shovel_work_logs_employee ON public.shovel_work_logs(employee_id);
CREATE INDEX idx_shovel_work_logs_status ON public.shovel_work_logs(status);

CREATE INDEX idx_time_clock_employee ON public.time_clock(employee_id);
CREATE INDEX idx_time_clock_clock_in ON public.time_clock(clock_in_time);

CREATE INDEX idx_accounts_active ON public.accounts(is_active);
CREATE INDEX idx_equipment_active ON public.equipment(is_active);