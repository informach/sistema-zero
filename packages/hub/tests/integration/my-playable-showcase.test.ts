import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, jsonRequest, studentHeaders, TEST_INTERNAL_API_TOKEN } from '../helpers'

async function preparar() {
  const ctx = buildApp()
  const canais: Record<string, string> = {}
  for (const audience of ['kids', 'adult'] as const) {
    const space = await ctx.repo.createSpace({
      slug: `mural-${audience}`,
      name: 'Mural',
      description: null,
      iconUrl: null,
      audience,
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      requiresApproval: true,
      teaserWhenLocked: true,
      status: 'active',
    })
    const canal = await ctx.repo.createChannel(space.id, {
      slug: 'parede',
      name: 'Parede',
      topic: null,
      accessConfig: null,
      postingPolicy: 'staff_only',
      requiresApproval: null,
      status: 'active',
    })
    canais[audience] = canal.id
  }
  const publicar = async (autor: string, audience: 'kids' | 'adult', indice = 0) => {
    const row = await ctx.threadRepo.createThread({
      id: randomUUID(),
      channelId: canais[audience] as string,
      authorId: autor,
      authorAccountId: autor,
      authorDisplayName: 'Pessoa',
      authorPublic: false,
      title: `Jogo ${indice}`,
      slug: `jogo-${indice}`,
      body: '',
      status: 'visible',
      attachmentIds: [],
      playId: randomUUID(),
      now: new Date(2026, 9, 1, 0, 0, indice),
    })
    row.isShowcase = true
    return row
  }
  return { ...ctx, publicar }
}

test('publicações próprias por comunidade, sem rascunhos, terceiros ou posts sem jogo', async () => {
  const ctx = await preparar()
  const autor = randomUUID()
  const kids = await ctx.publicar(autor, 'kids')
  const adulto = await ctx.publicar(autor, 'adult')
  await ctx.publicar(randomUUID(), 'kids')
  for (const status of ['pending', 'hidden', 'deleted', 'rejected'] as const) {
    const row = await ctx.publicar(autor, 'kids')
    row.status = status
  }
  const imagem = await ctx.publicar(autor, 'kids')
  imagem.playId = null
  const conversa = await ctx.publicar(autor, 'kids')
  conversa.isShowcase = false
  const duplicado = await ctx.publicar(autor, 'kids')
  duplicado.playId = kids.playId
  for (const [contexto, esperado] of [
    [true, kids],
    [false, adulto],
  ] as const) {
    const resposta = await ctx.app.handle(
      jsonRequest('GET', '/hub/my-playable-showcase?authorId=outro&audience=adult', {
        headers: studentHeaders(autor, contexto ? { 'x-auth-kids-context': 'true' } : {}),
      }),
    )
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('cache-control')).toBe('private, no-store')
    expect(await resposta.json()).toEqual({
      jogos: [{ playId: esperado.playId, titulo: esperado.title }],
    })
  }
  kids.status = 'hidden'
  duplicado.status = 'hidden'
  const retirada = await ctx.app.handle(
    jsonRequest('GET', '/hub/my-playable-showcase', {
      headers: studentHeaders(autor, { 'x-auth-kids-context': 'true' }),
    }),
  )
  expect(await retirada.json()).toEqual({ jogos: [] })
  const publica = await ctx.app.handle(
    jsonRequest('GET', `/hub/internal/studio-play/${kids.playId}`, {
      headers: { 'x-internal-token': TEST_INTERNAL_API_TOKEN },
    }),
  )
  expect(await publica.json()).toMatchObject({ visible: false })
})

test('lista limitada e autenticação obrigatória, sem driblar token interno', async () => {
  const ctx = await preparar()
  const autor = randomUUID()
  for (let n = 0; n < 30; n++) await ctx.publicar(autor, 'adult', n)
  const r = await ctx.app.handle(
    jsonRequest('GET', '/hub/my-playable-showcase', { headers: studentHeaders(autor) }),
  )
  const dados = (await r.json()) as { jogos: { titulo: string }[] }
  expect(dados.jogos).toHaveLength(24)
  expect(dados.jogos[0]?.titulo).toBe('Jogo 29')
  const recusados: Record<string, string>[] = [
    {},
    { 'x-internal-token': TEST_INTERNAL_API_TOKEN },
    { 'x-auth-user-id': autor },
  ]
  for (const headers of recusados) {
    expect(
      (await ctx.app.handle(jsonRequest('GET', '/hub/my-playable-showcase', { headers }))).status,
    ).toBe(401)
  }
})
