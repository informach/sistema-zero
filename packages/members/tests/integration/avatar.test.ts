import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AVATAR_CATALOG as C, equipPart, withEars } from '@sistemazero/core/avatar'
import { buildApp } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const headers = { 'x-auth-user-id': USER, 'content-type': 'application/json' }
type App = ReturnType<typeof buildApp>['app']
const readJson = (r: Response): Promise<any> => r.json()

const getAvatar = (app: App) =>
  app.handle(new Request('http://localhost/members/avatar', { headers }))
const buyPart = (app: App, partId: string) =>
  app.handle(
    new Request(`http://localhost/members/avatar/parts/${partId}/buy`, { method: 'POST', headers }),
  )
const putAvatar = (app: App, body: unknown) =>
  app.handle(
    new Request('http://localhost/members/avatar', {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    }),
  )

/** Concede moedas kids ao USER direto no ledger (atalho de setup; respeita o teto de 100 por dia). */
function seedCoins(
  gamification: ReturnType<typeof buildApp>['gamification'],
  coins: number,
  today = '2026-06-02',
) {
  return gamification.award({
    userId: USER,
    accountId: USER,
    audience: 'kids',
    events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 10, coins }],
    today,
    now: new Date(`${today}T12:00:00.000Z`),
    privileged: false,
  })
}

const partes = Object.entries(C.parts).filter(([, p]) => !p.hidden && !p.retired)
const pecaDe = (grupo: string, tier: string, preco?: number) => {
  const id = partes.find(
    ([, p]) => p.group === grupo && p.tier === tier && (preco === undefined || p.price === preco),
  )?.[0]
  if (!id) throw new Error(`sem peça ${grupo}/${tier}/${preco}`)
  return id
}
const CAMISETA_PAGA = pecaDe('roupa_cima', 'coins', 50)
const base = () =>
  withEars(C, { corpo: C.rules.default.corpo ?? '', rosto: C.rules.default.rosto ?? '' })

describe('Avatar do pack: estado', () => {
  test('sem nada salvo, o perfil vê o seu sorteado, grátis e vestido', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    const body = await readJson(await getAvatar(app))
    expect(body.style).toBe('cute-v1')
    expect(body.balance).toBe(100)
    expect(body.filter).toBeNull()
    expect(body.customized).toBe(false)
    expect(body.owned).toEqual([])
    expect(body.equipped.corpo).toBeDefined()
    expect(body.equipped.rosto).toBeDefined()
    for (const id of Object.values(body.equipped) as string[])
      expect(['free', 'auto']).toContain(C.parts[id]?.tier ?? '')
    // O mesmo perfil vê o mesmo sorteado a cada leitura.
    expect((await readJson(await getAvatar(app))).equipped).toEqual(body.equipped)
  })
})

describe('Avatar do pack: compra', () => {
  test('compra debita, fica no inventário, e comprar de novo não cobra', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    expect(await readJson(await buyPart(app, CAMISETA_PAGA))).toEqual({
      alreadyOwned: false,
      balance: 50,
    })
    expect(await readJson(await buyPart(app, CAMISETA_PAGA))).toEqual({
      alreadyOwned: true,
      balance: 50,
    })
    expect((await readJson(await getAvatar(app))).owned).toEqual([CAMISETA_PAGA])
  })

  test('a fantasia se compra inteira; uma parte sozinha → 400', async () => {
    const { app, gamification } = buildApp()
    // A fantasia custa até 300 e o teto é de 100 moedas por dia: três dias de aula.
    await seedCoins(gamification, 100, '2026-06-02')
    await seedCoins(gamification, 100, '2026-06-03')
    await seedCoins(gamification, 100, '2026-06-04')
    const [setId, conjunto] = Object.entries(C.sets).find(([, s]) => s.price <= 300) ?? []
    if (!setId || !conjunto) throw new Error('sem fantasia')
    const parte = await buyPart(app, conjunto.parts[0]?.part ?? '')
    expect(parte.status).toBe(400)
    expect((await readJson(parte)).error.code).toBe('AVATAR_PART_IN_SET')
    const compra = await buyPart(app, setId)
    expect(compra.status).toBe(200)
    expect((await readJson(await getAvatar(app))).owned).toEqual([setId])
    // E com o conjunto no inventário, a fantasia se veste.
    const slots = equipPart(C, base(), conjunto.parts[0]?.part ?? '')
    expect((await putAvatar(app, { slots })).status).toBe(200)
  })

  test('a chave da compra é a do pack (avatar-buy-v3), separada das compras antigas', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    await buyPart(app, CAMISETA_PAGA)
    const chaves = gamification.coinEvents
      .filter((e) => e.sourceType === 'spend_cosmetic')
      .map((e) => e.sourceId)
    expect(chaves).toEqual([`avatar-buy-v3:${USER}:${CAMISETA_PAGA}`])
  })

  test('peça escondida (rascunho da arte) não se compra: 404, como se não existisse', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    const escondida = Object.entries(C.parts).find(([, p]) => p.hidden && !p.set)?.[0]
    if (!escondida) return
    expect((await buyPart(app, escondida)).status).toBe(404)
    expect((await readJson(await getAvatar(app))).owned).toEqual([])
  })

  test('só responder o filtro grava o filtro, mas o avatar não conta como personalizado', async () => {
    const { app } = buildApp()
    const antes = await readJson(await getAvatar(app))
    expect((await putAvatar(app, { slots: antes.equipped, filter: 'girl' })).status).toBe(200)
    const depois = await readJson(await getAvatar(app))
    expect(depois.filter).toBe('girl')
    expect(depois.customized).toBe(false)
    // Trocar uma peça conta, e continua contando depois.
    const outra = equipPart(C, antes.equipped, pecaDe('roupa_cima', 'free'))
    await putAvatar(app, { slots: outra })
    expect((await readJson(await getAvatar(app))).customized).toBe(true)
    await putAvatar(app, { slots: outra, filter: 'boy' })
    expect((await readJson(await getAvatar(app))).customized).toBe(true)
  })

  test('sem saldo → 402; peça grátis → 400; inexistente → 404; prêmio da festa → 409', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 10)
    expect((await buyPart(app, CAMISETA_PAGA)).status).toBe(402)
    expect((await buyPart(app, pecaDe('roupa_cima', 'free'))).status).toBe(400)
    expect((await buyPart(app, 'nao_existe')).status).toBe(404)
    const premio = Object.values(C.rules.festas)[0]?.prize ?? ''
    expect((await buyPart(app, premio)).status).toBe(409)
  })
})

describe('Avatar do pack: gravar', () => {
  test('grava o que a pessoa montou, com o filtro, e passa a contar como personalizado', async () => {
    const { app } = buildApp()
    const slots = equipPart(C, base(), pecaDe('roupa_cima', 'free'))
    const put = await putAvatar(app, { slots, filter: 'boy' })
    expect(put.status).toBe(200)
    const body = await readJson(put)
    expect(body.equipped).toEqual(slots)
    expect(body.filter).toBe('boy')
    const estado = await readJson(await getAvatar(app))
    expect(estado.customized).toBe(true)
    expect(estado.filter).toBe('boy')
    // Gravar de novo sem filtro mantém o que estava.
    await putAvatar(app, { slots })
    expect((await readJson(await getAvatar(app))).filter).toBe('boy')
  })

  test('peça paga sem posse → 403; o que não combina → 400; formato antigo → 400', async () => {
    const { app } = buildApp()
    const paga = equipPart(C, base(), CAMISETA_PAGA)
    expect((await putAvatar(app, { slots: paga })).status).toBe(403)
    const naoCombina = {
      ...base(),
      roupa_inteira: pecaDe('roupa_inteira', 'free'),
      calca: pecaDe('calca', 'free'),
    }
    expect((await putAvatar(app, { slots: naoCombina })).status).toBe(400)
    const antigo = { slots: { head: { asset: 'head-01', color: '#ecad80' } } }
    expect((await putAvatar(app, antigo)).status).toBe(400)
  })
})

describe('Avatar do pack: foto', () => {
  const putPhoto = (app: App, photoUrl: string) =>
    app.handle(
      new Request('http://localhost/members/avatar/photo', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ photoUrl }),
      }),
    )

  test('grava a URL (sem gravar avatar antes); aparece no GET; recusa o que não é http', async () => {
    const { app } = buildApp()
    const url = 'https://cdn.sistemazero.com.br/community/avatar3d/x/a.webp'
    expect((await putPhoto(app, url)).status).toBe(200)
    const estado = await readJson(await getAvatar(app))
    expect(estado.photoUrl).toBe(url)
    expect(estado.customized).toBe(false)
    expect((await putPhoto(app, 'javascript:alert(1)')).status).toBe(400)
  })
})
