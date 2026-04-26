-- Valida que cada slug em professor_avaliacoes.tags existe em
-- comportamento_tags.value. Aplica-se a INSERT e UPDATE.
--
-- Por que trigger e não FK direta:
-- Postgres não suporta FK em elementos de array. Trigger BEFORE valida
-- antes de gravar, levantando exceção com a lista de slugs inválidos
-- pra debug fácil.
--
-- Idempotente: DROP IF EXISTS antes de recriar.

CREATE OR REPLACE FUNCTION public.validate_professor_avaliacao_tags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invalid text[];
BEGIN
  -- Vazio ou null: nada a validar
  IF NEW.tags IS NULL OR cardinality(NEW.tags) = 0 THEN
    RETURN NEW;
  END IF;

  -- Acha slugs em NEW.tags que NÃO existem em comportamento_tags.value
  SELECT array_agg(t)
    INTO v_invalid
    FROM unnest(NEW.tags) AS t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.comportamento_tags ct
      WHERE ct.value = t
    );

  IF v_invalid IS NOT NULL AND cardinality(v_invalid) > 0 THEN
    RAISE EXCEPTION
      'professor_avaliacoes.tags contém slug(s) inválido(s): %. Verifique comportamento_tags.value.',
      v_invalid
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_prof_aval_tags
  ON public.professor_avaliacoes;

CREATE TRIGGER trg_validate_prof_aval_tags
  BEFORE INSERT OR UPDATE OF tags
  ON public.professor_avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_professor_avaliacao_tags();
