import { describe, expect, test } from 'bun:test'
import { type DraftSeedInput, decideLessonDraftSeed } from '../src/lib/lesson-draft-seed'

/**
 * Qual versão o Estúdio/Pinta da aula abre (10/10/2026): a decisão dela foi "abre a mais nova,
 * a outra fica guardada". Os relógios: local no aparelho (corrigido por `skewMs`), conta e envio
 * no servidor.
 */

const base: DraftSeedInput = {
  local: null,
  mark: null,
  cloud: null,
  submission: null,
  skewMs: 0,
}
const A = 'v1:a'
const B = 'v1:b'

describe('sem nada neste navegador', () => {
  test('sem conta e sem envio segue a ordem de sempre', () => {
    expect(decideLessonDraftSeed(base)).toEqual({ open: 'fallback' })
  })

  test('abre a conta, ou o envio quando é a única cópia', () => {
    expect(
      decideLessonDraftSeed({ ...base, cloud: { at: 10, fingerprint: A, revision: 3 } }),
    ).toEqual({ open: 'cloud', backupLocal: false })
    expect(decideLessonDraftSeed({ ...base, submission: { at: 10, fingerprint: A } })).toEqual({
      open: 'submission',
      backupLocal: false,
    })
  })

  test('envio diferente e MAIS NOVO que a conta vence (outro aparelho sem a nuvem)', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        cloud: { at: 10, fingerprint: A, revision: 3 },
        submission: { at: 20, fingerprint: B },
      }),
    ).toEqual({ open: 'submission', backupLocal: false })
    expect(
      decideLessonDraftSeed({
        ...base,
        cloud: { at: 30, fingerprint: A, revision: 3 },
        submission: { at: 20, fingerprint: B },
      }),
    ).toEqual({ open: 'cloud', backupLocal: false })
  })
})

describe('com rascunho neste navegador', () => {
  test('a conta é a mesma que este aparelho conhece: abre o local e sobe se mudou', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 50, fingerprint: B },
        mark: { revision: 3, updatedAt: 40 },
        cloud: { at: 41, fingerprint: A, revision: 3 },
      }),
    ).toEqual({ open: 'local', upload: true, backupCloud: false, adoptRevision: null })
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 40, fingerprint: A },
        mark: { revision: 3, updatedAt: 40 },
        cloud: { at: 41, fingerprint: A, revision: 3 },
      }),
    ).toEqual({ open: 'local', upload: false, backupCloud: false, adoptRevision: null })
  })

  test('a conta mudou em outro computador e este não mexeu: abre a da conta, sem reserva', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 40, fingerprint: A },
        mark: { revision: 3, updatedAt: 40 },
        cloud: { at: 90, fingerprint: B, revision: 5 },
      }),
    ).toEqual({ open: 'cloud', backupLocal: false })
  })

  test('os dois mexeram: a mais nova abre, a outra fica guardada', () => {
    const dois = {
      ...base,
      local: { at: 60, fingerprint: B },
      mark: { revision: 3, updatedAt: 40 },
    }
    expect(
      decideLessonDraftSeed({ ...dois, cloud: { at: 90, fingerprint: 'v1:c', revision: 5 } }),
    ).toEqual({ open: 'cloud', backupLocal: true })
    expect(
      decideLessonDraftSeed({ ...dois, cloud: { at: 50, fingerprint: 'v1:c', revision: 5 } }),
    ).toEqual({ open: 'local', upload: true, backupCloud: true, adoptRevision: 5 })
  })

  test('o relógio deste aparelho é corrigido pelo do servidor', () => {
    // O aparelho está 1 minuto ATRASADO: o local (55 aqui) é 60 055 no servidor, mais novo.
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 55, fingerprint: B },
        mark: { revision: 3, updatedAt: 40 },
        cloud: { at: 90, fingerprint: 'v1:c', revision: 5 },
        skewMs: 60_000,
      }),
    ).toEqual({ open: 'local', upload: true, backupCloud: true, adoptRevision: 5 })
  })

  test('o mesmo conteúdo dos dois lados não é conflito: só passa a conhecer a revisão', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 60, fingerprint: A },
        mark: { revision: 3, updatedAt: 40 },
        cloud: { at: 90, fingerprint: A, revision: 5 },
      }),
    ).toEqual({ open: 'local', upload: false, backupCloud: false, adoptRevision: 5 })
  })

  test('rascunho de antes da nuvem (sem marca) e conta diferente: compara pelo relógio', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 100, fingerprint: A },
        cloud: { at: 50, fingerprint: B, revision: 2 },
      }),
    ).toEqual({ open: 'local', upload: true, backupCloud: true, adoptRevision: 2 })
  })

  test('um envio de outro computador, mais novo e diferente, abre e guarda o local', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 40, fingerprint: A },
        mark: null,
        submission: { at: 90, fingerprint: B },
      }),
    ).toEqual({ open: 'submission', backupLocal: true })
  })

  test('envio antigo (sem impressão) nunca passa por cima do rascunho local', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 40, fingerprint: A },
        submission: { at: 90, fingerprint: null },
      }),
    ).toEqual({ open: 'local', upload: true, backupCloud: false, adoptRevision: null })
  })

  test('o envio igual ao local não compete', () => {
    expect(
      decideLessonDraftSeed({
        ...base,
        local: { at: 40, fingerprint: A },
        mark: { revision: 2, updatedAt: 40 },
        cloud: { at: 41, fingerprint: A, revision: 2 },
        submission: { at: 90, fingerprint: A },
      }),
    ).toEqual({ open: 'local', upload: false, backupCloud: false, adoptRevision: null })
  })
})
