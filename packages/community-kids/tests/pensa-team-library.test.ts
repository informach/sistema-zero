import { describe, expect, mock, test } from 'bun:test'
import type { PensaJourneyView, PensaTeamArtItem } from '@sistemazero/core/pensa'
import { createPensaJourney } from '@sistemazero/core/pensa'
import {
  createModelAsset,
  assetToJson as moldaAssetToJson,
  readMoldaDocument,
} from '@sistemazero/molda/assets'
import { assetToJson, createAsset } from '@sistemazero/pinta/assets'
import { NEEDS_TILESET_MESSAGE } from '@sistemazero/pinta/studio-library'
import { gzipText } from '../src/lib/creations-cloud'
import { pensaPlanIdFromStudioProjectId, pensaStudioProjectId } from '../src/lib/pensa-studio-link'
import {
  convertTeamMoldaArt,
  convertTeamPintaArt,
  type MoldaTeamModules,
  TEAM_ART_MESSAGES,
  teamImportNamespace,
  teamReviewToken,
} from '../src/lib/pensa-team-art'
import {
  createPensaTeamLibrary,
  pensaTeamArtAvailable,
  teamArtKind,
  teamArtSummaries,
} from '../src/lib/pensa-team-library'

const PLAN = '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b'
const BIA = 'b1a00000-0000-4000-8000-000000000001'
const LEO = 'l3000000-0000-4000-8000-000000000002'

function artItem(overrides: Partial<PensaTeamArtItem> = {}): PensaTeamArtItem {
  return {
    taskId: 'task-heroi',
    title: 'Desenhar o herói',
    tool: 'pinta',
    assetId: 'bia-heroi',
    assetName: 'heroi',
    assetKind: 'pixel-sprite',
    byProfileId: BIA,
    completedAt: '2026-10-14T10:00:00.000Z',
    updatedAt: '2026-10-14T10:00:00.000Z',
    revision: 3,
    ...overrides,
  }
}

function view(team: PensaJourneyView['team']): PensaJourneyView {
  return {
    project: { id: PLAN, name: 'Jogo', status: 'active' },
    journey: createPensaJourney(PLAN, 'c1', ''),
    cycles: [],
    operation: null,
    ...(team ? { team } : {}),
  }
}

/** Um `fetch` falso que responde por caminho (o que não estiver no mapa vira 404). */
function routes(table: Record<string, () => Response | Promise<Response>>) {
  const calls: string[] = []
  const fetch = mock(async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    const handler = table[url]
    return handler ? handler() : new Response('{}', { status: 404 })
  })
  return { fetch, calls }
}

describe('o id do plano a partir do jogo do Estúdio', () => {
  test('re-insere os hífens 8-4-4-4-12, e é o inverso do pensaStudioProjectId', () => {
    expect(pensaPlanIdFromStudioProjectId(pensaStudioProjectId(PLAN))).toBe(PLAN)
    expect(pensaPlanIdFromStudioProjectId('pensa-0F1E2D3C4B5A69788A9B0C1D2E3F4A5B')).toBe(PLAN)
  })

  test('jogo livre ou id fora do formato: nenhum plano', () => {
    expect(pensaPlanIdFromStudioProjectId('meu-jogo')).toBeNull()
    expect(pensaPlanIdFromStudioProjectId('pensa-123')).toBeNull()
    expect(pensaPlanIdFromStudioProjectId(`pensa-${'g'.repeat(32)}`)).toBeNull()
    expect(pensaPlanIdFromStudioProjectId(`${pensaStudioProjectId(PLAN)}-copia`)).toBeNull()
  })
})

describe('quem vê o botão', () => {
  const base = `/api/pensa/v2/projects/${PLAN}`
  const teamOf = (viewer: string, code: string, memberCount = 1) => ({
    viewerProfileId: viewer,
    ownerProfileId: BIA,
    memberCount,
    shareEnabled: true,
    roles: { code, art: [LEO] },
  })

  test('quem PROGRAMA um plano em equipe com arte entregue', async () => {
    const { fetch } = routes({
      [base]: () => Response.json(view(teamOf(BIA, BIA))),
      [`${base}/team-art`]: () => Response.json({ items: [artItem()] }),
    })
    expect(await pensaTeamArtAvailable(PLAN, fetch)).toBe(true)
  })

  test('plano solo, quem só desenha, plano sem arte ou servidor fora: nenhum botão', async () => {
    const semArte = routes({
      [base]: () => Response.json(view(teamOf(BIA, BIA))),
      [`${base}/team-art`]: () => Response.json({ items: [] }),
    })
    expect(await pensaTeamArtAvailable(PLAN, semArte.fetch)).toBe(false)

    const solo = routes({ [base]: () => Response.json(view(teamOf(BIA, BIA, 0))) })
    expect(await pensaTeamArtAvailable(PLAN, solo.fetch)).toBe(false)
    // Solo nem pergunta pelas artes.
    expect(solo.calls).toEqual([base])

    const artista = routes({ [base]: () => Response.json(view(teamOf(LEO, BIA))) })
    expect(await pensaTeamArtAvailable(PLAN, artista.fetch)).toBe(false)

    const antigo = routes({ [base]: () => Response.json(view(undefined)) })
    expect(await pensaTeamArtAvailable(PLAN, antigo.fetch)).toBe(false)

    const fora = routes({})
    expect(await pensaTeamArtAvailable(PLAN, fora.fetch)).toBe(false)
  })
})

describe('a lista da janela', () => {
  test('nome de quem fez, "Colega" sem nome, e o tipo pela ferramenta', () => {
    const summaries = teamArtSummaries(
      [
        artItem(),
        artItem({
          taskId: 'task-nave',
          tool: 'molda',
          assetId: 'leo-nave',
          assetName: null,
          assetKind: 'model',
          title: 'Modelar a nave',
          byProfileId: LEO,
        }),
        artItem({ taskId: 'task-x', byProfileId: 'sumiu', tool: 'molda', assetKind: 'sky' }),
      ],
      {
        people: [
          { profileId: BIA, firstName: 'Bia', photoUrl: null, owner: true, joinedAt: null },
          { profileId: LEO, firstName: null, photoUrl: null, owner: false, joinedAt: 'x' },
        ],
      },
    )
    expect(summaries[0]).toEqual({
      id: 'task-heroi',
      assetId: 'equipe-task-heroi',
      name: 'heroi',
      kind: 'drawing',
      byName: 'Bia',
      missionTitle: 'Desenhar o herói',
      thumbDataUrl: null,
    })
    // Sem o nome da arte, o título da missão; sem o 1º nome, "Colega".
    expect(summaries[1]).toMatchObject({ name: 'Modelar a nave', kind: 'model', byName: 'Colega' })
    expect(summaries[2]).toMatchObject({ kind: 'sky', byName: 'Colega' })
  })

  test('teamArtKind: o Molda que não disse o tipo vira modelo', () => {
    expect(teamArtKind({ tool: 'pinta', assetKind: 'tileset' })).toBe('drawing')
    expect(teamArtKind({ tool: 'molda', assetKind: 'texture' })).toBe('texture')
    expect(teamArtKind({ tool: 'molda', assetKind: null })).toBe('model')
  })
})

describe('trazer: baixar, descomprimir, converter e guardar', () => {
  const base = `/api/pensa/v2/projects/${PLAN}`
  const BLOB = 'https://r2.example/blob?assinatura=1'

  function setup(options: {
    items?: PensaTeamArtItem[]
    blob?: () => Promise<Response> | Response
    ticket?: () => Response
    save?: { ok: boolean; name?: string; updatedAt?: number; error?: string }
  }) {
    const items = options.items ?? [artItem()]
    const { fetch, calls } = routes({
      [`${base}/team-art`]: () => Response.json({ items }),
      [`${base}/team`]: () =>
        Response.json({
          people: [{ profileId: BIA, firstName: 'Bia', photoUrl: null, owner: true }],
        }),
      [`${base}/team-art/task-heroi/download`]:
        options.ticket ??
        (() => Response.json({ downloadUrl: BLOB, revision: 3, bytes: 10, parts: [] })),
      [`${base}/team-art/task-nave/download`]: () =>
        Response.json({ downloadUrl: BLOB, revision: 5, bytes: 10, parts: [] }),
      [BLOB]: options.blob ?? (() => new Response('{}')),
    })
    const saved: Array<{ asset: Record<string, unknown>; namespace: string }> = []
    const convertPinta = mock(async (json: string) =>
      json === 'pinta-doc'
        ? {
            ok: true as const,
            asset: {
              id: 'bia-heroi',
              name: 'heroi',
              dataUrl: 'data:image/png;base64,AAAA',
              width: 8,
              height: 8,
            },
          }
        : { ok: false as const, error: 'frase do conversor' },
    )
    const convertMolda = mock(async (_json: string, _context: unknown) => ({
      ok: true as const,
      asset: {
        id: 'leo-nave',
        name: 'nave',
        kind: 'model3d' as const,
        dataUrl: 'data:model/gltf-binary;base64,Z2xURg==',
        originalFileName: 'nave.glb',
      },
    }))
    const library = createPensaTeamLibrary({
      planId: PLAN,
      viewerId: 'perfil-1',
      deps: {
        fetch,
        convertPinta,
        convertMolda: convertMolda as never,
        supported: () => true,
        gunzip: async (bytes) => new TextDecoder().decode(bytes),
        savePersonalAsset: async (asset, opts) => {
          saved.push({ asset, namespace: opts.namespace })
          return options.save ?? { ok: true, name: `${asset.name}-2`, updatedAt: 99 }
        },
      },
    })
    return { library, calls, saved, convertPinta, convertMolda }
  }

  test('desenho do Pinta: grava na biblioteca COM a origem e devolve o nome salvo', async () => {
    const { library, saved, calls } = setup({ blob: () => new Response('pinta-doc') })
    const list = await library.list()
    expect(list.map((item) => item.byName)).toEqual(['Bia'])
    const result = await library.import('task-heroi')
    expect(result).toEqual({
      tool: 'pinta',
      result: {
        ok: true,
        asset: {
          id: 'equipe-task-heroi',
          name: 'heroi-2',
          dataUrl: 'data:image/png;base64,AAAA',
          width: 8,
          height: 8,
          libRevision: 99,
        },
      },
    })
    expect(saved[0]?.asset.origin).toBe('pinta')
    expect(saved[0]?.asset.id).toBe('equipe-task-heroi')
    expect(saved[0]?.namespace).toBe('perfil-1')
    expect(calls).toContain(BLOB)
  })

  test('artes da equipe não sobrescrevem a arte pessoal nem a de outra missão com o mesmo id', async () => {
    const items = [artItem(), artItem({ taskId: 'task-nave', byProfileId: LEO })]
    const { library, saved } = setup({ items, blob: () => new Response('pinta-doc') })
    const listed = await library.list()
    await library.import('task-heroi')
    await library.import('task-nave')
    await library.import('task-heroi')
    expect(saved[0]?.asset.id).not.toBe('bia-heroi')
    expect(saved[1]?.asset.id).not.toBe(saved[0]?.asset.id)
    expect(saved[2]?.asset.id).toBe(saved[0]?.asset.id)
    expect(listed.map((item) => item.assetId)).toEqual(
      saved.slice(0, 2).map((item) => item.asset.id as string | undefined),
    )
  })

  test('criação do Molda: origem Molda, e a revisão e o consentimento chegam à conversão', async () => {
    const nave = artItem({
      taskId: 'task-nave',
      tool: 'molda',
      assetId: 'leo-nave',
      assetKind: 'model',
    })
    const { library, saved, convertMolda } = setup({ items: [nave] })
    await library.list()
    const result = await library.import('task-nave', { acceptedReview: 'equipe:task-nave:5' })
    expect(result.tool).toBe('molda')
    expect(result.result.ok).toBe(true)
    expect(saved[0]?.asset).toMatchObject({
      origin: 'molda',
      kind: 'model3d',
      originalFileName: 'nave.glb',
    })
    expect(convertMolda.mock.calls[0]?.[1]).toEqual({
      viewerId: 'perfil-1',
      taskId: 'task-nave',
      revision: 5,
      acceptedReview: 'equipe:task-nave:5',
    })
  })

  test('a arte que sumiu (404) volta como not-found, com frase de criança', async () => {
    const { library } = setup({ ticket: () => new Response('{}', { status: 404 }) })
    await library.list()
    expect(await library.import('task-heroi')).toEqual({
      tool: 'pinta',
      result: { ok: false, error: TEAM_ART_MESSAGES.gone, code: 'not-found' },
    })
  })

  test('rede, arquivo ilegível, conversor e biblioteca: cada um com a sua frase', async () => {
    const semRede = setup({ blob: () => Promise.reject(new TypeError('Failed to fetch')) })
    await semRede.library.list()
    expect((await semRede.library.import('task-heroi')).result).toEqual({
      ok: false,
      error: TEAM_ART_MESSAGES.network,
    })

    const conversor = setup({ blob: () => new Response('outro') })
    await conversor.library.list()
    expect((await conversor.library.import('task-heroi')).result).toEqual({
      ok: false,
      error: 'frase do conversor',
    })

    const cheia = setup({
      blob: () => new Response('pinta-doc'),
      save: { ok: false, error: 'A biblioteca está cheia.' },
    })
    await cheia.library.list()
    expect((await cheia.library.import('task-heroi')).result).toEqual({
      ok: false,
      error: 'A biblioteca está cheia.',
    })
  })

  test('sem o list() antes, o import descobre a missão sozinho; missão que não existe = not-found', async () => {
    const { library } = setup({ blob: () => new Response('pinta-doc') })
    expect((await library.import('task-heroi')).result.ok).toBe(true)
    expect((await library.import('task-que-nao-existe')).result).toEqual({
      ok: false,
      error: TEAM_ART_MESSAGES.gone,
      code: 'not-found',
    })
  })

  test('o arquivo real é gzip: a descompressão padrão abre o documento', async () => {
    const gz = await gzipText('pinta-doc')
    const { fetch } = routes({
      [`${base}/team-art`]: () => Response.json({ items: [artItem()] }),
      [`${base}/team-art/task-heroi/download`]: () =>
        Response.json({ downloadUrl: BLOB, revision: 3 }),
      [BLOB]: () => new Response(new Blob([gz as BlobPart])),
    })
    const seen: string[] = []
    const library = createPensaTeamLibrary({
      planId: PLAN,
      viewerId: 'perfil-1',
      deps: {
        fetch,
        convertPinta: async (json) => {
          seen.push(json)
          return { ok: false, error: 'parei aqui' }
        },
      },
    })
    await library.import('task-heroi')
    expect(seen).toEqual(['pinta-doc'])
  })
})

describe('a conversão do Pinta (de verdade, sem a galeria)', () => {
  test('cenário vetorial vira o payload do Estúdio, com o id da colega', async () => {
    const asset = createAsset({
      kind: 'vector-background',
      name: 'ceu-da-bia',
      width: 20,
      height: 10,
    })
    const result = await convertTeamPintaArt(assetToJson(asset))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.asset.id).toBe(asset.id)
      expect(result.asset.name).toBe('ceu-da-bia')
      expect(result.asset.dataUrl).toStartWith('data:image/svg+xml')
    }
  })

  test('mapa de peças sozinho: a frase do Pinta; arquivo quebrado: a nossa', async () => {
    const mapa = createAsset({
      kind: 'tilemap',
      name: 'fase',
      tilesetId: 'pecas',
      cols: 2,
      rows: 2,
    })
    expect(await convertTeamPintaArt(assetToJson(mapa))).toEqual({
      ok: false,
      error: NEEDS_TILESET_MESSAGE,
    })
    expect(await convertTeamPintaArt('não é json')).toEqual({
      ok: false,
      error: TEAM_ART_MESSAGES.unreadable,
    })
  })
})

describe('a conversão do Molda (só APIs públicas)', () => {
  type Calls = { namespaces: string[]; events: string[] }

  function fakeModules(options: {
    exportLoaded?: MoldaTeamModules['exportLoadedAssetForStudio']
    exportById?: MoldaTeamModules['exportAssetForStudio']
    inspect?: (json: string) => { id: string; updatedAt: number } | null
    save?: boolean
  }): { modules: MoldaTeamModules; calls: Calls } {
    const calls: Calls = { namespaces: [], events: [] }
    let current = 'perfil-1'
    let stored: { summary: { updatedAt: number } } | null = null
    const okModel = async () => ({
      ok: true as const,
      asset: {
        id: 'cena-1',
        name: 'castelo',
        kind: 'model3d' as const,
        dataUrl: 'data:model/gltf-binary;base64,Z2xURg==',
        originalFileName: 'castelo.glb',
        bytes: 4,
        thumbDataUrl: null,
      },
    })
    const modules: MoldaTeamModules = {
      maxReadVersion: 2,
      readMoldaDocument: readMoldaDocument as MoldaTeamModules['readMoldaDocument'],
      setMoldaStorageNamespace: (ns) => {
        calls.namespaces.push(`biblioteca:${ns}`)
      },
      exportLoadedAssetForStudio: options.exportLoaded ?? (okModel as never),
      exportAssetForStudio:
        options.exportById ??
        (async (id, context) => {
          calls.events.push(`export:${id}:${context.namespace}:${context.acceptedReview ?? '-'}`)
          return okModel()
        }),
      loadScene: async () => ({
        getMoldaStorageNamespace: () => current,
        setMoldaStorageNamespace: (ns) => {
          calls.namespaces.push(ns)
          current = ns
        },
        createMoldaSceneCloudSource: () => {
          calls.events.push(`fonte:${current}`)
          return {
            inspect: options.inspect ?? (() => ({ id: 'cena-1', updatedAt: 10 })),
            read: async () => stored,
            saveIfUnchanged: async (_id, _json, expected) => {
              calls.events.push(`grava:${expected}`)
              if (options.save === false) return false
              stored = { summary: { updatedAt: 10 } }
              return true
            },
            removeIfUnchanged: async (_id, expected) => {
              calls.events.push(`apaga:${expected}`)
              stored = null
              return true
            },
          }
        },
        createMemoryPersistence: () => ({}),
      }),
    }
    return { modules, calls }
  }

  const context = { viewerId: 'perfil-1', taskId: 'task-nave', revision: 5 }

  test('v1 (modelo): lido pelo leitor público e exportado no namespace do perfil', async () => {
    const asset = createModelAsset({ name: 'nave' })
    const json = JSON.stringify(moldaAssetToJson(asset))
    const seen: unknown[] = []
    const { modules, calls } = fakeModules({
      exportLoaded: (async (loaded: { id: string }, ctx: { namespace?: string }) => {
        seen.push([loaded.id, ctx.namespace])
        return {
          ok: true,
          asset: {
            id: loaded.id,
            name: 'nave',
            kind: 'model3d',
            dataUrl: 'data:model/gltf-binary;base64,Z2xURg==',
            originalFileName: 'nave.glb',
            bytes: 4,
            thumbDataUrl: null,
          },
        }
      }) as never,
    })
    const result = await convertTeamMoldaArt(json, context, async () => modules)
    expect(result).toEqual({
      ok: true,
      asset: {
        id: asset.id,
        name: 'nave',
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURg==',
        originalFileName: 'nave.glb',
      },
    })
    expect(seen).toEqual([[asset.id, 'perfil-1']])
    expect(calls.namespaces).toEqual(['biblioteca:perfil-1'])
  })

  test('v2 (cena): grava num namespace temporário, exporta, APAGA e devolve o namespace', async () => {
    const { modules, calls } = fakeModules({})
    const json = JSON.stringify({ formatVersion: 2, id: 'cena-1' })
    const result = await convertTeamMoldaArt(json, context, async () => modules)
    expect(result.ok).toBe(true)
    const temp = teamImportNamespace('perfil-1')
    expect(temp).toBe('perfil-1-equipe')
    // Troca só para a fonte nascer, e volta no mesmo instante.
    expect(calls.namespaces).toEqual([temp, 'perfil-1'])
    expect(calls.events).toEqual([
      `fonte:${temp}`,
      'grava:null',
      `export:cena-1:${temp}:-`,
      'apaga:10',
    ])
  })

  test('v2 com perdas: o consentimento usa o NOSSO token e, aceito, o do Molda', async () => {
    let attempt = 0
    const exportById: MoldaTeamModules['exportAssetForStudio'] = async (_id, ctx) => {
      attempt += 1
      if (ctx.acceptedReview !== 'molda-token')
        return {
          ok: false,
          reason: 'needs-review',
          review: { token: 'molda-token', losses: ['perde a pintura'] },
        }
      return {
        ok: true,
        asset: {
          id: 'cena-1',
          name: 'castelo',
          kind: 'model3d',
          dataUrl: 'data:model/gltf-binary;base64,Z2xURg==',
          originalFileName: 'castelo.glb',
        },
      }
    }
    const json = JSON.stringify({ formatVersion: 2 })
    const first = await convertTeamMoldaArt(
      json,
      context,
      async () => fakeModules({ exportById }).modules,
    )
    expect(first).toEqual({
      ok: false,
      error: TEAM_ART_MESSAGES.review,
      code: 'needs-review',
      review: { token: teamReviewToken('task-nave', 5), losses: ['perde a pintura'] },
    })
    attempt = 0
    const accepted = await convertTeamMoldaArt(
      json,
      { ...context, acceptedReview: teamReviewToken('task-nave', 5) },
      async () => fakeModules({ exportById }).modules,
    )
    expect(accepted.ok).toBe(true)
    expect(attempt).toBe(2)
    // Uma versão NOVA da colega pede consentimento de novo.
    const outraVersao = await convertTeamMoldaArt(
      json,
      { ...context, revision: 6, acceptedReview: teamReviewToken('task-nave', 5) },
      async () => fakeModules({ exportById }).modules,
    )
    expect(outraVersao.ok).toBe(false)
  })

  test('cena que não dá para converter: "Esse modelo ainda não viaja pela equipe."', async () => {
    const json = JSON.stringify({ formatVersion: 2 })
    const recusada = await convertTeamMoldaArt(
      json,
      context,
      async () => fakeModules({ save: false }).modules,
    )
    expect(recusada).toEqual({ ok: false, error: 'Esse modelo ainda não viaja pela equipe.' })
    const invalida = await convertTeamMoldaArt(
      json,
      context,
      async () => fakeModules({ inspect: () => null }).modules,
    )
    expect(invalida).toEqual({ ok: false, error: TEAM_ART_MESSAGES.scene })
    const quebrou = await convertTeamMoldaArt(json, context, async () => ({
      ...fakeModules({}).modules,
      loadScene: async () => {
        throw new Error('sem IndexedDB')
      },
    }))
    expect(quebrou).toEqual({ ok: false, error: TEAM_ART_MESSAGES.scene })
  })

  test('versão mais nova do que este Molda lê, e JSON quebrado', async () => {
    const { modules } = fakeModules({})
    expect(
      await convertTeamMoldaArt(JSON.stringify({ formatVersion: 3 }), context, async () => modules),
    ).toEqual({ ok: false, error: TEAM_ART_MESSAGES.newer })
    expect(await convertTeamMoldaArt('{', context, async () => modules)).toEqual({
      ok: false,
      error: TEAM_ART_MESSAGES.unreadable,
    })
  })
})
