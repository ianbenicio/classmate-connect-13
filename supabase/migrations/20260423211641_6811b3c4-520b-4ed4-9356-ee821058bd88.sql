UPDATE turmas SET horarios = '[{"fim": "19:30", "inicio": "16:30", "diaSemana": "ter"}, {"fim": "19:30", "inicio": "16:30", "diaSemana": "qui"}]'::jsonb WHERE cod = 'AD_T1';
UPDATE turmas SET horarios = '[{"fim": "18:00", "inicio": "15:00", "diaSemana": "dom"}]'::jsonb WHERE cod = 'AD_T2';
UPDATE turmas SET horarios = '[{"fim": "13:00", "inicio": "10:00", "diaSemana": "sab"}]'::jsonb WHERE cod = 'AD_T3';
UPDATE turmas SET horarios = '[{"fim": "18:00", "inicio": "15:00", "diaSemana": "sab"}]'::jsonb WHERE cod = 'AD_T4';