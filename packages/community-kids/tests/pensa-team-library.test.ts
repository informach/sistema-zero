import { describe, expect, mock, test } from 'bun:test'
import {
  createModelAsset,
  assetToJson as moldaAssetToJson,
  readMoldaDocument,
} from '@sistemazero/molda/assets'
import { assetToJson, createAsset } from '@sistemazero/pinta/assets'
import { NEEDS_TILESET_MESSAGE } from '@sistemazero/pinta/studio-library'
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
  type PensaTeamLibraryDeps,
  pensaTeamArtAvailable,
  pensaTeamArtId,
  teamArtKind,
  teamArtSummaries,
} from '../src/lib/pensa-team-library'

import {
  PENSA_TEST_PROGRAMMER as BIA,
  PENSA_TEST_ARTIST as LEO,
  PENSA_TEST_PROJECT as PLAN,
  pensaTestArt,
  pensaTestTeam,
  pensaTestView,
} from './fixtures/pensa'

function routes(table: Record<string, () => Response | Promise<Response>>, viewerId = BIA) {
  const calls: string[] = []
  const fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push(url)
    if (url.startsWith('/api/pensa/') && new Headers(init?.headers).get('x-sz-viewer') !== viewerId)
      return Response.json({ error: { code: 'VIEWER_MISMATCH' } }, { status: 409 })
    return table[url]?.() ?? new Response('{}', { status: 404 })
  })
  return { fetch, calls }
}

describe('canonical team art', () => {
  const base = `/api/pensa/projects/${PLAN}`
  test('project and Studio game IDs round trip', () => {
    expect(pensaPlanIdFromStudioProjectId(pensaStudioProjectId(PLAN))).toBe(PLAN)
    expect(pensaPlanIdFromStudioProjectId('free-game')).toBeNull()
  })
  test('only the programmer sees delivered team art', async () => {
    const serve = (viewer: string, count: number) =>
      routes(
        {
          [base]: () => Response.json(pensaTestView(pensaTestTeam(viewer, count))),
          [`${base}/team-art`]: () => Response.json({ items: [pensaTestArt()] }),
        },
        viewer,
      )
    expect(await pensaTeamArtAvailable(PLAN, BIA, serve(BIA, 1).fetch)).toBe(true)
    expect(await pensaTeamArtAvailable(PLAN, LEO, serve(LEO, 1).fetch)).toBe(false)
    expect(await pensaTeamArtAvailable(PLAN, BIA, serve(BIA, 0).fetch)).toBe(false)
    expect(await pensaTeamArtAvailable(PLAN, BIA, routes({}).fetch)).toBe(false)
  })
  test('two elements in one mission have separate identities', () => {
    const first = pensaTestArt()
    const second = pensaTestArt({
      slot: { ...first.slot, id: BIA, name: 'Fundo', kind: 'background' },
    })
    const summaries = teamArtSummaries([first, second], pensaTestTeam())
    expect(summaries.map((item) => item.id)).toEqual([
      pensaTeamArtId(first),
      pensaTeamArtId(second),
    ])
    expect(new Set(summaries.map((item) => item.assetId)).size).toBe(2)
    expect(teamArtKind(first)).toBe('drawing')
  })
  test('imports the exact saved delivery through the native conversion and preserves its origin', async () => {
    const art = pensaTestArt()
    const endpoint = `${base}/team-art/${art.missionId}/${art.slot.id}/download`
    const { fetch, calls } = routes({
      [`${base}/team-art`]: () => Response.json({ items: [art] }),
      [`${base}/members`]: () => Response.json(pensaTestTeam()),
      [endpoint]: () => Response.json({ downloadUrl: 'https://example.test/art', revision: 3 }),
      'https://example.test/art': () => new Response('document'),
    })
    const saved: Array<Parameters<NonNullable<PensaTeamLibraryDeps['savePersonalAsset']>>[0]> = []
    const library = createPensaTeamLibrary({
      planId: PLAN,
      viewerId: BIA,
      deps: {
        fetch,
        supported: () => true,
        gunzip: async (bytes) => new TextDecoder().decode(bytes),
        convertPinta: async () => ({
          ok: true,
          asset: {
            id: 'heroi',
            name: 'Heroi',
            dataUrl: 'data:image/png;base64,AAAA',
            width: 8,
            height: 8,
          },
        }),
        savePersonalAsset: async (asset) => {
          saved.push(asset)
          return { ok: true, name: asset.name, updatedAt: 5 }
        },
      },
    })
    await library.list()
    expect(await library.import(pensaTeamArtId(art))).toMatchObject({
      tool: 'pinta',
      result: { ok: true },
    })
    expect(saved).toEqual([
      {
        id: `equipe-${art.missionId}-${art.slot.id}`,
        name: 'Heroi',
        origin: 'pinta',
        dataUrl: 'data:image/png;base64,AAAA',
        width: 8,
        height: 8,
      },
    ])
    expect(calls).toContain(endpoint)
  })
  test('a different saved revision cannot silently replace the delivery', async () => {
    const art = pensaTestArt()
    const { fetch } = routes({
      [`${base}/team-art`]: () => Response.json({ items: [art] }),
      [`${base}/team-art/${art.missionId}/${art.slot.id}/download`]: () =>
        Response.json({ downloadUrl: 'https://example.test/art', revision: 4 }),
    })
    const library = createPensaTeamLibrary({
      planId: PLAN,
      viewerId: BIA,
      deps: { fetch, supported: () => true },
    })
    expect(await library.import(pensaTeamArtId(art))).toMatchObject({
      result: { ok: false, code: 'not-found' },
    })
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
