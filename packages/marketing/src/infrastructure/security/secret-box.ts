import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { SecretBox } from '../../domain/ports/secret-box.port'

/**
 * Cofre de segredos AES-256-GCM para os tokens das contas sociais.
 *
 * Formato persistido: `v1.<iv>.<tag>.<ct>` (partes em base64url). O prefixo de
 * versão permite rotação de esquema no futuro (`v2` com chave nova convive com
 * selos `v1` antigos). AAD fixa amarra o selo ao contexto — um selo copiado de
 * outra tabela/uso não abre aqui.
 *
 * Nasce local no marketing (o core não tem cifra); promover ao core quando um
 * segundo serviço precisar.
 */
const VERSION = 'v1'
const AAD = Buffer.from('marketing.social_account')
const IV_BYTES = 12

export class SecretBoxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'SecretBoxError'
  }
}

/** Cria o cofre a partir da chave (32 bytes em base64 — `MARKETING_TOKEN_ENC_KEY`). */
export function createSecretBox(keyBase64: string): SecretBox {
  const key = Buffer.from(keyBase64, 'base64')
  if (key.length !== 32) {
    throw new SecretBoxError('Chave da secret-box deve ter exatamente 32 bytes (base64)')
  }
  return {
    seal(plain: string): string {
      const iv = randomBytes(IV_BYTES)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      cipher.setAAD(AAD)
      const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
      const tag = cipher.getAuthTag()
      return [
        VERSION,
        iv.toString('base64url'),
        tag.toString('base64url'),
        ciphertext.toString('base64url'),
      ].join('.')
    },
    open(sealed: string): string {
      const parts = sealed.split('.')
      if (parts.length !== 4) throw new SecretBoxError('Selo em formato inválido')
      const [version, ivPart, tagPart, ctPart] = parts
      if (version !== VERSION) throw new SecretBoxError(`Versão de selo desconhecida: ${version}`)
      const iv = Buffer.from(ivPart ?? '', 'base64url')
      const tag = Buffer.from(tagPart ?? '', 'base64url')
      const ciphertext = Buffer.from(ctPart ?? '', 'base64url')
      if (iv.length !== IV_BYTES || tag.length !== 16) {
        throw new SecretBoxError('Selo em formato inválido')
      }
      try {
        const decipher = createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAAD(AAD)
        decipher.setAuthTag(tag)
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
      } catch (error) {
        throw new SecretBoxError('Falha ao abrir o selo (tag/chave inválida)', { cause: error })
      }
    },
  }
}
