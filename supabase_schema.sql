-- ==========================================
-- Prakriti Track Supabase Schema Initialization
-- ==========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (Extends Supabase Auth Auth)
-- ==========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('plant_head', 'plant_manager', 'driver', 'regulatory')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS but allow everything for simplicity during migration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on profiles" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 2. HOSPITALS
-- ==========================================
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  beds INTEGER,
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  contact TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on hospitals" ON public.hospitals FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 3. BAGS
-- ==========================================
CREATE TABLE public.bags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode TEXT UNIQUE NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id),
  hospital_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Yellow', 'Red', 'Blue', 'White')),
  weight NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES public.profiles(id),
  gps_lat NUMERIC(10, 6),
  gps_lng NUMERIC(10, 6),
  route_id UUID REFERENCES public.routes(id),
  batch_id UUID REFERENCES public.batches(id)
);

ALTER TABLE public.bags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on bags" ON public.bags FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 4. ROUTES
-- ==========================================
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.profiles(id),
  driver_name TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  vehicle_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Route site assignments handled dynamically in React

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on routes" ON public.routes FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 5. BATCHES
-- ==========================================
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number TEXT UNIQUE NOT NULL,
  bag_count INTEGER DEFAULT 0,
  total_weight NUMERIC(10, 2) DEFAULT 0,
  treatment_type TEXT,
  operator TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  treated_at TIMESTAMPTZ
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on batches" ON public.batches FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 6. DISCREPANCIES
-- ==========================================
CREATE TABLE public.discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bag_id UUID REFERENCES public.bags(id),
  barcode TEXT,
  type TEXT NOT NULL,
  description TEXT,
  route_id UUID REFERENCES public.routes(id),
  status TEXT DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on discrepancies" ON public.discrepancies FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 7. AUDIT LOGS
-- ==========================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read/insert operations for authenticated users on audit logs" ON public.audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert operations for authenticated users on audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
