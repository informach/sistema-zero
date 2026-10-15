import type { Env } from '../config/env'
import { AesStudioAiVault } from './studio-ai-vault'

export function studioAiVaultConfig(
  env: Pick<
    Env,
    'STUDIO_AI_VAULT_KEYS' | 'STUDIO_AI_VAULT_ACTIVE_ID' | 'STUDIO_AI_CALLBACK_ORIGINS'
  >,
) {
  if (
    !env.STUDIO_AI_VAULT_KEYS &&
    !env.STUDIO_AI_VAULT_ACTIVE_ID &&
    !env.STUDIO_AI_CALLBACK_ORIGINS
  )
    return { vault: null, callbackOrigins: [] }
  try {
    const keys: unknown = JSON.parse(env.STUDIO_AI_VAULT_KEYS ?? '')
    if (
      !keys ||
      typeof keys !== 'object' ||
      Array.isArray(keys) ||
      Object.values(keys).some((key) => typeof key !== 'string')
    )
      throw new Error()
    const callbackOrigins = (env.STUDIO_AI_CALLBACK_ORIGINS ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    if (!callbackOrigins.length) throw new Error()
    for (const value of callbackOrigins) {
      const url = new URL(value)
      if (
        url.origin !== value ||
        (url.protocol !== 'https:' &&
          !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
      )
        throw new Error()
    }
    return {
      vault: new AesStudioAiVault(
        keys as Record<string, string>,
        env.STUDIO_AI_VAULT_ACTIVE_ID ?? '',
      ),
      callbackOrigins,
    }
  } catch {
    throw new Error('Configuração da conexão OpenRouter incompleta ou inválida.')
  }
}
