import { describe, expect, test } from 'bun:test'
import { canonical, convertCourseContent, encode } from '../../scripts/project-migrations/content'
import { publishedRevisions } from '../../scripts/project-migrations/drafts'
import { applyPlan, type BatchAdapter, rollbackPlan } from '../../scripts/project-migrations/engine'
import { type Corpus, makePlan } from '../../scripts/project-migrations/plan'
import { sectionRevision } from '../../scripts/project-migrations/progress'
import {
  hash,
  type Row,
  rowIdentity,
  STAGING_PROJECT,
  type StoredObject,
  TABLES,
  type Table,
} from '../../scripts/project-migrations/railway'
import { createEmptyProject } from '../core/project'

function fixture(): Corpus {
  const project = {
    ...createEmptyProject('game-a', 'Perguntas'),
    formatVersion: undefined,
    mode: 'code',
    files: {
      'index.html': '<canvas></canvas>',
      'style.css': '',
      'script.js': 'SZGame2D.playJump();',
    },
  }
  const asset = {
    id: 'image-a',
    name: 'nave',
    kind: 'image',
    source: 'upload',
    dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
  }
  const part = {
    hash: hash(canonical(asset)),
    bytes: Buffer.from(encode(asset, true), 'base64').length,
    rev: 1,
  }
  const main = { format: 'sz-studio-parts', version: 1, program: project, assets: [part.hash] }
  const rows = Object.fromEntries(
    Object.keys(TABLES).map((table) => [table, [] as Row[]]),
  ) as Record<Table, Row[]>
  rows['members.creations'].push({
    id: 'row-a',
    user_id: 'user-a',
    item_id: 'game-a',
    revision: 1,
    last_reserved_revision: 2,
    pending_revision: null,
    storage_ref: 'creations/user-a/studio/game-a/1.json.gz',
    format_version: 1,
    parts: [part],
    bytes: 100,
    synced_at: '2026-09-10T00:00:00Z',
  })
  rows['members.studio_block_grants'].push({
    id: 'grant-a',
    blocks: ['sz_g2d_play_jump', 'sz_g2d_play_shoot'],
    granted_at: '2026-07-01T00:00:00Z',
  })
  rows['members.studio_submissions'].push({
    id: 'submission-a',
    project,
    previous_project: project,
    results: { score: 10 },
  })
  rows['members.courses'].push({
    id: 'course-a',
    version: 0,
    metadata: { studioUnlockBlocks: ['sz_g2d_play_jump'], other: 'conservado' },
  })
  rows['hub.threads'].push({ id: 'thread-a', play_id: 'play-a', studio_meta: null })
  const objects: StoredObject[] = [
    {
      bucket: 'ugc',
      key: String(rows['members.creations'][0]!.storage_ref),
      bytes: encode(main, true),
      etag: 'main-1',
    },
    {
      bucket: 'ugc',
      key: `creations/user-a/studio/game-a/parts/${part.hash}.1.gz`,
      bytes: encode(asset, true),
      etag: 'asset-1',
    },
    {
      bucket: 'private',
      key: 'studio/play/play-a.json',
      bytes: encode(project, false),
      etag: 'play-1',
    },
  ]
  return {
    environment: 'staging',
    project: STAGING_PROJECT,
    capturedAt: '2026-09-13T12:00:00Z',
    rows,
    objects,
  }
}

function memory(corpus: Corpus) {
  let rows = structuredClone(corpus.rows)
  const objects = new Map(corpus.objects.map((o) => [`${o.bucket}:${o.key}`, structuredClone(o)]))
  let swaps = 0
  let interrupt = false
  const adapter: BatchAdapter = {
    assertCandidate: async () => {},
    rows: async () => structuredClone(rows),
    objects: async (refs) =>
      refs.flatMap((ref) => {
        const object = objects.get(`${ref.bucket}:${ref.key}`)
        return object ? [structuredClone(object)] : []
      }),
    put: async (object, etag) => {
      const key = `${object.bucket}:${object.key}`
      const before = objects.get(key)
      if (before?.bytes === object.bytes) return
      if (before && (!etag || etag !== before.etag)) throw new Error('412')
      objects.set(key, { ...object, etag: hash(object.bytes) })
    },
    swap: async (changes) => {
      if (interrupt) throw new Error('Conexão interrompida antes da promoção')
      const copy = structuredClone(rows)
      for (const change of changes) {
        const index = copy[change.table].findIndex(
          (r) => rowIdentity(change.table, r) === rowIdentity(change.table, change.before),
        )
        if (canonical(copy[change.table][index]) === canonical(change.after)) continue
        if (canonical(copy[change.table][index]) !== canonical(change.before))
          throw new Error('CAS')
        copy[change.table][index] = structuredClone(change.after)
      }
      rows = copy
      swaps++
    },
    progress: () => {},
  }
  return {
    adapter,
    objects,
    swaps: () => swaps,
    interrupt: (value: boolean) => {
      interrupt = value
    },
    changeRows: (value: Record<Table, Row[]>) => {
      rows = value
    },
  }
}

describe('lote isolado de documentos Studio', () => {
  test('recupera objetos sem exigir promoção do banco quando a aplicação parou antes da transação', async () => {
    const corpus = fixture()
    const plan = await makePlan(corpus)
    const state = memory(corpus)
    state.interrupt(true)
    await expect(applyPlan(plan, state.adapter)).rejects.toThrow('Conexão interrompida')
    expect(await state.adapter.rows()).toEqual(corpus.rows)
    const mural = corpus.objects.find((object) => object.bucket === 'private')!
    expect(state.objects.get(`private:${mural.key}`)?.bytes).not.toBe(mural.bytes)
    state.interrupt(false)
    const swap = state.adapter.swap
    state.adapter.swap = async (changes, sources) => {
      expect(changes).toEqual([])
      // The real SQL compares every source row even when there are no updates.
      expect(sources).toEqual(corpus.rows)
      await swap(changes, sources)
    }
    await rollbackPlan(plan, state.adapter)
    await rollbackPlan(plan, state.adapter)
    expect(await state.adapter.rows()).toEqual(corpus.rows)
    expect(state.objects.get(`private:${mural.key}`)?.bytes).toBe(mural.bytes)
  })

  test('critério equivalente conserva aprovações parciais de cada perfil e a revisão pedagógica', async () => {
    const corpus = fixture()
    corpus.rows['members.lessons'].push({
      id: 'lesson-a',
      title: 'Pulo',
      slug: 'pulo',
      estimated_minutes: 10,
    })
    corpus.rows['members.lesson_blocks'].push({
      id: 'block-a',
      lesson_id: 'lesson-a',
      kind: 'studio',
      archived_at: null,
      sort_order: 0,
      content_revision: 'pedagogica',
      content: { kind: 'studio', allowBlocks: ['sz_g2d_play_jump'] },
    })
    corpus.rows['members.lesson_structures'].push({
      lesson_id: 'lesson-a',
      revision: 'estrutura-original',
      sections: [
        {
          id: 'section-a',
          blockIds: ['block-a'],
          workspaceBlockId: 'block-a',
          completion: {
            version: 1,
            blockIds: ['block-a'],
            projectChecks: [
              { id: 'pulo', rule: { type: 'usesBlock', blockType: 'sz_g2d_play_jump' } },
            ],
          },
        },
      ],
    })
    const revision = sectionRevision(corpus.rows, 'lesson-a', 'section-a')
    for (const user of ['perfil-a', 'perfil-b'])
      corpus.rows['members.lesson_section_progress'].push({
        user_id: user,
        account_id: 'conta',
        lesson_id: 'lesson-a',
        section_id: 'section-a',
        revision,
        project_passed: true,
        completed_at: user === 'perfil-a' ? null : '2026-09-01T00:00:00+00:00',
      })
    const original = structuredClone(corpus.rows['members.lesson_section_progress'])
    const plan = await makePlan(corpus)
    expect(plan.failures).toEqual([])
    const state = memory(corpus)
    await applyPlan(plan, state.adapter)
    const rows = await state.adapter.rows()
    const expected = sectionRevision(rows, 'lesson-a', 'section-a')
    expect(expected).not.toBe(revision)
    expect(rows['members.lesson_blocks'][0]!.content_revision).toBe('pedagogica')
    expect(rows['members.lesson_section_progress']).toEqual(
      original.map((row) => ({ ...row, revision: expected })),
    )
    await rollbackPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.lesson_section_progress']).toEqual(original)
  })

  test('entrega da galeria conserva a referência e converte também o snapshot separado', async () => {
    const corpus = fixture()
    const key = 'creations/user-a/lesson-submissions/block-a/request-a/game-a-1/project.gz'
    const asset = corpus.objects[1]!
    const partHash = String((corpus.rows['members.creations'][0]!.parts as Row[])[0]!.hash)
    const partKey = key.replace('project.gz', `parts/${partHash}.gz`)
    corpus.objects.push({ ...corpus.objects[0]!, key }, { ...asset, key: partKey })
    const reference = {
      kind: 'gallery-delivery',
      version: 1,
      requestId: 'request-a',
      tool: 'studio',
      items: [
        {
          itemId: 'game-a',
          name: 'Perguntas',
          kind: 'classic',
          revision: 1,
          storageKey: key,
          parts: [{ hash: partHash, storageKey: partKey }],
        },
      ],
    }
    corpus.rows['members.studio_submissions'][0]!.project = reference
    const plan = await makePlan(corpus)
    expect(plan.failures).toEqual([])
    const state = memory(corpus)
    await applyPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.studio_submissions'][0]!.project).toEqual(
      reference,
    )
    expect(state.objects.get(`ugc:${key}`)?.bytes).not.toBe(corpus.objects[3]!.bytes)
    expect(state.objects.get(`ugc:${partKey}`)?.bytes).toBe(asset.bytes)
    await rollbackPlan(plan, state.adapter)
    expect(state.objects.get(`ugc:${key}`)?.bytes).toBe(corpus.objects[3]!.bytes)
  })

  test('preserva a base de publicação de rascunhos e bloqueia aba antiga pelo número do curso', async () => {
    const corpus = fixture()
    corpus.rows['members.lessons'].push({
      id: 'lesson-a',
      title: 'Perguntas',
      slug: 'perguntas',
      estimated_minutes: 10,
    })
    corpus.rows['members.lesson_blocks'].push({
      id: 'block-a',
      lesson_id: 'lesson-a',
      kind: 'studio',
      sort_order: 1,
      content_revision: 'original',
      archived_at: null,
      content: { kind: 'studio', allowBlocks: ['sz_g2d_play_jump'] },
    })
    const original = publishedRevisions(corpus.rows, 'lesson-a').current
    corpus.rows['members.lesson_drafts'].push({
      lesson_id: 'lesson-a',
      revision: 'draft-1',
      published_revision: original,
      document: { title: 'Título ainda em edição', blocks: [] },
    })
    const plan = await makePlan(corpus)
    expect(plan.failures).toEqual([])
    const state = memory(corpus)
    await applyPlan(plan, state.adapter)
    const rows = await state.adapter.rows()
    expect(rows['members.lesson_drafts'][0]?.published_revision).toBe(
      publishedRevisions(rows, 'lesson-a').current,
    )
    expect(rows['members.lesson_drafts'][0]?.document).toEqual(
      corpus.rows['members.lesson_drafts'][0]?.document,
    )
    expect(rows['members.courses'][0]?.version).toBe(1)
    await rollbackPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.lesson_drafts'][0]?.published_revision).toBe(
      original,
    )
    expect((await state.adapter.rows())['members.courses'][0]?.version).toBe(2)
  })

  test('critério de som conserva o efeito exato; relações históricas ambíguas são recusadas', async () => {
    expect(
      await convertCourseContent({ rule: { type: 'usesBlock', blockType: 'sz_g2d_play_jump' } }),
    ).toEqual({ rule: { type: 'usesBlock', blockType: 'sz_g2d_play_fx', fields: { FX: 'jump' } } })
    await expect(
      convertCourseContent({
        rule: { blockType: 'sz_g2d_draw_sprite', beforeBlock: 'sz_g2d_play_jump' },
      }),
    ).rejects.toThrow('exige revisão')
  })

  test('materializa assets, preserva histórico e grants, promove nova revisão e conserva link do mural', async () => {
    const corpus = fixture()
    const plan = await makePlan(corpus)
    expect(plan.failures).toEqual([])
    expect(plan.assets).toBe(1)
    const state = memory(corpus)
    await applyPlan(plan, state.adapter)
    const rows = await state.adapter.rows()
    expect(rows['members.creations'][0]?.revision).toBe(3)
    expect(rows['members.creations'][0]?.parts).toEqual(corpus.rows['members.creations'][0]?.parts)
    expect(rows['members.studio_block_grants'][0]).toEqual({
      id: 'grant-a',
      blocks: ['sz_g2d_play_fx'],
      granted_at: '2026-07-01T00:00:00Z',
    })
    expect(rows['members.studio_submissions'][0]?.results).toEqual({ score: 10 })
    expect(rows['hub.threads']).toEqual(corpus.rows['hub.threads'])
    await applyPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.creations'][0]?.revision).toBe(3)
    expect([...state.objects.keys()].some((key) => key.includes('studio-migration-backups'))).toBe(
      true,
    )
  })

  test('interrupção após upload pode ser retomada, sem promover antes da conferência e sem outra revisão', async () => {
    const corpus = fixture(),
      plan = await makePlan(corpus),
      state = memory(corpus)
    state.interrupt(true)
    await expect(applyPlan(plan, state.adapter)).rejects.toThrow('interrompida')
    expect(await state.adapter.rows()).toEqual(corpus.rows)
    state.interrupt(false)
    await applyPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.creations'][0]?.revision).toBe(3)
  })

  test('recuperação preserva código anterior, usa número novo e recusa edição concorrente', async () => {
    const corpus = fixture(),
      plan = await makePlan(corpus),
      state = memory(corpus)
    await applyPlan(plan, state.adapter)
    await rollbackPlan(plan, state.adapter)
    const restored = (await state.adapter.rows())['members.creations'][0]!
    expect(restored.revision).toBe(4)
    expect(restored.storage_ref).toBe('creations/user-a/studio/game-a/4.json.gz')
    expect(state.objects.get(`ugc:${restored.storage_ref}`)?.bytes).toBe(corpus.objects[0]?.bytes)
    await rollbackPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.creations'][0]).toEqual(restored)
    const second = memory(corpus)
    await applyPlan(plan, second.adapter)
    const rows = await second.adapter.rows()
    rows['members.creations'][0]!.revision = 50
    second.changeRows(rows)
    await expect(rollbackPlan(plan, second.adapter)).rejects.toThrow('Edição posterior')
  })

  test('diário de recuperação permite retomar uma interrupção sem alocar outra revisão', async () => {
    const corpus = fixture(),
      plan = await makePlan(corpus),
      state = memory(corpus)
    await applyPlan(plan, state.adapter)
    state.interrupt(true)
    await expect(rollbackPlan(plan, state.adapter)).rejects.toThrow('interrompida')
    expect((await state.adapter.rows())['members.creations'][0]?.revision).toBe(3)
    state.interrupt(false)
    await rollbackPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.creations'][0]?.revision).toBe(4)
    await rollbackPlan(plan, state.adapter)
    expect((await state.adapter.rows())['members.creations'][0]?.revision).toBe(4)
  })

  test('hash ou partes ausentes impedem qualquer aplicação', async () => {
    const corpus = fixture()
    corpus.objects.splice(1, 1)
    const plan = await makePlan(corpus)
    expect(plan.failures).toHaveLength(1)
    const state = memory(corpus)
    await expect(applyPlan(plan, state.adapter)).rejects.toThrow('pendências')
    expect(state.swaps()).toBe(0)
    expect(state.objects.size).toBe(corpus.objects.length)
  })

  test('ambiente diferente e upload concorrente são recusados', async () => {
    const corpus = fixture()
    await expect(
      makePlan({ ...corpus, environment: 'production' } as unknown as Corpus),
    ).rejects.toThrow('staging')
    corpus.rows['members.creations'][0]!.pending_revision = 2
    expect((await makePlan(corpus)).failures[0]?.message).toContain('upload reservado')
  })
})
