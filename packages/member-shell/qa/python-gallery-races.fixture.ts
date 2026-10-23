import { expect, mock, test } from 'bun:test'
import { gunzipSync, gzipSync } from 'node:zlib'
import type { GalleryDeliveryPlan, GalleryStudioSource } from '@sistemazero/core/learning'
import {
  pythonGalleryFixture,
  GALLERY_TEST_USER as USER,
} from '../../members/tests/fakes/python-gallery'

mock.module('server-only', () => ({}))
const { createGalleryDeliveryRoutes } = await import('../src/routes/gallery-delivery')

test('a duplicate losing delivery returns the winning receipt without grading or awarding XP', async () => {
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const f = await pythonGalleryFixture('pro')
  const input = { ...f.input, message: 'Meu jogo está pronto' }
  const upsert = f.studioSubmissions.upsert.bind(f.studioSubmissions)
  let writes = 0
  f.studioSubmissions.upsert = async (...args) => {
    if (++writes === 1) {
      entered.resolve()
      await release.promise
    }
    return upsert(...args)
  }
  const second = await f.gallery.prepare(f.actor, f.lessonId, f.blockId, input)
  if (second.completed) throw new Error('Unexpected completion')
  const reference = f.source.bindItem(second.snapshot.items[0]!)
  const { assets: _assets, ...program } = structuredClone(f.source.project)
  if (program.kind !== 'pro') throw new Error('Expected Pro')
  program.tree['main.py'] = { kind: 'file', content: 'pass\n' }
  f.source.objects.set(
    `/bucket/${second.snapshot.items[0]!.storageKey}`,
    gzipSync(
      JSON.stringify({
        format: 'sz-studio-parts',
        version: 1,
        program,
        assets: second.snapshot.items[0]!.parts.map((part) => part.hash),
      }),
    ),
  )
  const pending = f.gallery.commit(f.actor, f.lessonId, f.blockId, input, f.reference, {
    copyGeneration: f.plan.copyGeneration,
  })
  const firstSubmittedAt = f.clockRef.now.toISOString()
  try {
    await entered.promise
    f.clockRef.now = new Date(f.clockRef.now.getTime() + 1000)
    const winner = await f.gallery.commit(f.actor, f.lessonId, f.blockId, input, reference, {
      copyGeneration: second.copyGeneration,
    })
    expect(winner).toEqual({ submittedAt: f.clockRef.now.toISOString() })
    expect(winner.submittedAt).not.toBe(firstSubmittedAt)
    expect(await f.saved()).not.toHaveProperty('passedAt')
    expect(f.inspected()).toBe(0)
    expect(
      f.gamification.events.filter((event) => event.sourceType === 'studio_passed'),
    ).toHaveLength(0)
    expect(f.teacherThreadsRepo.messages.map((message) => message.body)).toEqual([input.message])
    release.resolve()
    expect(await pending).toEqual(winner)
    expect(
      f.gamification.events.filter((event) => event.sourceType === 'studio_passed'),
    ).toHaveLength(0)
    expect(
      f.gamification.events.filter((event) => event.sourceType === 'studio_submitted'),
    ).toEqual([expect.objectContaining({ amount: 0 })])
    expect(f.studioSubmissions.submissions).toHaveLength(1)
    expect((await f.saved())?.project).toEqual(second.snapshot)
    expect((await f.saved())?.submittedAt.toISOString()).toBe(winner.submittedAt)
    const delivered = await f.source.service.load(
      reference,
      second.snapshot.items[0]!,
      AbortSignal.timeout(2000),
    )
    if (delivered.kind !== 'pro') throw new Error('Expected Pro')
    expect(delivered.tree['main.py']).toEqual(program.tree['main.py'])
    expect(f.teacherThreadsRepo.messages.map((message) => message.body)).toEqual([input.message])
  } finally {
    release.resolve()
    await pending
    f.source.close()
  }
})

test('late CopyObject of a concurrent retry cannot overwrite the accepted destination', async () => {
  const f = await pythonGalleryFixture('pro')
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const winningProgram = structuredClone(f.source.project),
    lateProgram = structuredClone(winningProgram)
  if (lateProgram.kind !== 'pro' || winningProgram.kind !== 'pro') throw new Error('Expected Pro')
  const encode = (project: typeof winningProgram) => {
    const { assets: _assets, ...program } = project
    return gzipSync(
      JSON.stringify({
        format: 'sz-studio-parts',
        version: 1,
        program,
        assets: f.source.item.parts.map((part) => part.hash),
      }),
    )
  }
  // Search a same-size, different program. Fixture metadata (such as the inert release hash)
  // shifts the compressed size, so try a periodic and a deterministic high-entropy filler.
  let matched = false
  const fillers = [
    (i: number) => 33 + (i % 90),
    (i: number) => 33 + ((i * 7919 + ((i * i) % 89)) % 90),
  ]
  search: for (const filler of fillers)
    for (let n = 0; n < 256; n++) {
      lateProgram.tree['main.py'] = {
        kind: 'file',
        content: `pass\n#${Array.from({ length: n }, (_, i) => String.fromCharCode(filler(i))).join('')}\n`,
      }
      if (encode(lateProgram).byteLength === encode(winningProgram).byteLength) {
        matched = true
        break search
      }
    }
  expect(matched).toBe(true)
  expect(encode(lateProgram).byteLength).toBe(encode(winningProgram).byteLength)
  let current = lateProgram,
    copies = 0
  const plans: Exclude<GalleryDeliveryPlan, { completed: true }>[] = []
  const refs = new Map<string, GalleryStudioSource>()
  const partObject = f.source.objects.get(
    `/bucket/${f.plan.snapshot.items[0]!.parts[0]!.storageKey}`,
  )!
  const base = new URL(f.reference.source.url)
  base.pathname = '/bucket/'
  base.search = ''
  const route = createGalleryDeliveryRoutes(
    {
      getSession: async () => ({
        id: USER,
        email: '',
        firstName: '',
        lastName: '',
        role: 'customer',
        status: 'active',
        activeProfile: { accountId: USER },
      }),
    },
    {
      gatewayFetch: async () => {
        const plan = await f.gallery.prepare(f.actor, f.lessonId, f.blockId, f.input)
        if (!plan.completed) {
          plans.push(plan)
          refs.set(plan.copyGeneration, f.source.bindItem(plan.snapshot.items[0]!))
        }
        return { status: 200, body: plan }
      },
      gatewayFetchHmac: async (_path, options) => {
        const body = options.body as { projectForChecks: unknown; copyGeneration: string }
        return {
          status: 200,
          body: await f.gallery.commit(
            f.actor,
            f.lessonId,
            f.blockId,
            f.input,
            body.projectForChecks,
            { copyGeneration: body.copyGeneration },
          ),
        }
      },
    },
    {
      read: async (key) =>
        JSON.parse(gunzipSync(f.source.objects.get(`/bucket/${key}`)!).toString()),
      copy: async (source, destination) => {
        const body = source === 'original/project.gz' ? encode(current) : partObject
        if (source === 'original/project.gz' && ++copies === 1) {
          entered.resolve()
          await release.promise
        }
        // Storage adapter retains ordinary last-write CopyObject semantics.
        f.source.objects.set(`/bucket/${destination}`, body)
      },
      sign: async (key) => new URL(key, base).href,
    },
  )
  const request = () =>
    new Request('https://kids.test/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sz-viewer': USER },
      body: JSON.stringify(f.input),
    })
  const ctx = { params: Promise.resolve({ lessonId: f.lessonId, blockId: f.blockId }) }
  const pending = route.POST(request(), ctx)
  try {
    await entered.promise
    current = winningProgram
    const winner = await route.POST(request(), ctx)
    expect(winner.status).toBe(200)
    const winnerReceipt = (await winner.json()) as { submittedAt: string }
    expect(winnerReceipt).toEqual({ submittedAt: f.clockRef.now.toISOString() })
    const saved = await f.saved()
    expect(saved).not.toHaveProperty('passedAt')
    expect(plans).toHaveLength(2)
    expect(plans[0]!.copyGeneration).not.toBe(plans[1]!.copyGeneration)
    expect(saved?.project).toEqual(plans[1]!.snapshot)
    release.resolve()
    const late = await pending
    expect(late.status).toBe(200)
    expect(await late.json()).toEqual(winnerReceipt)
    expect(f.inspected()).toBe(0)
    expect(
      f.gamification.events.filter((event) => event.sourceType === 'studio_passed'),
    ).toHaveLength(0)
    expect(
      f.gamification.events.filter((event) => event.sourceType === 'studio_submitted'),
    ).toEqual([expect.objectContaining({ amount: 0 })])
    expect((await f.saved())?.project).toEqual(saved?.project)
    const accepted = plans[1]!,
      old = plans[0]!
    for (const [plan, expected] of [
      [accepted, winningProgram],
      [old, lateProgram],
    ] as const) {
      const delivered = await f.source.service.load(
        refs.get(plan.copyGeneration)!,
        plan.snapshot.items[0]!,
        AbortSignal.timeout(2000),
      )
      if (delivered.kind !== 'pro') throw new Error('Expected Pro')
      expect(delivered.tree['main.py']).toEqual(expected.tree['main.py'])
    }
  } finally {
    release.resolve()
    await pending
    f.source.close()
  }
})

test.each([
  'materialization',
  'persistence',
] as const)('a losing attempt returns the persisted winning receipt after %s', async (stage) => {
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const f = await pythonGalleryFixture('pro')
  let reads = 0
  f.source.setHandler(async (request) => {
    const object = f.source.objects.get(new URL(request.url).pathname)
    if (stage === 'materialization' && ++reads === 1) {
      entered.resolve()
      await release.promise
    }
    return new Response(object ?? null, { status: object ? 200 : 404 })
  })
  const upsert = f.studioSubmissions.upsert.bind(f.studioSubmissions)
  let writes = 0
  f.studioSubmissions.upsert = async (...args) => {
    if (stage === 'persistence' && ++writes === 1) {
      entered.resolve()
      await release.promise
    }
    return upsert(...args)
  }
  const second = await f.gallery.prepare(f.actor, f.lessonId, f.blockId, f.input)
  if (second.completed) throw new Error('Unexpected completion')
  const refB = f.source.bindItem(second.snapshot.items[0]!)
  const itemA = f.plan.snapshot.items[0]!
  const { assets: _assets, ...programA } = structuredClone(f.source.project)
  if (programA.kind !== 'pro') throw new Error('Expected Pro')
  programA.tree['main.py'] = { kind: 'file', content: 'pass\n' }
  f.source.objects.set(
    `/bucket/${itemA.storageKey}`,
    gzipSync(
      JSON.stringify({
        format: 'sz-studio-parts',
        version: 1,
        program: programA,
        assets: itemA.parts.map((p) => p.hash),
      }),
    ),
  )
  const pending = f.gallery.commit(f.actor, f.lessonId, f.blockId, f.input, f.reference, {
    copyGeneration: f.plan.copyGeneration,
  })
  try {
    await entered.promise
    f.clockRef.now = new Date(f.clockRef.now.getTime() + 1000)
    const winner = await f.gallery.commit(f.actor, f.lessonId, f.blockId, f.input, refB, {
      copyGeneration: second.copyGeneration,
    })
    expect(winner).toEqual({ submittedAt: f.clockRef.now.toISOString() })
    const saved = await f.saved()
    expect(saved?.project).toEqual(second.snapshot)
    release.resolve()
    const late = await pending
    expect((await f.saved())?.project).toEqual(saved?.project)
    expect(late).toEqual(winner)
    expect((await f.saved())?.submittedAt.toISOString()).toBe(winner.submittedAt)
    expect(f.inspected()).toBe(0)
    expect(
      f.gamification.events.filter((event) => event.sourceType === 'studio_passed'),
    ).toHaveLength(0)
    expect(
      f.gamification.events.filter((event) => event.sourceType === 'studio_submitted'),
    ).toEqual([expect.objectContaining({ amount: 0 })])
    expect(f.studioSubmissions.submissions).toHaveLength(1)
    const delivered = await f.source.service.load(
      refB,
      second.snapshot.items[0]!,
      AbortSignal.timeout(2000),
    )
    if (delivered.kind !== 'pro' || f.source.project.kind !== 'pro') throw new Error('Expected Pro')
    expect(delivered.tree['main.py']).toEqual(f.source.project.tree['main.py'])
    expect(delivered.tree['main.py']).not.toEqual(programA.tree['main.py'])
  } finally {
    release.resolve()
    await pending
    f.source.close()
  }
})
