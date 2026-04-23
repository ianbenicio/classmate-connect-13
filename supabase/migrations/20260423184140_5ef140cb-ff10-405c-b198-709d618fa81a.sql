ALTER TABLE public.cursos
ADD COLUMN turno_diario_min integer NOT NULL DEFAULT 60;

-- Inicializa turno_diario_min com duracao_aula_min para cursos existentes
UPDATE public.cursos SET turno_diario_min = duracao_aula_min WHERE turno_diario_min = 60 AND duracao_aula_min <> 60;
UPDATE public.cursos SET turno_diario_min = duracao_aula_min;