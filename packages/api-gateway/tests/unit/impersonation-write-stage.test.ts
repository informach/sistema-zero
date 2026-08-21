import { describe, expect, test } from 'bun:test'
import { createImpersonationWriteStage } from '../../src/application/pipeline/stages/impersonation-write.stage'
import type { RouteMatch } from '../../src/domain/routing/route-match'
import { makeContext } from '../helpers'

const IMPERSONATED = {
  id: 'profile-1',
  email: 'cliente@x.com',
  firstName: 'Rafa',
  lastName: 'D',
  role: 'customer',
  status: 'active',
  impersonatorId: 'admin-1',
} as const

function setRoute(ctx: ReturnType<typeof makeContext>, id: string) {
  ctx.route = { route: { id } as RouteMatch['route'], params: {}, version: 'v1' }
}

describe('impersonation write stage', () => {
  test('bloqueia mutação readonly e mantém código estável', async () => {
    const ctx = makeContext({ method: 'POST' })
    ctx.user = { ...IMPERSONATED, impersonationMode: 'readonly' }
    setRoute(ctx, 'members-studio-submit')

    const response = await createImpersonationWriteStage().run(ctx)

    expect(response?.status).toBe(403)
    expect(await response?.json()).toMatchObject({
      error: { code: 'IMPERSONATION_READONLY' },
    })
  })

  test('claims antigas sem mode continuam readonly', async () => {
    const ctx = makeContext({ method: 'DELETE' })
    ctx.user = IMPERSONATED
    setRoute(ctx, 'members-creation-delete')
    expect((await createImpersonationWriteStage().run(ctx))?.status).toBe(403)
  })

  test('libera mutação quando o modo write está ativo', async () => {
    const ctx = makeContext({ method: 'PATCH' })
    ctx.user = { ...IMPERSONATED, impersonationMode: 'write' }
    setRoute(ctx, 'members-creation-update')
    expect(await createImpersonationWriteStage().run(ctx)).toBeUndefined()
  })

  test('nunca libera troca de credenciais pela impersonação', async () => {
    const ctx = makeContext({ method: 'POST' })
    ctx.user = { ...IMPERSONATED, impersonationMode: 'write' }
    setRoute(ctx, 'auth-me-password')
    const response = await createImpersonationWriteStage().run(ctx)
    expect(response?.status).toBe(403)
    expect(await response?.json()).toMatchObject({
      error: { code: 'IMPERSONATION_CREDENTIALS_FORBIDDEN' },
    })
  })

  test('libera leitura, sessão normal e controles de troca/saída de perfil', async () => {
    const read = makeContext({ method: 'GET' })
    read.user = IMPERSONATED
    setRoute(read, 'members-lessons')

    const normal = makeContext({ method: 'POST' })
    normal.user = { ...IMPERSONATED, impersonatorId: undefined }
    setRoute(normal, 'members-studio-submit')

    const select = makeContext({ method: 'POST' })
    select.user = IMPERSONATED
    setRoute(select, 'auth-profile-select')

    const exit = makeContext({ method: 'POST' })
    exit.user = IMPERSONATED
    setRoute(exit, 'auth-profile-session-exit')

    const stage = createImpersonationWriteStage()
    expect(await stage.run(read)).toBeUndefined()
    expect(await stage.run(normal)).toBeUndefined()
    expect(await stage.run(select)).toBeUndefined()
    expect(await stage.run(exit)).toBeUndefined()
  })
})
