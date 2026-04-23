UPDATE cursos
SET carga_horaria_total_min = 7200,
    turno_diario_min = 150,
    duracao_aula_min = 75
WHERE cod = 'AD';

UPDATE turmas SET horarios = '[{"fim": "19:00", "inicio": "16:30", "diaSemana": "ter"}, {"fim": "19:00", "inicio": "16:30", "diaSemana": "qui"}]'::jsonb WHERE cod = 'AD_T1';
UPDATE turmas SET horarios = '[{"fim": "17:30", "inicio": "15:00", "diaSemana": "dom"}]'::jsonb WHERE cod = 'AD_T2';
UPDATE turmas SET horarios = '[{"fim": "12:30", "inicio": "10:00", "diaSemana": "sab"}]'::jsonb WHERE cod = 'AD_T3';
UPDATE turmas SET horarios = '[{"fim": "17:30", "inicio": "15:00", "diaSemana": "sab"}]'::jsonb WHERE cod = 'AD_T4';