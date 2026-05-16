-- CRITICAL fix: relatorios_exportados tinha policies "Authenticated *" com USING (true).

DROP POLICY IF EXISTS "Authenticated read relatorios_exportados" ON public.relatorios_exportados;
DROP POLICY IF EXISTS "Authenticated insert relatorios_exportados" ON public.relatorios_exportados;
DROP POLICY IF EXISTS "Authenticated delete relatorios_exportados" ON public.relatorios_exportados;

DROP POLICY IF EXISTS "Staff manage relatorios_exportados" ON public.relatorios_exportados;
CREATE POLICY "Staff manage relatorios_exportados" ON public.relatorios_exportados
  FOR ALL TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Owner read own relatorio_exportado" ON public.relatorios_exportados;
CREATE POLICY "Owner read own relatorio_exportado" ON public.relatorios_exportados
  FOR SELECT TO authenticated
  USING (gerado_por_user_id = auth.uid());

DROP POLICY IF EXISTS "Owner delete own relatorio_exportado" ON public.relatorios_exportados;
CREATE POLICY "Owner delete own relatorio_exportado" ON public.relatorios_exportados
  FOR DELETE TO authenticated
  USING (gerado_por_user_id = auth.uid());

COMMENT ON TABLE public.relatorios_exportados IS 'Historico de PDFs/JSON exportados. RLS restrita a staff + owner.';
