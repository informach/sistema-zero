/**
 * A DESCIDA do "Guardado na sua conta": só na nuvem baixa; nuvem mais nova baixa
 * (com CÓPIA do local se ele também mudou desde a última sincronia — feita só
 * DEPOIS de a descida ser baixada e validada); local mais novo ou só local sobe
 * (sem marcar antes do commit); iguais nada; lápides; galeria cheia; peças antes
 * dos mapas; teto de tempo adia.
 */
import { describe, expect, test } from 'bun:test'
import type { CloudCreationSummary } from '../src/lib/creations-cloud'
import {
  createMemorySyncedMarks,
  createStoredSyncedMarks,
  reconcileCreations,
  resetStoredSyncedMarksForTests,
} from '../src/lib/creations-sync'

const remote = (
  over: Partial<CloudCreationSummary> & { itemId: string },
): CloudCreationSummary => ({
  name: over.itemId,
  kind: 'pixel-sprite',
  itemUpdatedAt: 100,
  revision: 1,
  bytes: 10,
  thumb: null,
  syncedAt: 100,
  ...over,
})

function harness(options: { failFetch?: Set<string>; failApply?: Set<string> } = {}) {
  const fetched: string[] = []
  const applied: string[] = []
  const copied: string[] = []
  const committedCopies: string[] = []
  const rolledBackCopies: string[] = []
  const pushed: string[] = []
  const removed: string[] = []
  const deletedLocal: string[] = []
  return {
    fetched,
    applied,
    copied,
    committedCopies,
    rolledBackCopies,
    pushed,
    removed,
    deletedLocal,
    fetch: async (s: CloudCreationSummary) => {
      fetched.push(s.itemId)
      return options.failFetch?.has(s.itemId) ? null : { payload: s.itemId }
    },
    apply: async (s: CloudCreationSummary) => {
      applied.push(s.itemId)
      return !options.failApply?.has(s.itemId)
    },
    keepLocalCopy: async (item: { id: string }) => {
      copied.push(item.id)
      return {
        commit: () => {
          committedCopies.push(item.id)
        },
        rollback: async () => {
          rolledBackCopies.push(item.id)
        },
      }
    },
    push: (item: { id: string }) => {
      pushed.push(item.id)
    },
    remove: (itemId: string) => {
      removed.push(itemId)
    },
    deleteLocal: async (itemId: string) => {
      deletedLocal.push(itemId)
      return true
    },
  }
}

const empty = {
  downloaded: 0,
  uploaded: 0,
  conflicts: 0,
  deferred: 0,
  failed: 0,
  skipped: 0,
  tombstoned: 0,
}

describe('reconcileCreations', () => {
  test('só na nuvem → baixa; só local → sobe SEM marcar; iguais → nada e marca', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    const report = await reconcileCreations({
      local: [
        { id: 'igual', updatedAt: 100 },
        { id: 'so-local', updatedAt: 50 },
      ],
      cloud: [remote({ itemId: 'igual', itemUpdatedAt: 100 }), remote({ itemId: 'so-nuvem' })],
      marks,
      ...h,
    })
    expect(h.applied).toEqual(['so-nuvem'])
    expect(h.pushed).toEqual(['so-local'])
    expect(h.copied).toEqual([])
    expect(report).toEqual({ ...empty, downloaded: 1, uploaded: 1 })
    expect(marks.get('igual')).toBe(100)
    expect(marks.get('so-nuvem')).toBe(100)
    // A marca do que SUBIU só avança quando o commit confirmar (o adaptador faz isso).
    expect(marks.get('so-local')).toBeUndefined()
  })

  test('nuvem mais nova e local INTOCADO desde a última sincronia → só baixa (sem cópia)', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 80)
    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 80 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 120 })],
      marks,
      ...h,
    })
    expect(h.applied).toEqual(['nave'])
    expect(h.copied).toEqual([])
    expect(report.conflicts).toBe(0)
    expect(marks.get('nave')).toBe(120)
  })

  test('nuvem mais nova e local TAMBÉM mudou (dois computadores) → cópia do local, depois baixa', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 80)
    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 90 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 120 })],
      marks,
      ...h,
    })
    expect(h.copied).toEqual(['nave'])
    expect(h.applied).toEqual(['nave'])
    expect(report.conflicts).toBe(1)
  })

  test('ida e volta entre dois aparelhos SEM cópia falsa: a marca avançou com o commit do próprio upload', async () => {
    // A subiu 120 (marca = 120, gravada pelo adaptador no commit); B baixou, editou 150, subiu.
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 120)
    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 120 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 150 })],
      marks,
      ...h,
    })
    expect(h.copied).toEqual([])
    expect(h.applied).toEqual(['nave'])
    expect(report.conflicts).toBe(0)
  })

  test('só o local mudou desde a última sincronização → sobe', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 120)
    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 200 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 120 })],
      marks,
      ...h,
    })
    expect(h.pushed).toEqual(['nave'])
    expect(h.applied).toEqual([])
    expect(report.uploaded).toBe(1)
  })

  test('relógio local adiantado não sobrescreve edição remota: os dois lados mudaram → conflito seguro', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 100)
    const report = await reconcileCreations({
      // O relógio deste aparelho está no futuro, mas isso não torna a edição
      // necessariamente mais recente que a revisão remota feita depois do marco.
      local: [{ id: 'nave', updatedAt: 9_999_999 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 130 })],
      marks,
      ...h,
    })
    expect(h.pushed).toEqual([])
    expect(h.copied).toEqual(['nave'])
    expect(h.applied).toEqual(['nave'])
    expect(report.conflicts).toBe(1)
  })

  test('descida que falha NÃO deixa cópia órfã (a cópia é feita depois de baixar e validar)', async () => {
    const h = harness({ failFetch: new Set(['nave']) })
    const marks = createMemorySyncedMarks()
    marks.set('nave', 80)
    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 90 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 120 })],
      marks,
      ...h,
    })
    expect(h.copied).toEqual([])
    expect(h.applied).toEqual([])
    expect(report.failed).toBe(1)
    expect(report.conflicts).toBe(0)
    // A marca não avança em falha.
    expect(marks.get('nave')).toBe(80)
  })

  test('item apagado enquanto a descida está em voo não é ressuscitado', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 80)
    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 90 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 120 })],
      marks,
      localUpdatedAt: async () => null,
      ...h,
    })

    expect(h.applied).toEqual([])
    expect(h.copied).toEqual([])
    expect(report).toEqual({ ...empty, skipped: 1 })
    expect(marks.get('nave')).toBe(80)
  })

  test('apply recusado desfaz a cópia de conflito e uma nova tentativa não acumula órfãs', async () => {
    const h = harness({ failApply: new Set(['nave']) })
    const marks = createMemorySyncedMarks()
    marks.set('nave', 80)
    const options = {
      local: [{ id: 'nave', updatedAt: 90 }],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 120 })],
      marks,
      ...h,
    }

    const first = await reconcileCreations(options)
    const second = await reconcileCreations(options)

    expect(h.copied).toEqual(['nave', 'nave'])
    expect(h.committedCopies).toEqual([])
    expect(h.rolledBackCopies).toEqual(['nave', 'nave'])
    expect(first).toEqual({ ...empty, failed: 1 })
    expect(second).toEqual({ ...empty, failed: 1 })
    expect(marks.get('nave')).toBe(80)
  })

  test('lápide: apagado aqui e ainda na nuvem com o mesmo updatedAt → não volta; DELETE não enviado é reenviado', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.setTombstone('velho', { at: 500, sent: false })
    marks.setTombstone('enviado', { at: 500, sent: true, revision: 1 })
    const report = await reconcileCreations({
      local: [],
      cloud: [
        remote({ itemId: 'velho', itemUpdatedAt: 100 }),
        remote({ itemId: 'enviado', itemUpdatedAt: 100 }),
      ],
      marks,
      ...h,
    })
    expect(h.applied).toEqual([])
    expect(h.removed).toEqual(['velho'])
    expect(report.tombstoned).toBe(2)
  })

  test('lápide: alguém EDITOU depois de eu apagar (nuvem mais nova que a lápide) → volta e a lápide some', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.setTombstone('nave', { at: 500, sent: true, revision: 1 })
    const report = await reconcileCreations({
      local: [],
      cloud: [remote({ itemId: 'nave', itemUpdatedAt: 900, revision: 2 })],
      marks,
      ...h,
    })
    expect(h.applied).toEqual(['nave'])
    expect(report.downloaded).toBe(1)
    expect(marks.tombstone('nave')).toBeUndefined()
  })

  test('lápide vinda de outro aparelho apaga a cópia local intacta em vez de reenviá-la', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 100, 4)
    const deleted = Object.assign(remote({ itemId: 'nave', revision: 5 }), { deletedAt: 500 })

    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 100 }],
      cloud: [deleted],
      marks,
      ...h,
    })

    expect(h.deletedLocal).toEqual(['nave'])
    expect(h.pushed).toEqual([])
    expect(h.applied).toEqual([])
    expect(report).toEqual({ ...empty, tombstoned: 1 })
    expect(marks.tombstone('nave')).toEqual({ at: 500, sent: true, revision: 5 })
  })

  test('lápide remota preserva como cópia uma edição local concorrente antes de apagar o id original', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.set('nave', 80, 4)
    const deleted = Object.assign(remote({ itemId: 'nave', itemUpdatedAt: 80, revision: 5 }), {
      deletedAt: 500,
    })

    const report = await reconcileCreations({
      local: [{ id: 'nave', updatedAt: 90 }],
      cloud: [deleted],
      marks,
      ...h,
    })

    expect(h.copied).toEqual(['nave'])
    expect(h.committedCopies).toEqual(['nave'])
    expect(h.deletedLocal).toEqual(['nave'])
    expect(h.pushed).toEqual([])
    expect(report).toEqual({ ...empty, conflicts: 1, tombstoned: 1 })
  })

  test('lápide sem revisão nunca compara relógios: oculta o remoto e reenvia o DELETE', async () => {
    const h = harness()
    const marks = createMemorySyncedMarks()
    marks.setTombstone('legado', { at: 100, sent: true, revision: null })

    const report = await reconcileCreations({
      local: [],
      cloud: [remote({ itemId: 'legado', itemUpdatedAt: 99_999, revision: 8 })],
      marks,
      ...h,
    })

    expect(h.applied).toEqual([])
    expect(h.removed).toEqual(['legado'])
    expect(report.tombstoned).toBe(1)
    expect(marks.tombstone('legado')).toBeDefined()
  })

  test('galeria cheia (`canAccept` false) → só-nuvem fica de fora (skipped), sem tentar baixar', async () => {
    const h = harness()
    const report = await reconcileCreations({
      local: [],
      cloud: [remote({ itemId: 'a' }), remote({ itemId: 'b' })],
      marks: createMemorySyncedMarks(),
      canAccept: (s) => s.itemId === 'a',
      ...h,
    })
    expect(h.applied).toEqual(['a'])
    expect(report.skipped).toBe(1)
  })

  test('a ordem das descidas respeita `order` (peças antes do mapa) e o teto de tempo adia o resto', async () => {
    const h = harness()
    let clock = 0
    const report = await reconcileCreations({
      local: [],
      cloud: [
        remote({ itemId: 'mapa', kind: 'tilemap' }),
        remote({ itemId: 'pecas', kind: 'tileset' }),
        remote({ itemId: 'outro', kind: 'pixel-sprite' }),
      ],
      marks: createMemorySyncedMarks(),
      order: (a, b) => Number(b.kind === 'tileset') - Number(a.kind === 'tileset'),
      concurrency: 1,
      budgetMs: 10,
      now: () => clock,
      fetch: async (s) => {
        h.fetched.push(s.itemId)
        clock += 6 // cada descida gasta 6 "ms": a 3ª já estoura o teto de 10
        return { payload: s.itemId }
      },
      apply: h.apply,
      keepLocalCopy: h.keepLocalCopy,
      deleteLocal: h.deleteLocal,
      push: h.push,
    })
    expect(h.fetched[0]).toBe('pecas')
    expect(report.downloaded).toBe(2)
    expect(report.deferred).toBe(1)
  })

  test('o orçamento encerra a reconciliação mesmo quando um fetch nunca resolve', async () => {
    const h = harness()
    const result = await Promise.race([
      reconcileCreations({
        local: [],
        cloud: [remote({ itemId: 'travado' })],
        marks: createMemorySyncedMarks(),
        budgetMs: 10,
        fetch: () => new Promise<never>(() => {}),
        apply: h.apply,
        keepLocalCopy: h.keepLocalCopy,
        deleteLocal: h.deleteLocal,
        push: h.push,
      }),
      Bun.sleep(100).then(() => 'hung' as const),
    ])

    expect(result).not.toBe('hung')
    if (result !== 'hung') expect(result.deferred).toBe(1)
  })

  test('o orçamento também adia lápides; ids adiados nunca ressuscitam como upload', async () => {
    const h = harness()
    let clock = 0
    const local = ['a', 'b', 'c'].map((id) => ({ id, updatedAt: 100 }))
    const report = await reconcileCreations({
      local,
      cloud: local.map(({ id }) => remote({ itemId: id, deletedAt: 200, revision: 2 })),
      marks: createMemorySyncedMarks(),
      budgetMs: 10,
      now: () => clock,
      localUpdatedAt: async () => {
        clock += 6
        return 100
      },
      ...h,
    })

    expect(h.deletedLocal).toEqual(['a', 'b'])
    expect(h.pushed).toEqual([])
    expect(report.tombstoned).toBe(2)
    expect(report.deferred).toBe(1)
  })

  test('descida que grava mal (`apply` false) conta como falha e não marca sincronia', async () => {
    const h = harness({ failApply: new Set(['ruim']) })
    const marks = createMemorySyncedMarks()
    const report = await reconcileCreations({
      local: [],
      cloud: [remote({ itemId: 'ruim' })],
      marks,
      ...h,
    })
    expect(report.failed).toBe(1)
    expect(marks.get('ruim')).toBeUndefined()
  })
})

describe('createStoredSyncedMarks', () => {
  function withFakeStorage<T>(
    run: (backing: Map<string, string>, counters: { setItem: number }) => T,
    opts: { failWrites?: boolean } = {},
  ): T {
    const backing = new Map<string, string>()
    const counters = { setItem: 0 }
    const fakeStorage = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => {
        counters.setItem += 1
        if (opts.failWrites) throw new Error('QuotaExceededError')
        backing.set(k, v)
      },
      removeItem: (k: string) => {
        backing.delete(k)
      },
    }
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true })
    resetStoredSyncedMarksForTests()
    try {
      return run(backing, counters)
    } finally {
      resetStoredSyncedMarksForTests()
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }

  test('marcas e lápides sobrevivem no localStorage (chaves irmãs) e leem de volta numa "página nova"', () => {
    withFakeStorage((backing) => {
      const marks = createStoredSyncedMarks('sz:creations-synced:pinta:p1')
      marks.set('a', 10, 3)
      marks.setTombstone('b', { at: 20, sent: false })
      // Duas instâncias na MESMA página compartilham o estado (sem divergir).
      const twin = createStoredSyncedMarks('sz:creations-synced:pinta:p1')
      expect(twin.get('a')).toBe(10)
      expect(twin.revision('a')).toBe(3)
      expect(twin.tombstone('b')).toEqual({ at: 20, sent: false })
      marks.flush?.()
      expect(backing.has('sz:creations-synced:pinta:p1')).toBe(true)
      expect(backing.has('sz:creations-synced:pinta:p1:revisoes')).toBe(true)
      expect(backing.has('sz:creations-synced:pinta:p1:apagados')).toBe(true)
      // "Página nova": o registro em memória some, o storage é relido.
      resetStoredSyncedMarksForTests()
      const again = createStoredSyncedMarks('sz:creations-synced:pinta:p1')
      expect(again.get('a')).toBe(10)
      expect(again.revision('a')).toBe(3)
      expect(again.tombstone('b')).toEqual({ at: 20, sent: false })
      again.clearTombstone('b')
      again.delete('a')
      again.flush?.()
      resetStoredSyncedMarksForTests()
      const third = createStoredSyncedMarks('sz:creations-synced:pinta:p1')
      expect(third.get('a')).toBeUndefined()
      expect(third.revision('a')).toBeUndefined()
      expect(third.tombstone('b')).toBeUndefined()
    })
  })

  test('escritas em LOTE: 500 marcas viram um punhado de `setItem`, não 500 releituras e regravações', () => {
    withFakeStorage((_backing, counters) => {
      const marks = createStoredSyncedMarks('sz:creations-synced:studio:p2')
      for (let i = 0; i < 500; i += 1) marks.set(`item-${i}`, i, i)
      for (let i = 0; i < 50; i += 1) marks.setTombstone(`old-${i}`, { at: i, sent: true })
      expect(counters.setItem).toBe(0)
      marks.flush?.()
      // Um `setItem` por mapa sujo (marcas, revisões, lápides).
      expect(counters.setItem).toBe(3)
      expect(marks.get('item-499')).toBe(499)
      marks.flush?.()
      expect(counters.setItem).toBe(3)
    })
  })

  test('outra ABA gravou (evento `storage`): a memória é relida por cima, preservando o que esta aba mudou e não gravou', () => {
    withFakeStorage((backing) => {
      const marks = createStoredSyncedMarks('sz:creations-synced:pinta:p3')
      marks.set('a', 1)
      marks.flush?.()
      marks.set('b', 2) // ainda não gravado (sujo)
      // A outra aba gravou o mapa com `a` avançado e `c` novo.
      backing.set('sz:creations-synced:pinta:p3', JSON.stringify({ a: 100, c: 7 }))
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'sz:creations-synced:pinta:p3', newValue: '{}' }),
      )
      expect(marks.get('a')).toBe(100)
      expect(marks.get('c')).toBe(7)
      expect(marks.get('b')).toBe(2)
    })
  })

  test('duas abas do mesmo perfil gravando em rajada: o flush MESCLA com o que está no storage (nada da outra aba some)', () => {
    withFakeStorage((backing) => {
      const marks = createStoredSyncedMarks('sz:creations-synced:pinta:p4')
      marks.set('a', 1, 5)
      marks.flush?.()
      // A outra aba (que leu ANTES do `a`) grava o mapa dela com `b` — sem o evento `storage`
      // ter chegado ainda nesta aba.
      backing.set('sz:creations-synced:pinta:p4', JSON.stringify({ b: 2 }))
      backing.set('sz:creations-synced:pinta:p4:revisoes', JSON.stringify({ b: 9 }))
      // Esta aba grava `c`: o flush relê e MESCLA — `a` (desta aba, já gravado antes) não está
      // mais lá, mas `b` (da outra) fica, e `c` entra.
      marks.set('c', 3, 1)
      marks.flush?.()
      expect(JSON.parse(backing.get('sz:creations-synced:pinta:p4') ?? '{}')).toEqual({
        b: 2,
        c: 3,
      })
      expect(JSON.parse(backing.get('sz:creations-synced:pinta:p4:revisoes') ?? '{}')).toEqual({
        b: 9,
        c: 1,
      })
      expect(marks.get('b')).toBe(2)
      expect(marks.revision('b')).toBe(9)
    })
  })

  test('storage que recusa gravar (quota/privado): continua servindo da memória e tenta de novo depois', () => {
    withFakeStorage(
      (_backing, counters) => {
        const marks = createStoredSyncedMarks('sz:creations-synced:pinta:p4')
        marks.set('a', 1)
        marks.flush?.()
        expect(counters.setItem).toBe(1)
        expect(marks.get('a')).toBe(1)
        // Continua sujo: um novo flush tenta de novo.
        marks.flush?.()
        expect(counters.setItem).toBe(2)
      },
      { failWrites: true },
    )
  })
})
