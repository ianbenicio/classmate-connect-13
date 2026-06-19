-- Bucket interno para upload da chamada em papel digitalizada.
-- MVP: somente o arquivo da chamada faz upload; plano/documento de estudo fica em aula_evidencias.dados.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aula-chamadas',
  'aula-chamadas',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Staff read aula chamadas" ON storage.objects;
CREATE POLICY "Staff read aula chamadas"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'aula-chamadas' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff upload aula chamadas" ON storage.objects;
CREATE POLICY "Staff upload aula chamadas"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aula-chamadas' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update aula chamadas" ON storage.objects;
CREATE POLICY "Staff update aula chamadas"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'aula-chamadas' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'aula-chamadas' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete aula chamadas" ON storage.objects;
CREATE POLICY "Staff delete aula chamadas"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'aula-chamadas' AND public.is_staff(auth.uid()));
