import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { createSkyAsset, createTextureAsset, type MoldaAsset } from '../../core/model'
import type { MoldaExportedAsset } from '../../export/studioLibrary'
import { exportLoadedAssetForStudio } from '../../export/studioLibrary'
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
    ({ savedAsset }: { savedAsset: MoldaAsset }) =>
      useStudioResync({
        exportAsset: (asset, context) => exportLoadedAssetForStudio(asset, context),
        savedAsset,
        send,
        idleMs,
      }),
    { initialProps: { savedAsset: first } },
  )
  return { sent, send, first, ...view }
}

describe('useStudioResync', () => {
  it('serializes worker export and delivery; flush waits for the newest saved sky', async () => {
    const first = createSkyAsset({ name: 'ceu', now: 1 })
    const delivered: string[] = []
    let releaseFirst = (): void => {
      throw new Error('Delivery gate not initialized')
    }
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const send = async (asset: MoldaExportedAsset) => {
      delivered.push(asset.originalFileName)
      if (delivered.length === 1) await gate
      return { updated: true as const }
    }
    const { result } = renderHook(() =>
      useStudioResync({
        exportAsset: (asset, context) => exportLoadedAssetForStudio(asset, context),
        savedAsset: first,
        send,
        idleMs: 10_000,
      }),
    )
    const firstFlush = result.current.flush({ ...first, name: 'ceu-1', updatedAt: 2 })
    const lastFlush = result.current.flush({ ...first, name: 'ceu-2', updatedAt: 3 })
    await waitFor(() => expect(delivered).toEqual(['ceu-1.hdr']))
    releaseFirst()
    await Promise.all([firstFlush, lastFlush])
    expect(delivered).toEqual(['ceu-1.hdr', 'ceu-2.hdr'])
  })

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
        useStudioResync({
          exportAsset: (asset, context) => exportLoadedAssetForStudio(asset, context),
          savedAsset,
          send: undefined,
          idleMs: 5,
        }),
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
          exportAsset: (asset, context) => exportLoadedAssetForStudio(asset, context),
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
          exportAsset: (asset, context) => exportLoadedAssetForStudio(asset, context),
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
        useStudioResync({
          exportAsset: (asset, context) => exportLoadedAssetForStudio(asset, context),
          savedAsset,
          send,
          idleMs: 60,
        }),
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
