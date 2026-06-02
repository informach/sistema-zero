import type { PasswordHasher } from '../../domain/ports/password-hasher.port'

/**
 * Hasher de senha usando o `Bun.password` nativo com **argon2id** (memory-hard,
 * recomendado pela OWASP). O salt e os parâmetros ficam embutidos no hash; o
 * `verify` autodetecta o algoritmo a partir do hash e compara em tempo constante.
 */
export function createBunPasswordHasher(): PasswordHasher {
  return {
    hash(plain: string): Promise<string> {
      return Bun.password.hash(plain, { algorithm: 'argon2id' })
    },
    async verify(plain: string, hash: string): Promise<boolean> {
      try {
        return await Bun.password.verify(plain, hash)
      } catch {
        // Hash malformado/desconhecido não deve virar 500 — trata como senha incorreta.
        return false
      }
    },
  }
}
