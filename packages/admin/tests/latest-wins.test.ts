import { describe, expect, test } from 'bun:test'
import {
  canBackgroundRefreshPage,
  createForegroundPriority,
  createLatestAppendGuard,
  createScopeAuthority,
  runLatestForeground,
} from '../src/lib/latest-wins'

describe('foreground-priority — polling nunca engole paginação', () => {
  test('entre duas ações foreground, a mais nova continua vencendo', () => {
    const authority = createForegroundPriority()
    const oldFilter = authority.beginForeground()
    const newFilter = authority.beginForeground()
    expect(authority.canPublish(oldFilter)).toBe(false)
    expect(authority.canPublish(newFilter)).toBe(true)
    authority.finish(oldFilter)
    expect(authority.beginBackground()).toBeNull()
    authority.finish(newFilter)
  })

  test('background não começa enquanto Carregar mais está em voo', () => {
    const authority = createForegroundPriority()
    const pagination = authority.beginForeground()

    expect(authority.beginBackground()).toBeNull()
    expect(authority.canPublish(pagination)).toBe(true)

    authority.finish(pagination)
    expect(authority.beginBackground()).not.toBeNull()
  })

  test('foreground iniciado depois invalida o background, nunca o inverso', () => {
    const authority = createForegroundPriority()
    const polling = authority.beginBackground()
    if (!polling) throw new Error('background deveria iniciar')

    const pagination = authority.beginForeground()
    expect(authority.canPublish(polling)).toBe(false)
    expect(authority.canPublish(pagination)).toBe(true)
  })

  test('lista paginada não volta silenciosamente para a primeira página', () => {
    expect(canBackgroundRefreshPage(0)).toBe(true)
    expect(canBackgroundRefreshPage(30)).toBe(false)
    expect(canBackgroundRefreshPage(90)).toBe(false)
  })

  test('uma resposta antiga não publica dados, erro nem loading depois da mais nova', async () => {
    const authority = createForegroundPriority()
    let resolveOld: (value: string) => void = () => {}
    let resolveNew: (value: string) => void = () => {}
    const oldRead = new Promise<string>((resolve) => {
      resolveOld = resolve
    })
    const newRead = new Promise<string>((resolve) => {
      resolveNew = resolve
    })
    const published: string[] = []
    const errors: unknown[] = []
    let settled = 0
    const handlers = {
      onSuccess: (value: string) => published.push(value),
      onError: (error: unknown) => errors.push(error),
      onSettled: () => {
        settled += 1
      },
    }

    const oldRun = runLatestForeground(authority, () => oldRead, handlers)
    const newRun = runLatestForeground(authority, () => newRead, handlers)
    resolveNew('novo')
    await newRun
    resolveOld('antigo')
    await oldRun

    expect(published).toEqual(['novo'])
    expect(errors).toEqual([])
    expect(settled).toBe(1)
  })
})

describe('escopo de mutação', () => {
  test('trocar de plataforma invalida a recarga antiga, inclusive após ir e voltar', () => {
    const authority = createScopeAuthority<'adult' | 'kids'>('adult')
    const oldMutation = authority.capture()

    authority.update('kids')
    expect(authority.isCurrent(oldMutation)).toBe(false)

    authority.update('adult')
    expect(authority.isCurrent(oldMutation)).toBe(false)
    expect(authority.isCurrent(authority.capture())).toBe(true)
  })
})

describe('append paginado por aprendiz', () => {
  test('duplo clique inicia uma única página e a troca de aprendiz invalida a antiga', () => {
    const guard = createLatestAppendGuard()
    const oldLearner = guard.begin()
    expect(oldLearner).not.toBeNull()
    expect(guard.begin()).toBeNull()
    if (!oldLearner) throw new Error('append deveria iniciar')

    guard.invalidate()
    expect(guard.canPublish(oldLearner)).toBe(false)

    const newLearner = guard.begin()
    expect(newLearner).not.toBeNull()
    if (!newLearner) throw new Error('append do novo aprendiz deveria iniciar')
    expect(guard.canPublish(newLearner)).toBe(true)
    guard.finish(newLearner)
    expect(guard.begin()).not.toBeNull()
  })
})
