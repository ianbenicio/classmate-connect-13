-- =============================================================================
-- Migration 20260425200000: Backfill professor_id from String Names (Fase 7)
-- =============================================================================
-- Purpose: Migrate historical "professor" string values to professor_id FK
--
-- This migration matches atividades.professor string names to professor records
-- and populates the professor_id foreign key with the corresponding UUID.
--
-- Note: This is a best-effort backfill. Professors that don't exist in the
-- database (typos, historical names, etc.) will remain with NULL professor_id.
-- The query at the end shows which professor names couldn't be matched.

-- Backfill professor_id by matching professor string names (case-insensitive, trimmed)
UPDATE public.atividades
SET professor_id = (
  SELECT id FROM public.professores
  WHERE LOWER(TRIM(nome)) = LOWER(TRIM(public.atividades.professor))
  LIMIT 1
)
WHERE professor IS NOT NULL
  AND professor_id IS NULL;

-- Log: Show which professor names couldn't be matched to any professor record
-- This is informational—check if these are typos or historical names
-- If you find missing professors, create them and re-run this migration
SELECT DISTINCT professor as unmatched_professor_name,
       COUNT(*) as count_of_unmatched_activities
FROM public.atividades
WHERE professor IS NOT NULL
  AND professor_id IS NULL
GROUP BY professor
ORDER BY count DESC;
