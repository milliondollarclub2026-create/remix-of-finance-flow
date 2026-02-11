
-- Drop all existing permissive "Allow all access" policies and replace with authenticated-only policies
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Create proper auth-based policies for all 14 tables
-- Only authenticated users can access data (single-tenant app)

CREATE POLICY "Authenticated users can read" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.company_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.company_settings FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.account_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.account_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.account_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.account_groups FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.category_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.category_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.category_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.category_groups FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.counterparties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.counterparties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.counterparties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.counterparties FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.business_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.business_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.business_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.business_lines FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.products FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.planned_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.planned_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.planned_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.planned_payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.roles FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.profiles FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON public.project_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.project_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.project_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON public.project_documents FOR DELETE TO authenticated USING (true);
