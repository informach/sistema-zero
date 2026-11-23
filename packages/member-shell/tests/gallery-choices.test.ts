import { describe, expect, test } from 'bun:test'
import type { PintaCausalGalleryPage } from '@sistemazero/core/creations/pinta-causal'
import {
  type GalleryLoad,
  gallerySelectionOf,
  loadGalleryChoices,
  mergeGalleryChoices,
} from '../src/lib/gallery-choices'
import { COMMON_LESSON_COPY } from '../src/lib/lesson-copy'

const viewerId = '11111111-1111-4111-8111-111111111111'
const sha = (n: number) => n.toString(16).padStart(64, '0')
const at = (minute: number) => new Date(Date.UTC(2026, 10, 23, 12, minute)).toISOString()

function legacyItem(itemId: string, minute: number, kind = 'pixel-sprite') {
  return {
    tool: 'pinta',
    itemId,
    name: itemId,
    kind,
    itemUpdatedAt: at(minute),
    revision: 3,
    bytes: 10,
    thumb: `data:image/png;base64,${itemId}`,
    syncedAt: at(minute),
  }
}

function causalEntry(
  itemId: string,
  minute: number,
  options: { kind?: string; sha256?: string | null } = {},
): PintaCausalGalleryPage['gallery']['entries'][number] {
  const sha256 = options.sha256 === undefined ? sha(minute) : options.sha256
  return {
    itemId,
    name: itemId,
    kind: options.kind ?? 'pixel-sprite',
    revision: 2,
    formatVersion: 6,
    layoutRevision: null,
    sha256,
    bytes: 10,
    itemUpdatedAt: at(minute),
    coverage: sha256 ? 'certified' : 'unknown',
    thumb: sha256 ? `data:image/png;base64,${itemId}` : null,
  }
}

function page(
  entries: PintaCausalGalleryPage['gallery']['entries'],
  epoch = '7',
  nextCursor: string | null = null,
): PintaCausalGalleryPage {
  return { gallery: { epoch, requiredFormat: 1, entries, nextCursor } }
}

/** O BFF de mentira: responde por caminho, ou lança o erro do `apiGet` daquele caminho. */
function server(routes: Record<string, unknown>) {
  const calls: { path: string; headers: Record<string, string> }[] = []
  const get = async <T>(path: string, headers: Record<string, string>): Promise<T> => {
    calls.push({ path, headers })
    const answer = routes[path]
    if (answer instanceof Failure) throw answer.error
    if (answer === undefined) throw new Error(`caminho inesperado: ${path}`)
    return answer as T
  }
  return { get, calls }
}
class Failure {
  constructor(readonly error: { status: number; code: string; message: string }) {}
}
const protocolRequired = new Failure({
  status: 409,
  code: 'PINTA_CAUSAL_CONFLICT',
  message: 'protocol-required',
})

describe('seletor da galeria da aula', () => {
  test('perfil antigo: a mesma listagem de antes, sem hash e sem tocar a leitura causal', async () => {
    const legacy = '/api/members/creations/pinta?limit=100'
    const { get, calls } = server({
      [legacy]: {
        items: [
          legacyItem('novo', 30),
          { tool: 'pinta', itemId: 'apagado', deletedAt: at(20), revision: 4, syncedAt: at(20) },
          legacyItem('mapa', 10, 'tilemap'),
          legacyItem('velho', 5),
        ],
        nextCursor: 'opaco',
      },
    })
    const loaded = await loadGalleryChoices({ tool: 'pinta', viewerId, get })
    expect(calls).toEqual([{ path: legacy, headers: { 'x-sz-viewer': viewerId } }])
    expect(loaded).toEqual({
      mode: 'legacy',
      items: [
        {
          itemId: 'novo',
          revision: 3,
          name: 'novo',
          thumb: 'data:image/png;base64,novo',
          itemUpdatedAt: at(30),
        },
        {
          itemId: 'velho',
          revision: 3,
          name: 'velho',
          thumb: 'data:image/png;base64,velho',
          itemUpdatedAt: at(5),
        },
      ],
      next: { mode: 'legacy', cursor: 'opaco' },
      restarted: false,
    })
    expect(loaded.items.map(gallerySelectionOf)).toEqual([
      { itemId: 'novo', revision: 3 },
      { itemId: 'velho', revision: 3 },
    ])
  })

  test('perfil causal: lista a cabeça confirmada com o hash; o sem certificado aparece bloqueado', async () => {
    const { get, calls } = server({
      '/api/members/creations/pinta?limit=100': protocolRequired,
      '/api/pinta/causal/gallery': page([
        causalEntry('a-antigo', 1),
        causalEntry('b-mapa', 50, { kind: 'tilemap' }),
        causalEntry('c-novo', 40),
        causalEntry('d-sem-certificado', 20, { sha256: null }),
      ]),
    })
    const loaded = await loadGalleryChoices({ tool: 'pinta', viewerId, get })
    expect(calls.map((call) => call.path)).toEqual([
      '/api/members/creations/pinta?limit=100',
      '/api/pinta/causal/gallery',
    ])
    expect(calls[1]?.headers).toEqual({ 'x-sz-viewer': viewerId })
    expect(loaded.mode).toBe('causal')
    const shown = mergeGalleryChoices([], loaded, false)
    // A mais nova primeiro, como na listagem antiga; o mapa (sem a folha) não é desenho da galeria.
    expect(shown.map((item) => [item.itemId, item.causalSha256, item.needsPinta])).toEqual([
      ['c-novo', sha(40), undefined],
      ['d-sem-certificado', undefined, true],
      ['a-antigo', sha(1), undefined],
    ])
    expect(gallerySelectionOf(shown[0]!)).toEqual({
      itemId: 'c-novo',
      revision: 2,
      causalSha256: sha(40),
    })
    // A frase que o cartão do desenho sem certificado mostra.
    expect(COMMON_LESSON_COPY.galeria.abrirNoPinta).toBe(
      'Abra este desenho no Pinta uma vez para poder enviar.',
    )
  })

  test('perfil causal: a próxima página segue a época; se ela mudou, a lista recomeça', async () => {
    const first = page([causalEntry('a', 1)], '7', 'a')
    const { get, calls } = server({
      '/api/pinta/causal/gallery': first,
      '/api/pinta/causal/gallery?epoch=7&cursor=a': page([causalEntry('b', 2)], '7'),
    })
    const opened = await loadGalleryChoices({ tool: 'pinta', viewerId, get, mode: 'causal' })
    expect(opened.next).toEqual({ mode: 'causal', epoch: '7', cursor: 'a' })
    const more = await loadGalleryChoices({
      tool: 'pinta',
      viewerId,
      get,
      cursor: opened.next!,
    })
    expect(more.restarted).toBe(false)
    const both = mergeGalleryChoices(mergeGalleryChoices([], opened, false), more, true)
    expect(both.map((item) => item.itemId)).toEqual(['b', 'a'])
    expect(calls.map((call) => call.path)).toEqual([
      '/api/pinta/causal/gallery',
      '/api/pinta/causal/gallery?epoch=7&cursor=a',
    ])

    const stale = server({
      '/api/pinta/causal/gallery?epoch=7&cursor=a': new Failure({
        status: 409,
        code: 'ERROR',
        message: 'Algo deu errado.',
      }),
      '/api/pinta/causal/gallery': page([causalEntry('c', 3)], '8'),
    })
    const restarted = await loadGalleryChoices({
      tool: 'pinta',
      viewerId,
      get: stale.get,
      cursor: opened.next!,
    })
    expect(restarted.restarted).toBe(true)
    expect(mergeGalleryChoices(both, restarted, true).map((item) => item.itemId)).toEqual(['c'])
  })

  test('perfil causal sem a leitura causal para ele: a recusa clara, sem nada para enviar', async () => {
    const { get } = server({
      '/api/members/creations/pinta?limit=100': protocolRequired,
      '/api/pinta/causal/gallery': new Failure({
        status: 404,
        code: 'ERROR',
        message: 'Algo deu errado.',
      }),
    })
    let failure: unknown
    try {
      await loadGalleryChoices({ tool: 'pinta', viewerId, get })
    } catch (error) {
      failure = error
    }
    expect(COMMON_LESSON_COPY.erroDoServidor(failure, 'Falhou')).toBe(
      'Os desenhos deste perfil não podem ser enviados pela galeria. Fale com a equipe.',
    )
  })

  test('o Estúdio nunca troca de listagem, mesmo com uma recusa causal', async () => {
    const { get, calls } = server({
      '/api/members/creations/studio?limit=100': protocolRequired,
    })
    let failure: unknown
    try {
      await loadGalleryChoices({
        tool: 'studio',
        viewerId,
        get,
        mode: 'causal' as GalleryLoad['mode'],
      })
    } catch (error) {
      failure = error
    }
    expect(failure).toMatchObject({ code: 'PINTA_CAUSAL_CONFLICT' })
    expect(calls.map((call) => call.path)).toEqual(['/api/members/creations/studio?limit=100'])
  })
})
