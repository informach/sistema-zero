import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { PintaCausalEntry } from '@sistemazero/core/creations/pinta-causal'
import { ValidationError } from '@sistemazero/core/errors'
import type { GalleryDeliveryPlan } from '@sistemazero/core/learning'
import { PintaCausalError } from '../../src/domain/creations/pinta-causal-graph'
import { galleryLesson as setup } from '../fakes/gallery-lesson'

describe('gallery submission as a section criterion', () => {
  test('selection does not complete; signed confirmation receives multiple immutable copies and unlocks only the quiz', async () => {
    const ctx = setup(),
      items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const input = { requestId: randomUUID(), revision: ctx.revision, items }
    const response = await ctx.request(`${ctx.path}/gallery-prepare`, input)
    expect(response.status).toBe(200)
    const plan = (await response.json()) as GalleryDeliveryPlan
    if (plan.completed) throw new Error('Unexpected completion')
    expect(plan.snapshot.items).toHaveLength(2)
    expect(
      plan.copies.every(
        (copy) =>
          copy.source !== copy.destination &&
          copy.destination.includes(`/lesson-submissions/${ctx.blockId}/${input.requestId}/`),
      ),
    ).toBe(true)
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toBeNull()
    const unsigned = await ctx.request(`/internal${ctx.path}/gallery-commit`, {
      actor: ctx.owner,
      input,
      projectForChecks: null,
      copyGeneration: plan.copyGeneration,
    })
    expect(unsigned.status).toBe(401)
    const received = await ctx.request(
      `/internal${ctx.path}/gallery-commit`,
      { actor: ctx.owner, input, projectForChecks: null, copyGeneration: plan.copyGeneration },
      { 'x-consumer-id': 'member-shell' },
    )
    expect(received.status).toBe(200)
    expect((await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId))?.project).toEqual(
      plan.snapshot,
    )
    const view = (await (
      await ctx.request(`/courses/${ctx.course.slug}/lessons/${ctx.lessonId}`)
    ).json()) as { sectionProgress: { sections: { status: string }[]; completed: number } }
    expect(view.sectionProgress.sections.map((s) => s.status)).toEqual(['completed', 'available'])
    expect(view.sectionProgress.completed).toBe(1)
    const retry = (await (
      await ctx.request(`${ctx.path}/gallery-prepare`, input)
    ).json()) as GalleryDeliveryPlan
    expect(retry.completed).toBe(true)
    const saved = await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)
    expect(saved?.previousSubmittedAt).toBeNull()
  })
  test('voz para texto: o recado FALADO atravessa preparo e confirmação assinada; sem o campo, digitado', async () => {
    const ctx = setup(),
      items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const deliver = async (input: Record<string, unknown>) => {
      const prepared = await ctx.request(`${ctx.path}/gallery-prepare`, input)
      expect(prepared.status).toBe(200)
      const plan = (await prepared.json()) as GalleryDeliveryPlan
      if (plan.completed) throw new Error('Unexpected completion')
      const committed = await ctx.request(
        `/internal${ctx.path}/gallery-commit`,
        { actor: ctx.owner, input, projectForChecks: null, copyGeneration: plan.copyGeneration },
        { 'x-consumer-id': 'member-shell' },
      )
      expect(committed.status).toBe(200)
    }
    const base = { revision: ctx.revision, items }

    await deliver({
      ...base,
      requestId: randomUUID(),
      message: 'Escolhi os mais coloridos',
      messageSpoken: true,
    })
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toMatchObject({
      message: 'Escolhi os mais coloridos',
      messageSpoken: true,
    })

    await deliver({ ...base, requestId: randomUUID(), message: 'Troquei a ordem' })
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toMatchObject({
      message: 'Troquei a ordem',
      messageSpoken: false,
    })
    expect(ctx.teacherThreadsRepo.messages.map((m) => [m.body, m.spoken])).toEqual([
      ['Escolhi os mais coloridos', true],
      ['Troquei a ordem', false],
    ])
  })
  test('recado acima de 1000 caracteres: 400 no preparo e no commit, sem entrega e sem turno espelhado', async () => {
    const ctx = setup(),
      items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const commit = (input: Record<string, unknown>, copyGeneration: string = randomUUID()) =>
      ctx.request(
        `/internal${ctx.path}/gallery-commit`,
        { actor: ctx.owner, input, projectForChecks: null, copyGeneration },
        { 'x-consumer-id': 'member-shell' },
      )
    // A coluna é varchar(1000): antes a galeria aceitava 2000 e o upsert estourava 500 DEPOIS
    // de o recado já ter virado turno na conversa com o professor.
    const tooLong = {
      requestId: randomUUID(),
      revision: ctx.revision,
      items,
      message: 'a'.repeat(1001),
      messageSpoken: true,
    }
    const prepared = await ctx.request(`${ctx.path}/gallery-prepare`, tooLong)
    expect(prepared.status).toBe(400)
    const committed = await commit(tooLong)
    expect(committed.status).toBe(400)
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toBeNull()
    expect(ctx.teacherThreadsRepo.messages).toEqual([])

    // No limite exato a entrega passa e o recado chega inteiro.
    const atLimit = { ...tooLong, requestId: randomUUID(), message: 'b'.repeat(1000) }
    const atLimitResponse = await ctx.request(`${ctx.path}/gallery-prepare`, atLimit)
    expect(atLimitResponse.status).toBe(200)
    const atLimitPlan = (await atLimitResponse.json()) as GalleryDeliveryPlan
    if (atLimitPlan.completed) throw new Error('Unexpected completion')
    expect((await commit(atLimit, atLimitPlan.copyGeneration)).status).toBe(200)
    expect(
      (await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId))?.message,
    ).toHaveLength(1000)
    expect(ctx.teacherThreadsRepo.messages.map((m) => m.body.length)).toEqual([1000])
  })
  test('o serviço de entrega recusa recado acima do teto antes de espelhar o turno', async () => {
    const ctx = setup()
    // Rede para quem chamar o serviço sem passar por uma borda HTTP validada.
    await expect(
      ctx.submitStudio.execute(
        ctx.owner.userId,
        ctx.lessonId,
        ctx.blockId,
        {},
        {
          message: `  ${'c'.repeat(1001)}  `,
          accountId: ctx.owner.accountId,
          kind: 'pinta',
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(ctx.teacherThreadsRepo.messages).toEqual([])
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toBeNull()
  })
  test('rejects a sibling, stale revision, duplicates, counts, forged raw submission and a changed request', async () => {
    const ctx = setup(),
      mine = await ctx.seed('meu'),
      other = await ctx.seed('irmao', ctx.sibling)
    const base = { requestId: randomUUID(), revision: ctx.revision, items: [mine, other] }
    expect((await ctx.request(`${ctx.path}/gallery-prepare`, base)).status).toBe(400)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...base, items: [mine, mine] })).status,
    ).toBe(400)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...base, items: [mine] })).status,
    ).toBe(400)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...base, revision: 'b'.repeat(32) }))
        .status,
    ).toBe(409)
    const second = await ctx.seed('outro'),
      input = { ...base, items: [mine, second] }
    const plan = (await (
      await ctx.request(`${ctx.path}/gallery-prepare`, input)
    ).json()) as Exclude<GalleryDeliveryPlan, { completed: true }>
    expect(
      (await ctx.request(`${ctx.path}/pinta-submission`, { asset: plan.snapshot })).status,
    ).not.toBe(200)
    expect(
      (
        await ctx.request(
          `/internal${ctx.path}/gallery-commit`,
          { actor: ctx.owner, input, projectForChecks: null, copyGeneration: plan.copyGeneration },
          { 'x-consumer-id': 'member-shell' },
        )
      ).status,
    ).toBe(200)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...input, items: [second, mine] }))
        .status,
    ).toBe(409)
  })

  test('perfil causal SEM a leitura causal neste servidor: recusa clara e nenhuma cópia é reservada', async () => {
    const ctx = setup(),
      items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    // O repositório real cerca a leitura antiga de um desenho protegido (`assertIndividualPinta`).
    const read = ctx.creations.get.bind(ctx.creations)
    ctx.creations.get = async (userId, tool, itemId, audience) => {
      if (tool === 'pinta') throw new PintaCausalError('protocol-required')
      return read(userId, tool, itemId, audience)
    }
    const response = await ctx.request(`${ctx.path}/gallery-prepare`, {
      requestId: randomUUID(),
      revision: ctx.revision,
      items,
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'GALLERY_PINTA_CAUSAL_UNSUPPORTED',
        message: 'Os desenhos deste perfil não podem ser enviados pela galeria. Fale com a equipe.',
      },
    })
    expect(ctx.galleryCopies.attempts.size).toBe(0)
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toBeNull()
  })
})

describe('galeria da aula × Pinta causal (23/11/2026)', () => {
  /** A leitura causal que o servidor monta para todo perfil; aqui conta quem a chamou. */
  function causal(
    heads: (item: { itemId: string; revision: number }) => Promise<{
      entry: PintaCausalEntry
      storageRef: string
    }>,
  ) {
    const calls: { itemId: string; revision: number }[] = []
    const owner = { userId: '', accountId: '' }
    const gallery = {
      heads: {
        galleryItem: async (
          viewer: { userId: string; accountId: string },
          item: { itemId: string; revision: number },
        ) => {
          expect(viewer).toMatchObject(owner)
          calls.push(item)
          return heads(item)
        },
      },
    }
    return { gallery, calls, owner }
  }
  const sha = (n: number) => n.toString(16).padStart(64, '0')

  test('perfil antigo: a mesma cópia de antes, sem hash, sem tocar a leitura causal', async () => {
    const probe = causal(async () => {
      throw new Error('a leitura causal não pode ser consultada num perfil antigo')
    })
    const ctx = setup('pinta', { galleryPintaCausal: probe.gallery })
    Object.assign(probe.owner, { userId: ctx.owner.userId, accountId: ctx.owner.accountId })
    const items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const response = await ctx.request(`${ctx.path}/gallery-prepare`, {
      requestId: randomUUID(),
      revision: ctx.revision,
      items,
    })
    expect(response.status).toBe(200)
    const plan = (await response.json()) as GalleryDeliveryPlan
    if (plan.completed) throw new Error('Unexpected completion')
    expect(plan.snapshot.items.map((item) => Object.keys(item).sort())).toEqual([
      ['itemId', 'kind', 'name', 'parts', 'revision', 'storageKey'],
      ['itemId', 'kind', 'name', 'parts', 'revision', 'storageKey'],
    ])
    const stored = await Promise.all(
      items.map((item) => ctx.creations.get(ctx.owner.userId, 'pinta', item.itemId, 'kids')),
    )
    expect(plan.copies.map((copy) => copy.source)).toEqual(stored.map((row) => row!.storageRef!))
    expect(probe.calls).toEqual([])
  })

  test('lista antiga num perfil que virou causal: pede para escolher de novo, sem cópia', async () => {
    const probe = causal(async () => {
      throw new Error('sem hash, a entrega não consulta a leitura causal')
    })
    const ctx = setup('pinta', { galleryPintaCausal: probe.gallery })
    Object.assign(probe.owner, { userId: ctx.owner.userId, accountId: ctx.owner.accountId })
    const items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const read = ctx.creations.get.bind(ctx.creations)
    ctx.creations.get = async (userId, tool, itemId, audience) => {
      if (tool === 'pinta') throw new PintaCausalError('protocol-required')
      return read(userId, tool, itemId, audience)
    }
    const response = await ctx.request(`${ctx.path}/gallery-prepare`, {
      requestId: randomUUID(),
      revision: ctx.revision,
      items,
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'GALLERY_PINTA_DRAWING_CHANGED',
        message: 'Este desenho mudou. Escolha de novo para enviar a versão nova.',
      },
    })
    expect(ctx.galleryCopies.attempts.size).toBe(0)
  })

  test('servidor sem a leitura causal: o hash não abre nada e nada é copiado', async () => {
    const probe = causal(async () => {
      throw new Error('sem a leitura causal o inventário não é consultado')
    })
    const ctx = setup('pinta')
    const response = await ctx.request(`${ctx.path}/gallery-prepare`, {
      requestId: randomUUID(),
      revision: ctx.revision,
      items: [
        { itemId: 'dino', revision: 1, causalSha256: sha(1) },
        { itemId: 'cacto', revision: 1, causalSha256: sha(2) },
      ],
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: 'GALLERY_PINTA_CAUSAL_UNSUPPORTED' },
    })
    expect(probe.calls).toEqual([])
    expect(ctx.galleryCopies.attempts.size).toBe(0)
  })

  test('um hash causal num projeto do Estúdio é recusado antes de qualquer leitura', async () => {
    const probe = causal(async () => {
      throw new Error('o Estúdio não tem cabeça causal')
    })
    const ctx = setup('studio', { galleryPintaCausal: probe.gallery })
    Object.assign(probe.owner, { userId: ctx.owner.userId, accountId: ctx.owner.accountId })
    const response = await ctx.request(`${ctx.path}/gallery-prepare`, {
      requestId: randomUUID(),
      revision: ctx.revision,
      items: [{ itemId: 'jogo', revision: 1, causalSha256: sha(1) }],
    })
    expect(response.status).toBe(400)
    expect(probe.calls).toEqual([])
    expect(ctx.galleryCopies.attempts.size).toBe(0)
  })
})
