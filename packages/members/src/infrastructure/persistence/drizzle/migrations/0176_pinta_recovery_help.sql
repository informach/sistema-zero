-- Ajuda do Pinta (23/11/2026): a criança abre, pelo aviso de recuperação da galeria, uma conversa
-- de recados SEM aula. Um assunto novo da MESMA tabela de recados, não um canal paralelo.
ALTER TYPE "members"."teacher_thread_context" ADD VALUE IF NOT EXISTS 'pinta_recovery';
