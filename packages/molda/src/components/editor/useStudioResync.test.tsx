import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createSkyAsset, createTextureAsset, type MoldaAsset } from '../../core/model'
import type { MoldaExportedAsset } from '../../export/studioLibrary'
import {
  exportLoadedAssetForStudio,
  exportLoadedSceneForStudio,
  sameSceneStudioContent,
} from '../../export/studioLibrary'
import { migrateLegacyModel } from '../../scene/migrateLegacy'
import { setMoldaStorageNamespace } from '../../state/persistence'
import { makeModel } from '../../testing/fixtures'
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
  it('does not encode or request consent for a creation that has never been linked to Studio', async () => {
    const first = migrateLegacyModel(makeModel()).document
    const encode = mock(exportLoadedSceneForStudio),
      send = mock(async () => ({ updated: true as const }))
    const view = renderHook(() =>
      useStudioResync({ savedAsset: first, exportAsset: encode, send, canSend: async () => false }),
    )
    try {
      await act(async () => {
        expect(
          await view.result.current.prepareExit({ ...first, name: 'nova', updatedAt: 2 }),
        ).toBe(true)
      })
      expect(encode).not.toHaveBeenCalled()
      expect(send).not.toHaveBeenCalled()
      expect(view.result.current.review).toBeNull()
    } finally {
      view.unmount()
    }
  })

  it('unmount after switching profiles exports in the original profile', async () => {
    setMoldaStorageNamespace('resync-a')
    const first = createTextureAsset({ name: 'perfil-a', size: 16, now: 1 })
    const namespaces: string[] = []
    const view = renderHook(
      ({ savedAsset }) =>
        useStudioResync({
          savedAsset,
          idleMs: 60_000,
          send: async () => ({ updated: true }),
          exportAsset: async (asset, context) => {
            namespaces.push(context.namespace)
            return exportLoadedAssetForStudio(asset, context)
          },
        }),
      { initialProps: { savedAsset: first } },
    )
    try {
      view.rerender({ savedAsset: { ...first, updatedAt: 2 } })
      setMoldaStorageNamespace('resync-b')
      view.unmount()
      await waitFor(() => expect(namespaces).toEqual(['resync-a']))
    } finally {
      view.unmount()
      setMoldaStorageNamespace('')
    }
  })

  it('a newer save cancels the actual scene export before delivery and only sends the latest creation', async () => {
    const first = migrateLegacyModel(makeModel()).document
    const sent: MoldaExportedAsset[] = [],
      signals: AbortSignal[] = [],
      failures: unknown[] = []
    const view = renderHook(() =>
      useStudioResync({
        savedAsset: first,
        exportAsset: (asset, context) => {
          signals.push(context.signal!)
          return exportLoadedSceneForStudio(asset, context)
        },
        send: async (asset) => {
          sent.push(asset)
          return { updated: true }
        },
        onFailure: (message) => {
          failures.push(message)
        },
      }),
    )
    try {
      await act(async () => {
        const old = view.result.current.flush({ ...first, name: 'anterior', updatedAt: 2 })
        await Promise.resolve()
        expect(signals).toHaveLength(1)
        const latest = view.result.current.flush({ ...first, name: 'mais-nova', updatedAt: 3 })
        expect(signals[0]!.aborted).toBe(true)
        await Promise.all([old, latest])
      })
      expect(sent.map((asset) => asset.name)).toEqual(['mais-nova'])
      expect(failures).toEqual([])
    } finally {
      view.unmount()
    }
  })
  it('reviews a real scene export before resync and invalidates consent on a later save', async () => {
    const first = migrateLegacyModel(makeModel()).document
    const sent: MoldaExportedAsset[] = []
    const view = renderHook(() =>
      useStudioResync({
        savedAsset: first,
        exportAsset: exportLoadedSceneForStudio,
        sameContent: sameSceneStudioContent,
        send: async (asset) => {
          sent.push(asset)
          return { updated: true }
        },
        idleMs: 60_000,
      }),
    )
    const hidden = {
      ...first,
      updatedAt: first.updatedAt + 1,
      nodes: first.nodes.map((node, index) => (index === 0 ? { ...node, hidden: true } : node)),
    }
    await act(async () => {
      expect(await view.result.current.prepareExit(hidden)).toBe(false)
    })
    expect(sent).toHaveLength(0)
    expect(view.result.current.review?.losses.some((line) => line.includes('escondid'))).toBe(true)
    const approve = view.result.current.approveReview
    await act(async () => {
      await view.result.current.flush({ ...hidden, name: 'nova', updatedAt: hidden.updatedAt + 1 })
    })
    await act(async () => {
      await approve()
    })
    expect(sent).toHaveLength(0)
    await act(async () => {
      await view.result.current.approveReview()
    })
    expect(sent).toHaveLength(1)
    expect(sent[0]!.name).toBe('nova')
  })

  it('thumbnail saves preserve a pending authoring send and never send another model copy', async () => {
    const first = migrateLegacyModel(makeModel()).document
    const sent: MoldaExportedAsset[] = []
    const view = renderHook(
      ({ savedAsset }) =>
        useStudioResync({
          savedAsset,
          exportAsset: exportLoadedSceneForStudio,
          sameContent: sameSceneStudioContent,
          send: async (asset) => {
            sent.push(asset)
            return { updated: true }
          },
          idleMs: 20,
        }),
      { initialProps: { savedAsset: first } },
    )
    const edited = { ...first, updatedAt: first.updatedAt + 1, name: 'nova' }
    view.rerender({ savedAsset: edited })
    view.rerender({ savedAsset: { ...edited, updatedAt: edited.updatedAt + 1, thumb: 'foto' } })
    await waitFor(() => expect(sent).toHaveLength(1))
    view.rerender({ savedAsset: { ...edited, updatedAt: edited.updatedAt + 2, thumb: 'outra' } })
    await act(async () => {
      await view.result.current.flush()
    })
    view.unmount()
    expect(sent).toHaveLength(1)
    expect(sent[0]!.name).toBe('nova')
  })
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
    await waitFor(() => expect(delivered).toEqual(['ceu-1.hdr']))
    const lastFlush = result.current.flush({ ...first, name: 'ceu-2', updatedAt: 3 })
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
