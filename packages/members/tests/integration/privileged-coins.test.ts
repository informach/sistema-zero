import { describe, expect, test } from 'bun:test'
import { buildApp } from '../helpers'

/**
 * Passe livre da EQUIPE no Kids (06/2026): superadmin/admin/staff acessam o Estúdio
 * Completo (produto vendável) SEM matrícula e têm Zappy Coins VIRTUAIS ilimitadas
 * (compras grátis que não debitam o saldo real; a UI mostra ∞). Mesma régua da
 * chave-mestra virtual dos cursos. Nada de seed de moedas DE PROPÓSITO — o passe
 * livre não depende de saldo. Numa sessão de perfil do Kids o token é da CONTA, então
 * o `x-auth-user-role` carrega o papel privilegiado (espelha privileged-access.test.ts).
 */
const STAFF_USER = '55555555-5555-5555-5555-555555555555'
type App = ReturnType<typeof buildApp>['app']
const readJson = (r: Response): Promise<any> => r.json()

/** Headers como o gateway injeta numa sessão de equipe (identidade + role do JWT). */
const roleHeaders = (role: string) => ({
  'x-auth-user-id': STAFF_USER,
  'x-auth-user-role': role,
  'content-type': 'application/json',
})

const get = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const post = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { method: 'POST', headers }))

describe('Equipe interna — Estúdio Completo (passe livre de produto)', () => {
  test.each([
    'superadmin',
    'admin',
    'staff',
  ])('%s acessa estudio-completo sem matrícula (GET /members/access)', async (role) => {
    const { app } = buildApp()
    const res = await get(
      app,
      '/members/access?refs=estudio-completo&audience=kids',
      roleHeaders(role),
    )
    expect(res.status).toBe(200)
    expect((await readJson(res)).access['estudio-completo']).toBe(true)
  })

  test('customer sem o produto continua bloqueado (sem regressão)', async () => {
    const { app } = buildApp()
    const res = await get(app, '/members/access?refs=estudio-completo&audience=kids', {
      'x-auth-user-id': STAFF_USER,
      'x-auth-user-role': 'customer',
    })
    expect((await readJson(res)).access['estudio-completo']).toBe(false)
  })
})

describe('Equipe interna — Zappy Coins ilimitadas (moedas virtuais)', () => {
  test('GET /avatar, /room e /gamification/me marcam ilimitado (saldo real intocado)', async () => {
    const { app } = buildApp()
    const h = roleHeaders('admin')

    const avatar = await readJson(await get(app, '/members/avatar', h))
    expect(avatar.balanceUnlimited).toBe(true)
    expect(avatar.balance).toBe(0) // saldo REAL intocado (nunca persiste moeda p/ equipe)

    const room = await readJson(await get(app, '/members/room', h))
    expect(room.balanceUnlimited).toBe(true)

    const me = await readJson(await get(app, '/members/gamification/me?audience=kids', h))
    expect(me.coins).toEqual({ balance: 0, unlimited: true })
  })

  test('compra peça PAGA do avatar sem saldo → sucesso grátis (unlimited) + posse', async () => {
    const { app, gamification, avatar } = buildApp()
    const h = roleHeaders('admin')

    const buy = await readJson(await post(app, '/members/avatar/parts/glasses-04/buy', h)) // 120
    expect(buy).toEqual({ alreadyOwned: false, balance: 0, unlimited: true })
    expect(await avatar.listInventory(STAFF_USER, 'kids')).toContain('glasses-04')
    expect(await gamification.getBalance(STAFF_USER, 'kids')).toBe(0) // nada debitado
  })

  test('compra item PAGO do quarto sem saldo → sucesso grátis (unlimited) + posse', async () => {
    const { app, room } = buildApp()
    const buy = await readJson(
      await post(app, '/members/room/items/floresta/buy', roleHeaders('staff')),
    ) // tema 200
    expect(buy).toEqual({ alreadyOwned: false, balance: 0, unlimited: true })
    expect(await room.listInventory(STAFF_USER, 'kids')).toContain('floresta')
  })

  test('compra protetor de sequência sem saldo → sucesso (unlimited)', async () => {
    const { app } = buildApp()
    const buy = await readJson(
      await post(
        app,
        '/members/gamification/streak-freeze/buy?audience=kids',
        roleHeaders('admin'),
      ),
    )
    expect(buy.freezes).toBe(1)
    expect(buy.unlimited).toBe(true)
  })

  test('customer sem saldo continua 402 (sem regressão)', async () => {
    const { app } = buildApp()
    const res = await post(app, '/members/avatar/parts/glasses-04/buy', {
      'x-auth-user-id': STAFF_USER,
      'x-auth-user-role': 'customer',
    })
    expect(res.status).toBe(402)
  })
})
