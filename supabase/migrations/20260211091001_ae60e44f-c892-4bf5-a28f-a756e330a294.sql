
-- Add new columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS business_line_id uuid REFERENCES public.business_lines(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Create project_documents table
CREATE TABLE public.project_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.project_documents FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload project docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can read project docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can delete project docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-documents');
