
-- Add business fields to company_settings
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'LLC';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS default_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Add is_system flag to roles
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Add user_id to profiles for auth linking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
