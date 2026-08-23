import { describe, expect, test } from 'bun:test'
import { canBackgroundRefreshPage, createForegroundPriority } from '../src/lib/latest-wins'

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
})
