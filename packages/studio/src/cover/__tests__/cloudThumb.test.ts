import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { buildCloudThumb, CLOUD_THUMB_MAX_CHARS, resetCloudThumbCacheForTests } from '../cloudThumb'

/**
 * A miniatura que viaja na nuvem tem teto de 12 000 caracteres (o índice do members descarta
 * acima disso, sem erro). O happy-dom não tem canvas, então a redução é provada com um canvas
 * de mentira que devolve strings do tamanho que a "qualidade" pede.
 */
const GRANDE = `data:image/jpeg;base64,${'x'.repeat(20_000)}`

describe('buildCloudThumb', () => {
  beforeEach(() => resetCloudThumbCacheForTests())

  it('uma capa que já cabe passa direto', async () => {
    const pequena = `data:image/jpeg;base64,${'x'.repeat(100)}`
    expect(await buildCloudThumb(pequena)).toBe(pequena)
  })

  it('o que não é imagem é recusado', async () => {
    expect(await buildCloudThumb('data:text/plain,oi')).toBeNull()
  })

  it('sem canvas (happy-dom) devolve null em vez de mentir', async () => {
    expect(await buildCloudThumb(GRANDE)).toBeNull()
  })

  describe('com um canvas de mentira', () => {
    const originalCreate = document.createElement.bind(document)
    const OriginalImage = globalThis.Image
    /** Cada `toDataURL` devolve um data URL cujo tamanho é largura × qualidade × fator. */
    let fator = 100
    /** A imagem de mentira decodifica (`true`) ou fica muda para sempre (`false`). */
    let carrega = true
    const pedidos: Array<{ width: number; quality: number }> = []

    beforeEach(() => {
      pedidos.length = 0
      carrega = true
      const doc = document as unknown as { createElement: typeof document.createElement }
      doc.createElement = ((tag: string, ...rest: unknown[]) => {
        if (tag !== 'canvas') return originalCreate(tag, ...(rest as []))
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({ fillStyle: '', fillRect: () => {}, drawImage: () => {} }),
          toDataURL: (_type: string, quality: number) => {
            pedidos.push({ width: canvas.width, quality })
            return `data:image/jpeg;base64,${'y'.repeat(Math.round(canvas.width * quality * fator))}`
          },
        }
        return canvas as unknown as HTMLElement
      }) as typeof document.createElement
      class FakeImage {
        width = 320
        height = 192
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(_value: string) {
          if (carrega) queueMicrotask(() => this.onload?.())
        }
      }
      globalThis.Image = FakeImage as unknown as typeof Image
    })

    afterEach(() => {
      const doc = document as unknown as { createElement: typeof document.createElement }
      doc.createElement = originalCreate
      globalThis.Image = OriginalImage
    })

    it('desce a escada até a primeira combinação que cabe no teto', async () => {
      // 240 × 0,6 × 100 = 14 400 (não cabe); 240 × 0,45 × 100 = 10 800 (cabe).
      fator = 100
      const out = await buildCloudThumb(GRANDE)
      expect(out?.length ?? 0).toBeLessThanOrEqual(CLOUD_THUMB_MAX_CHARS)
      expect(pedidos.map((p) => `${p.width}@${p.quality}`)).toEqual(['240@0.6', '240@0.45'])
    })

    it('quando nem o último degrau cabe, devolve null (o servidor descartaria igual)', async () => {
      fator = 1_000
      expect(await buildCloudThumb(GRANDE)).toBeNull()
      expect(pedidos.length).toBe(4)
    })

    it('respeita um teto menor pedido pelo chamador', async () => {
      fator = 10
      // Com o prefixo de 23 chars: 240 × 0,6 × 10 = 1 463; 240 × 0,45 × 10 = 1 103; 200 × 0,5 × 10
      // = 1 023 (ainda não cabe); 160 × 0,5 × 10 = 823 cabe.
      const out = await buildCloudThumb(GRANDE, 1_000)
      expect(out?.length).toBe('data:image/jpeg;base64,'.length + 800)
      expect(pedidos.length).toBe(4)
    })

    it('a mesma fonte não é reduzida duas vezes (cache de tamanho 1)', async () => {
      fator = 100
      await buildCloudThumb(GRANDE)
      const antes = pedidos.length
      await buildCloudThumb(GRANDE)
      expect(pedidos.length).toBe(antes)
    })

    it('B6: uma imagem que nunca decodifica devolve null dentro do prazo, em vez de pendurar a subida', async () => {
      carrega = false
      const inicio = Date.now()
      expect(await buildCloudThumb(GRANDE, undefined, { loadTimeoutMs: 20 })).toBeNull()
      expect(Date.now() - inicio).toBeLessThan(1_000)
      expect(pedidos).toEqual([])
    })

    it('B6: o null NÃO gruda no cache: a próxima chamada com a mesma fonte tenta de novo', async () => {
      fator = 1_000
      expect(await buildCloudThumb(GRANDE)).toBeNull()
      // A mesma fonte, agora com a redução cabendo: sem o cache do null, ela sai.
      fator = 100
      const out = await buildCloudThumb(GRANDE)
      expect(out).not.toBeNull()
      expect(out?.length ?? 0).toBeLessThanOrEqual(CLOUD_THUMB_MAX_CHARS)
    })
  })
})
