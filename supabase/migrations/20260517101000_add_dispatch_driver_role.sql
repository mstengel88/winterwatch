-- Adds a WinterWatch role that can only use the dispatch driver route bridge.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dispatch_driver';
