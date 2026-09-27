import { randomInt } from 'node:crypto'

/**
 * O CÓDIGO DO PLANO (equipe do Pensa, 26/09/2026): o dono gera, o colega digita na home.
 *
 * Seis símbolos de um alfabeto SEM os ambíguos (0/O, 1/I/L): 31^6 ≈ 887 milhões, o que junto
 * com o teto de 10 entradas por minuto na borda torna a adivinhação inviável. Guardado sem
 * prefixo; EXIBIDO como `ZAP-7K3QM2` (o prefixo é só leitura, para a criança reconhecer o
 * que é). A ENTRADA tolera minúsculas, espaços, hífen e o prefixo.
 */
export const SHARE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const SHARE_CODE_LENGTH = 6
export const SHARE_CODE_PREFIX = 'ZAP'

const ALPHABET_SET = new Set(SHARE_CODE_ALPHABET)

/** `random(max)` = inteiro em [0, max). Injetável para os testes; por padrão, o CSPRNG. */
export function generateShareCode(random: (max: number) => number = randomInt): string {
  let code = ''
  for (let index = 0; index < SHARE_CODE_LENGTH; index += 1) {
    code += SHARE_CODE_ALPHABET[random(SHARE_CODE_ALPHABET.length)] ?? 'A'
  }
  return code
}

/**
 * O que a criança digitou → o código guardado, ou `null`. Aceita "zap-7k3q m2", "ZAP7K3QM2" e
 * "7K3QM2"; recusa qualquer símbolo fora do alfabeto (0, O, 1, I, L inclusive: ninguém confunde).
 */
export function normalizeShareCode(raw: string): string | null {
  let cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (
    cleaned.length === SHARE_CODE_PREFIX.length + SHARE_CODE_LENGTH &&
    cleaned.startsWith(SHARE_CODE_PREFIX)
  ) {
    cleaned = cleaned.slice(SHARE_CODE_PREFIX.length)
  }
  if (cleaned.length !== SHARE_CODE_LENGTH) return null
  for (const char of cleaned) if (!ALPHABET_SET.has(char)) return null
  return cleaned
}

/** Como o código aparece na tela: `ZAP-7K3QM2`. */
export function formatShareCode(code: string): string {
  return `${SHARE_CODE_PREFIX}-${code}`
}
