import { shell } from '@/server/shell'

// Registra o XP DIÁRIO de CRIAR no Estúdio Completo ("criou hoje" → segura o foguinho
// de quem já terminou os cursos e só cria, sem publicar). Best-effort do cliente; o
// members exige só posse do Estúdio e deduplica 1×/dia (anti-farm).
export const { POST } = shell.routes.studioActivityDay
