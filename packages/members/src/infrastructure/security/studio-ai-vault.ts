import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { StudioAiUnavailableError } from '../../domain/ai-usage/studio-ai.errors'
import type { StudioAiSecretVault } from '../../domain/ports/studio-ai-account.port'

/** Independent, versioned keys: old versions remain decryptable during rotation. */
export class AesStudioAiVault implements StudioAiSecretVault {
  private readonly keys = new Map<string, Buffer>()
  constructor(
    keys: Record<string, string>,
    private readonly activeId: string,
  ) {
    for (const [id, hex] of Object.entries(keys)) {
      if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id) || !/^[a-f0-9]{64}$/i.test(hex))
        throw new Error('Configuração do cofre de IA inválida.')
      this.keys.set(id, Buffer.from(hex, 'hex'))
    }
    if (!this.keys.has(activeId)) throw new Error('Versão ativa do cofre de IA ausente.')
  }
  seal(value: string, context: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.keys.get(this.activeId)!, iv)
    cipher.setAAD(Buffer.from(`studio-ai:v1:${context}`))
    const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return [
      'v1',
      this.activeId,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      bytes.toString('base64url'),
    ].join(':')
  }
  open(value: string, context: string): string {
    try {
      const [version, id, iv, tag, body, extra] = value.split(':')
      if (version !== 'v1' || !id || !iv || !tag || !body || extra !== undefined) throw new Error()
      const key = this.keys.get(id)
      if (!key) throw new Error()
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
      decipher.setAAD(Buffer.from(`studio-ai:v1:${context}`))
      decipher.setAuthTag(Buffer.from(tag, 'base64url'))
      return Buffer.concat([
        decipher.update(Buffer.from(body, 'base64url')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      throw new StudioAiUnavailableError()
    }
  }
}
