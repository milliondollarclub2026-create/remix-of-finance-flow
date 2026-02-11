
-- Change projects.manager_id FK from NO ACTION to SET NULL
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_manager_id_fkey;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Also fix projects.business_line_id FK from NO ACTION to SET NULL
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_business_line_id_fkey;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_business_line_id_fkey
  FOREIGN KEY (business_line_id) REFERENCES public.business_lines(id)
  ON DELETE SET NULL;
