import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, renderHook } from '@testing-library/react'
import { createTextureAsset, type MoldaAsset } from '../../core/model'
import type { MoldaExportedAsset } from '../../export/studioLibrary'
import { useStudioResync } from './useStudioResync'

/**
 * A volta da ponte com o Estúdio: abrir NÃO reenvia; salvar reenvia depois da folga,
 * uma vez por rajada, já no formato do Estúdio (a textura vira `.png`).
 */
afterEach(cleanup)

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function harness(idleMs = 60) {
  const sent: MoldaExportedAsset[] = []
  const send = mock(async (asset: MoldaExportedAsset) => {
    sent.push(asset)
    return { updated: true as const }
  })
  const first = createTextureAsset({ name: 'grama', size: 16, now: 1 })
  const view = renderHook(
    ({ savedAsset }: { savedAsset: MoldaAsset }) => useStudioResync({ savedAsset, send, idleMs }),
    { initialProps: { savedAsset: first } },
  )
  return { sent, send, first, ...view }
}

describe('useStudioResync', () => {
  it('abrir não reenvia; salvar reenvia UMA vez depois da folga, no formato do Estúdio', async () => {
    const { sent, first, rerender } = harness()
    await wait(40)
    expect(sent).toHaveLength(0)

    rerender({ savedAsset: { ...first, updatedAt: 2 } })
    await wait(5)
    expect(sent).toHaveLength(0)
    await wait(140)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ id: first.id, kind: 'image', originalFileName: 'grama.png' })
    expect(sent[0]?.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    expect(sent[0]?.width).toBe(16)
  })

  it('vários salvamentos dentro da folga viram UM reenvio, o último', async () => {
    const { sent, first, rerender } = harness()
    rerender({ savedAsset: { ...first, updatedAt: 2 } })
    await wait(5)
    rerender({ savedAsset: { ...first, name: 'grama-2', updatedAt: 3 } })
    await wait(160)
    expect(sent).toHaveLength(1)
    expect(sent[0]?.originalFileName).toBe('grama-2.png')
  })

  it('desmontar (fechar a criação) com reenvio pendente envia na hora', async () => {
    const { sent, first, rerender, unmount } = harness(10_000)
    rerender({ savedAsset: { ...first, updatedAt: 2 } })
    unmount()
    await wait(5)
    expect(sent).toHaveLength(1)
  })

  it('esconder a aba envia na hora', async () => {
    const { sent, first, rerender } = harness(10_000)
    rerender({ savedAsset: { ...first, updatedAt: 2 } })
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    try {
      document.dispatchEvent(new Event('visibilitychange'))
      await wait(5)
      expect(sent).toHaveLength(1)
    } finally {
      if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
      else Reflect.deleteProperty(document, 'hidden')
    }
  })

  it('sem `send` (host sem Estúdio) não faz nada', async () => {
    const first = createTextureAsset({ name: 'grama', size: 16, now: 1 })
    const view = renderHook(
      ({ savedAsset }: { savedAsset: MoldaAsset }) =>
        useStudioResync({ savedAsset, send: undefined, idleMs: 5 }),
      { initialProps: { savedAsset: first } },
    )
    view.rerender({ savedAsset: { ...first, updatedAt: 2 } })
    await wait(20)
    view.unmount()
  })

  it('expõe falha devolvida pelo host e rejeição sem quebrar os próximos envios', async () => {
    const first = createTextureAsset({ name: 'grama', size: 16, now: 1 })
    const failures: Array<string | undefined> = []
    let call = 0
    const send = mock(async () => {
      call += 1
      if (call === 1)
        return { updated: false as const, reason: 'failed' as const, error: 'sem espaço' }
      if (call === 2) throw new Error('ponte fora do ar')
      return { updated: true as const }
    })
    const view = renderHook(
      ({ savedAsset }: { savedAsset: MoldaAsset }) =>
        useStudioResync({
          savedAsset,
          send,
          idleMs: 5,
          onFailure: (message) => failures.push(message),
        }),
      { initialProps: { savedAsset: first } },
    )

    view.rerender({ savedAsset: { ...first, updatedAt: 2 } })
    await wait(20)
    view.rerender({ savedAsset: { ...first, updatedAt: 3 } })
    await wait(20)
    view.rerender({ savedAsset: { ...first, updatedAt: 4 } })
    await wait(20)

    expect(failures).toEqual(['sem espaço', undefined])
    expect(send).toHaveBeenCalledTimes(3)
  })

  it('updated false por ainda não estar ligado ao Estúdio permanece silencioso', async () => {
    const first = createTextureAsset({ name: 'grama', size: 16, now: 1 })
    const failures: string[] = []
    const view = renderHook(
      ({ savedAsset }: { savedAsset: MoldaAsset }) =>
        useStudioResync({
          savedAsset,
          send: async () => ({ updated: false, reason: 'not-linked' }),
          idleMs: 5,
          onFailure: (message) => failures.push(message ?? 'genérico'),
        }),
      { initialProps: { savedAsset: first } },
    )
    view.rerender({ savedAsset: { ...first, updatedAt: 2 } })
    await wait(20)
    expect(failures).toEqual([])
  })
})

describe('useStudioResync: o host recria o adapter', () => {
  it('trocar a identidade do `send` no meio da folga NÃO cancela o reenvio agendado', async () => {
    const sent: MoldaExportedAsset[] = []
    const first = createTextureAsset({ name: 'grama', size: 16, now: 1 })
    const makeSend = () =>
      mock(async (asset: MoldaExportedAsset) => {
        sent.push(asset)
        return { updated: true as const }
      })
    const view = renderHook(
      ({ savedAsset, send }: { savedAsset: MoldaAsset; send: ReturnType<typeof makeSend> }) =>
        useStudioResync({ savedAsset, send, idleMs: 60 }),
      { initialProps: { savedAsset: first, send: makeSend() } },
    )
    view.rerender({ savedAsset: { ...first, updatedAt: 2 }, send: makeSend() })
    await wait(10)
    // Um render do host com outro `send` (mesmo asset salvo).
    view.rerender({ savedAsset: { ...first, updatedAt: 2 }, send: makeSend() })
    await wait(140)
    expect(sent).toHaveLength(1)
    view.unmount()
  })
})
