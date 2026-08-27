import { describe, expect, it } from 'bun:test'
import { quantizeFrames } from './quantizeFrames'

/**
 * O pior caso REAL do produto: sprite vetorial de 128 px exportado em ×4 com o
 * teto de 24 quadros — 512×512 × 24 = 6,3 M pixels — com degradê, que é o que
 * força o caminho aproximado (arte chapada cai no caminho exato e nem chega
 * aqui).
 */
function worstCaseFrames(): Uint8ClampedArray[] {
  const size = 512
  return Array.from({ length: 24 }, (_, f) => {
    const out = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const o = (y * size + x) * 4
        out[o] = (x * 255) / size
        out[o + 1] = (y * 255) / size
        out[o + 2] = ((x + y + f * 7) * 255) / (size * 2)
        out[o + 3] = x + y > 20 ? 255 : 0
      }
    }
    return out
  })
}

describe('quantizeFrames — orçamento de tempo', () => {
  /**
   * ⚠️ Teto GENEROSO de propósito. Os dois números medidos nesta máquina:
   * **7196 ms** com o histograma por cor EXATA (a primeira versão, que ordenava
   * sub-listas de centenas de milhares de entradas em cada uma das 255 divisões
   * do corte mediano) contra **82 ms** com o histograma grosso de 32768 caixas.
   * O teto fica no meio, com ~24× de folga sobre o código de hoje e ainda 3,6×
   * ABAIXO do que a versão antiga levava — então contenção de CI (a suíte roda
   * 22 pacotes juntos) não derruba isto, e voltar ao desenho antigo derruba.
   */
  it('6,3 M pixels de degradê ficam MUITO longe de congelar a aba', () => {
    const frames = worstCaseFrames()
    const started = performance.now()
    const result = quantizeFrames(frames, 256)
    const elapsed = performance.now() - started
    console.log(`[perf] pinta quantize 512x512 x24 (6,3M px): ${Math.round(elapsed)}ms`)

    expect(elapsed).toBeLessThan(2000)
    // E o resultado continua correto: cabe no formato e cobre todos os quadros.
    expect(result.approximated).toBe(true)
    expect(result.palette.length).toBeLessThanOrEqual(256)
    expect(result.frames).toHaveLength(24)
    expect(result.frames[0]).toHaveLength(512 * 512)
  })
})
