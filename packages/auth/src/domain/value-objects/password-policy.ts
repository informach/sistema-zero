import { ValidationError } from '@sistemazero/core/errors'

/** Teto de tamanho: argon2id processa a senha inteira; limite evita abuso de CPU. */
const MAX_PASSWORD_LENGTH = 200

/**
 * Política mínima de senha (aplicada no registro, antes do hash). Mantida simples
 * e previsível: comprimento mínimo configurável + teto. Regras de complexidade
 * (classes de caractere) podem ser adicionadas aqui sem tocar nas camadas acima.
 */
export function assertPasswordPolicy(password: string, minLength: number): void {
  if (typeof password !== 'string' || password.length < minLength) {
    throw new ValidationError(`A senha deve ter ao menos ${minLength} caracteres`)
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(`A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres`)
  }
  if (password.trim().length === 0) {
    throw new ValidationError('Senha inválida')
  }
}
