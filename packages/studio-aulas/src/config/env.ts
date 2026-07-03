import { z } from 'zod'

// Segredos por ETAPA (fail-fast só quando a etapa que precisa da chave roda).
// As etapas de roteiro, tela e montagem parcial NÃO exigem nenhuma chave.
// O Bun carrega o `.env` do diretório do pacote automaticamente.

const VozEnvSchema = z.object({
  ELEVENLABS_API_KEY: z.string().min(1, 'defina ELEVENLABS_API_KEY no .env'),
  ELEVENLABS_VOICE_ID: z.string().min(1, 'defina ELEVENLABS_VOICE_ID no .env'),
  ELEVENLABS_MODEL_ID: z.string().optional(),
})
export type VozEnv = z.infer<typeof VozEnvSchema>

const AvatarEnvSchema = z.object({
  HEYGEN_API_KEY: z.string().min(1, 'defina HEYGEN_API_KEY no .env'),
  HEYGEN_AVATAR_ID: z.string().min(1, 'defina HEYGEN_AVATAR_ID no .env'),
})
export type AvatarEnv = z.infer<typeof AvatarEnvSchema>

function load<T>(schema: z.ZodType<T>, etapa: string): T {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const faltando = result.error.issues.map((i) => `  • ${i.message}`).join('\n')
    console.error(
      `\n✗ Faltam variáveis de ambiente para a etapa "${etapa}":\n${faltando}\n` +
        `Copie .env.example para .env e preencha.\n`,
    )
    process.exit(1)
  }
  return result.data
}

export const loadVozEnv = (): VozEnv => load(VozEnvSchema, 'voz (ElevenLabs)')
export const loadAvatarEnv = (): AvatarEnv => load(AvatarEnvSchema, 'avatar (HeyGen)')
