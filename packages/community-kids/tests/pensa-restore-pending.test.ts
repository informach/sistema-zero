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

/** A forma da jornada v2 que o members devolve (só o que a régua lê). */
function view(input: {
  journeyCheckpoint: { id: string; saveRevision: string } | null
  records?: Array<{ id: string; saveRevision: string }>
  contractVersion?: number
}) {
  return {
    project: { id: PLANO, name: 'Jogo', status: 'active' },
    journey: { contractVersion: input.contractVersion ?? 2, checkpoint: input.journeyCheckpoint },
    checkpoints: input.records ?? [],
  }
}

describe('a jornada restaurada se reconhece pela forma', () => {
  test('restaurar: a jornada aponta o ponto escolhido com a revisão NOVA do arquivo', () => {
    const restaurada = view({
      journeyCheckpoint: { id: 'cp1', saveRevision: '9' },
      records: [{ id: 'cp1', saveRevision: '4' }],
    })
    expect(restoredSaveRevisionOf(restaurada)).toEqual({ projectId: PLANO, revision: 9 })
  })

  test('proteger uma versão NÃO é restaurar: a revisão é a mesma na jornada e no registro', () => {
    const protegida = view({
      journeyCheckpoint: { id: 'cp2', saveRevision: '7' },
      records: [{ id: 'cp2', saveRevision: '7' }],
    })
    expect(restoredSaveRevisionOf(protegida)).toBeNull()
  })

  test('sem ponto, sem o registro do ponto, plano v1 ou lixo: nada', () => {
    expect(restoredSaveRevisionOf(view({ journeyCheckpoint: null }))).toBeNull()
    expect(
      restoredSaveRevisionOf(view({ journeyCheckpoint: { id: 'cp1', saveRevision: '9' } })),
    ).toBeNull()
    expect(
      restoredSaveRevisionOf(
        view({
          contractVersion: 1,
          journeyCheckpoint: { id: 'cp1', saveRevision: '9' },
          records: [{ id: 'cp1', saveRevision: '4' }],
        }),
      ),
    ).toBeNull()
    expect(restoredSaveRevisionOf(null)).toBeNull()
    expect(restoredSaveRevisionOf({ tasks: [] })).toBeNull()
  })

  test('o transporte guarda a marca do ARQUIVO do plano, por perfil', () => {
    notePensaRestoreFromView(
      'perfil-a',
      view({
        journeyCheckpoint: { id: 'cp1', saveRevision: '9' },
        records: [{ id: 'cp1', saveRevision: '4' }],
      }),
    )
    expect(pensaRestoreRevision('perfil-a', ARQUIVO)).toBe(9)
    // Irmão no mesmo navegador não herda a marca.
    expect(pensaRestoreRevision('perfil-b', ARQUIVO)).toBeNull()
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
