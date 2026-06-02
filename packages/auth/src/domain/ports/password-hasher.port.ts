/**
 * Hashing de senha. A implementação usa um algoritmo memory-hard (argon2id) e
 * embute o salt + parâmetros no próprio hash. `verify` é resistente a timing.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>
  verify(plain: string, hash: string): Promise<boolean>
}
