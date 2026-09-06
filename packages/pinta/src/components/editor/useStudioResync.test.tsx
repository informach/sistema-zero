/**
 * A volta da ponte com o Estúdio: o que o host responde vira (ou não) aviso.
 * `reason: 'failed'` e a promise rejeitada chamam `onFailure`; `not-linked`, o
 * `{updated:false}` seco e o que não coube nos tetos ficam em silêncio.
 *
 * ⚠️ happy-dom não tem canvas 2D e o `buildStudioPayload` devolveria `null` (o
 * envio nem sairia): o teste dá um contexto FALSO ao `<canvas>` no protótipo, só
 * enquanto roda, e restaura no fim (o bun não isola módulos entre arquivos).
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { clearIdbMock } from '../../testing/idbMock'

const { createPixelBackgroundAsset } = await import('../../core/project')
const { createGalleryStore } = await import('../../state/galleryStore')
const { useStudioResync } = await import('./useStudioResync')

type PintaAsset = import('../../core/project').PintaAsset
type PintaStudioResyncResult = import('../../core/types').PintaStudioResyncResult
type PintaExportedAsset = import('../../core/types').PintaExportedAsset

const canvasProto = HTMLCanvasElement.prototype
const originalGetContext = Object.getOwnPropertyDescriptor(canvasProto, 'getContext')
const originalToDataURL = Object.getOwnPropertyDescriptor(canvasProto, 'toDataURL')

/** Um PNG "de mentira", só para o payload nascer: o host de teste nunca o decodifica. */
const FAKE_PNG = 'data:image/png;base64,AAAA'

beforeEach(() => {
  clearIdbMock()
  Object.defineProperty(canvasProto, 'getContext', {
    configurable: true,
    value: () => ({ putImageData: () => undefined, drawImage: () => undefined }),
  })
  Object.defineProperty(canvasProto, 'toDataURL', { configurable: true, value: () => FAKE_PNG })
})

afterEach(() => {
  cleanup()
  if (originalGetContext) Object.defineProperty(canvasProto, 'getContext', originalGetContext)
  if (originalToDataURL) Object.defineProperty(canvasProto, 'toDataURL', originalToDataURL)
})

function harness(
  send: (asset: PintaExportedAsset) => Promise<PintaStudioResyncResult>,
  onFailure: (message?: string) => void,
) {
  const gallery = createGalleryStore()
  const first = createPixelBackgroundAsset({ name: 'fundo', width: 4, height: 4, now: 1 })
  const view = renderHook(
    ({ asset }: { asset: PintaAsset }) =>
      useStudioResync({ asset, animationId: null, frameIndex: 0, gallery, send, onFailure }),
    { initialProps: { asset: first } },
  )
  /** Salva (um asset novo) e manda o reenvio sair na hora (o `pagehide` pula a folga). */
  const saveAndFlush = (updatedAt: number): void => {
    view.rerender({ asset: { ...first, updatedAt } })
    window.dispatchEvent(new Event('pagehide'))
  }
  return { first, saveAndFlush, ...view }
}

describe('useStudioResync: o que o host responde', () => {
  it('`updated: true` acende o "Atualizado no Estúdio" e não avisa ninguém', async () => {
    const failures: Array<string | undefined> = []
    const sent: PintaExportedAsset[] = []
    const { result, saveAndFlush } = harness(
      async (asset) => {
        sent.push(asset)
        return { updated: true }
      },
      (message) => failures.push(message),
    )
    expect(result.current).toBe(false)
    saveAndFlush(2)
    await waitFor(() => expect(result.current).toBe(true))
    expect(sent).toHaveLength(1)
    expect(sent[0]?.dataUrl).toBe(FAKE_PNG)
    expect(failures).toEqual([])
  })

  it('`reason: "failed"` chama onFailure com a mensagem do host', async () => {
    const failures: Array<string | undefined> = []
    const { result, saveAndFlush } = harness(
      async () => ({ updated: false, reason: 'failed', error: 'sem espaço' }),
      (message) => failures.push(message),
    )
    saveAndFlush(2)
    await waitFor(() => expect(failures).toEqual(['sem espaço']))
    expect(result.current).toBe(false)
  })

  it('`not-linked` (o desenho ainda não está no Estúdio) fica em silêncio', async () => {
    const failures: Array<string | undefined> = []
    let calls = 0
    const { saveAndFlush } = harness(
      async () => {
        calls += 1
        return { updated: false, reason: 'not-linked' }
      },
      (message) => failures.push(message),
    )
    saveAndFlush(2)
    await waitFor(() => expect(calls).toBe(1))
    // Dá tempo de um aviso indevido aparecer antes de afirmar que não veio.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(failures).toEqual([])
  })

  it('a promise rejeitada chama onFailure sem mensagem (e os envios seguintes seguem)', async () => {
    const failures: Array<string | undefined> = []
    let calls = 0
    const { result, saveAndFlush } = harness(
      async () => {
        calls += 1
        if (calls === 1) throw new Error('ponte fora do ar')
        return { updated: true }
      },
      (message) => failures.push(message),
    )
    saveAndFlush(2)
    await waitFor(() => expect(failures).toEqual([undefined]))
    saveAndFlush(3)
    await waitFor(() => expect(result.current).toBe(true))
    expect(calls).toBe(2)
  })

  it('o que não rasteriza (ou não cabe) não sai nem avisa', async () => {
    // O canvas devolve um data URL que não é PNG: o raster vira `null` e o envio
    // nem acontece (o teto já é avisado no "Usar no Estúdio").
    Object.defineProperty(canvasProto, 'toDataURL', { configurable: true, value: () => 'data:,' })
    const failures: Array<string | undefined> = []
    let calls = 0
    const { saveAndFlush } = harness(
      async () => {
        calls += 1
        return { updated: true }
      },
      (message) => failures.push(message),
    )
    saveAndFlush(2)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(calls).toBe(0)
    expect(failures).toEqual([])
  })
})
