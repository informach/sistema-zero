import { randomInt, randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'

export const STUDY_CODE_TTL_MS = 10 * 60 * 1000
export const STUDY_DEVICE_TTL_MS = 365 * 24 * 60 * 60 * 1000
export const PARENT_AUTH_MAX_AGE_SECONDS = 15 * 60
/**
 * A sessão ADULTA do Kids (`kids.parent`) tem prazo ABSOLUTO: o refresh não desliza além
 * disso, e a família da sessão nasce com este deadline. O responsável costuma entregar o
 * computador à criança; 30 dias de área dos pais aberta naquele navegador era demais.
 * ⚠️ Só vale para o Kids: login dos outros produtos segue o `REFRESH_TOKEN_TTL_DAYS`.
 */
export const PARENT_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000
/**
 * Retenção das autorizações ENCERRADAS ou VENCIDAS: depois de 90 dias a purga as apaga.
 * O painel mostra "Encerrado"/"Vencido" no período recente; mais que isso só ocupa espaço
 * e guarda o histórico de uso do aparelho sem necessidade.
 */
export const STUDY_GRANT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
/** Falhas por chave (IP no resgate, conta na emissão) dentro da janela de 10 minutos. */
export const STUDY_ATTEMPT_LIMIT = 10
export const STUDY_ATTEMPT_WINDOW_MS = 10 * 60 * 1000
export const STUDY_DURATIONS = [0, 7, 30, 90] as const
export type StudyDuration = (typeof STUDY_DURATIONS)[number]
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeStudyCode(value: string): string | null {
  const normalized = value.replace(/[\s-]/g, '').toUpperCase()
  return /^[A-HJ-NP-Z2-9]{10}$/.test(normalized) ? normalized : null
}

export function createStudyCode(): string {
  return Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
}

export function studyAccessExpiresAt(days: number, now = new Date()): Date {
  if (days !== 0 && days !== 7 && days !== 30 && days !== 90)
    throw new ValidationError('Prazo de acesso inválido')
  if (days !== 0) return new Date(now.getTime() + days * 86_400_000)
  // O dia do produto é São Paulo (UTC-3); não depende do fuso do servidor ou do aparelho.
  const local = new Date(now.getTime() - 3 * 3_600_000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 3))
}

/** Contexto e deadline de uma sessão NOVA de responsável no Kids (senha ou código por e-mail). */
export function newParentKidsSession(now = new Date()) {
  return {
    kids: {
      kind: 'parent' as const,
      sessionId: randomUUID(),
      authenticatedAt: Math.floor(now.getTime() / 1000),
    },
    familyExpiresAt: new Date(now.getTime() + PARENT_SESSION_MAX_AGE_MS),
  }
}

/** O responsável entrou há no máximo 15 minutos? (ações que mudam acesso ou dados sensíveis) */
export function isRecentParentAuth(authenticatedAtSeconds: number, now = new Date()): boolean {
  return Math.floor(now.getTime() / 1000) - authenticatedAtSeconds <= PARENT_AUTH_MAX_AGE_SECONDS
}
