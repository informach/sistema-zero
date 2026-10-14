import { shell } from '@/server/shell'

// A fala da criança vira texto para a equipe (14/10/2026). A lógica e as recusas moram no
// member-shell (`routes/voice.ts`); a voz não é guardada em lugar nenhum.
export const { POST } = shell.routes.voiceTranscribe
