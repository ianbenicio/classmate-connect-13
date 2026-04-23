
-- IDs das turmas GP
-- GP_T7003-2 = e8eba017-f793-538e-b9da-d7a484e292bd
-- GP_T7004-1 = c9bfbb49-b3f0-570b-a068-31730440fbbb

-- 1) Remover duplicatas (manter o registro que já está na turma correta)
-- Atus: manter 105ace75 (T7003-2), remover 9b83cb88 (T7004-1)
DELETE FROM public.presencas WHERE aluno_id = '9b83cb88-2775-464d-96fe-c75d317a24e9';
DELETE FROM public.alunos   WHERE id       = '9b83cb88-2775-464d-96fe-c75d317a24e9';

-- Dimitri: manter c3c91bc3 (T7003-2), remover c4ba976c (T7004-1)
DELETE FROM public.presencas WHERE aluno_id = 'c4ba976c-052a-425e-80c1-5c03790710f1';
DELETE FROM public.alunos   WHERE id       = 'c4ba976c-052a-425e-80c1-5c03790710f1';

-- João Victor: manter 3e7c08da (T7003-2), remover 84dc02a7 (T7004-1)
DELETE FROM public.presencas WHERE aluno_id = '84dc02a7-b3ab-492e-a002-2e25c176a07e';
DELETE FROM public.alunos   WHERE id       = '84dc02a7-b3ab-492e-a002-2e25c176a07e';

-- Nicolas: manter 91f0fbee (T7003-2), remover 17f59e75 (T7004-1)
DELETE FROM public.presencas WHERE aluno_id = '17f59e75-211d-4fa0-ac1a-ac568401b02d';
DELETE FROM public.alunos   WHERE id       = '17f59e75-211d-4fa0-ac1a-ac568401b02d';

-- Joaquim: manter 9b4fa358 (T7003-2), remover 77d00018 (T7004-1)
DELETE FROM public.presencas WHERE aluno_id = '77d00018-5f7b-40ef-881c-6c12ce31468c';
DELETE FROM public.alunos   WHERE id       = '77d00018-5f7b-40ef-881c-6c12ce31468c';
