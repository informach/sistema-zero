import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  clearPensaRestore,
  isPensaRestorePending,
  notePensaRestore,
  notePensaRestoreFromView,
  PensaOpenRefused,
  pensaRestoreRevision,
  reconcilePensaOpen,
  restoredSaveRevisionOf,
} from '../src/lib/pensa-restore-pending'

const PLANO = '0f9e6a3c-1b2d-4e5f-8a9b-0c1d2e3f4a5b'
const ARQUIVO = `pensa-${PLANO.replace(/-/g, '')}`

afterEach(() => {
  localStorage.clear()
})

describe('explicit committed restore', () => {
  test('only a server restore revision creates a pending download', () => {
    expect(restoredSaveRevisionOf({ project: { id: PLANO }, restoredSaveRevision: '9' })).toEqual({
      projectId: PLANO,
      revision: 9,
    })
    expect(
      restoredSaveRevisionOf({ project: { id: PLANO }, restoredSaveRevision: null }),
    ).toBeNull()
    expect(
      restoredSaveRevisionOf({ project: { id: PLANO }, restoredSaveRevision: 'invalid' }),
    ).toBeNull()
    expect(restoredSaveRevisionOf(null)).toBeNull()
  })
  test('the pending revision belongs to the viewing profile', () => {
    notePensaRestoreFromView('profile-a', { project: { id: PLANO }, restoredSaveRevision: '9' })
    expect(pensaRestoreRevision('profile-a', ARQUIVO)).toBe(9)
    expect(pensaRestoreRevision('profile-b', ARQUIVO)).toBeNull()
  })
})

describe('a marca só sobe, e some quando a restaurada chega', () => {
  test('uma leitura atrasada nunca rebaixa a marca', () => {
    notePensaRestore('perfil-a', ARQUIVO, 9)
    notePensaRestore('perfil-a', ARQUIVO, 5)
    expect(pensaRestoreRevision('perfil-a', ARQUIVO)).toBe(9)
    clearPensaRestore('perfil-a', ARQUIVO)
    expect(pensaRestoreRevision('perfil-a', ARQUIVO)).toBeNull()
  })

  test('arquivo que não é do Pensa nunca ganha marca', () => {
    notePensaRestore('perfil-a', 'meu-jogo', 3)
    expect(pensaRestoreRevision('perfil-a', 'meu-jogo')).toBeNull()
  })

  test('pendente = marca acima da revisão sincronizada aqui', () => {
    expect(isPensaRestorePending(null, 2)).toBe(false)
    expect(isPensaRestorePending(9, undefined)).toBe(true)
    expect(isPensaRestorePending(9, 8)).toBe(true)
    expect(isPensaRestorePending(9, 9)).toBe(false)
    expect(isPensaRestorePending(9, 12)).toBe(false)
  })
})

describe('abrir um jogo do Pensa (A1)', () => {
  test('sem restauração pendente: nenhuma rede, abre na hora (plano v1 incluído)', async () => {
    const pull = mock(async () => {})
    const peek = mock(async () => ({ summary: { revision: 3 } }))
    await reconcilePensaOpen({
      restoreRevision: null,
      syncedRevision: () => 2,
      clear: () => {},
      pull,
      peek,
    })
    expect(pull).not.toHaveBeenCalled()
    expect(peek).not.toHaveBeenCalled()
  })

  test('a restaurada já chegou: apaga a marca, sem rede', async () => {
    const clear = mock(() => {})
    const pull = mock(async () => {})
    await reconcilePensaOpen({
      restoreRevision: 9,
      syncedRevision: () => 9,
      clear,
      pull,
      peek: async () => null,
    })
    expect(clear).toHaveBeenCalledTimes(1)
    expect(pull).not.toHaveBeenCalled()
  })

  test('pendente: a descida traz a restaurada ANTES de abrir', async () => {
    let synced = 4
    const clear = mock(() => {})
    const peek = mock(async () => ({ summary: { revision: 9 } }))
    await reconcilePensaOpen({
      restoreRevision: 9,
      syncedRevision: () => synced,
      clear,
      pull: async () => {
        synced = 9
      },
      peek,
    })
    expect(clear).toHaveBeenCalledTimes(1)
    expect(peek).not.toHaveBeenCalled()
  })

  test('pendente e SEM rede: abre a cópia local (não recusa)', async () => {
    await expect(
      reconcilePensaOpen({
        restoreRevision: 9,
        syncedRevision: () => 4,
        clear: () => {},
        pull: async () => {},
        peek: async () => {
          throw new TypeError('Failed to fetch')
        },
      }),
    ).resolves.toBeUndefined()
  })

  test('pendente, a nuvem tem a restaurada e ela não desceu: recusa COM a frase', async () => {
    const opening = reconcilePensaOpen({
      restoreRevision: 9,
      syncedRevision: () => 4,
      clear: () => {},
      pull: async () => {},
      peek: async () => ({ summary: { revision: 9 } }),
    })
    await expect(opening).rejects.toBeInstanceOf(PensaOpenRefused)
    await expect(opening).rejects.toThrow('Feche o jogo em outras abas')
  })

  test('pendente sem nuvem neste aparelho: abre a cópia local', async () => {
    await expect(
      reconcilePensaOpen({
        restoreRevision: 9,
        syncedRevision: () => 4,
        clear: () => {},
        pull: null,
        peek: null,
      }),
    ).resolves.toBeUndefined()
  })
})
