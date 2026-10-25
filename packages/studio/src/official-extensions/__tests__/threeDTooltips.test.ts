import { describe, expect, it } from 'bun:test'
import { gameThreeDBlocks } from '../game-3d/blocks'
import { gameKit3DBlocks } from '../game-3d-advanced/blocks'
import { world3DBlocks } from '../world-3d/blocks'

/**
 * Review 3D (10/2026): tooltip de bloco 3D cabe em 220 caracteres. A dica aparece por cima
 * da paleta e a criança lê no máximo duas frases; o que passa disso vai para o manual.
 *
 * A lista de pendências zerou no lote 11 (o Avançado era o último): agora NENHUM bloco das
 * três extensões passa do teto. Um bloco novo comprido falha na hora; encurte a dica (o
 * detalhe vai para o manual), nunca afrouxe o teto.
 */
const MAX_TOOLTIP = 220

const PENDENCIAS: readonly string[] = []

const BLOCKS = [...gameThreeDBlocks, ...world3DBlocks, ...gameKit3DBlocks] as readonly {
  type: string
  tooltip?: unknown
}[]

describe('extensões 3D: tooltips curtos', () => {
  it(`todo bloco sz_g3d_/sz_w3d_/sz_g3k_ tem tooltip de até ${MAX_TOOLTIP} caracteres`, () => {
    const semTexto = BLOCKS.filter((block) => typeof block.tooltip !== 'string').map((b) => b.type)
    const compridos = BLOCKS.filter(
      (block) => typeof block.tooltip === 'string' && block.tooltip.length > MAX_TOOLTIP,
    ).map((block) => block.type)
    expect(semTexto).toEqual([])
    expect([...compridos].sort()).toEqual([...PENDENCIAS].sort())
  })

  it('a varredura olha as três extensões', () => {
    for (const prefix of ['sz_g3d_', 'sz_w3d_', 'sz_g3k_']) {
      expect(BLOCKS.filter((block) => block.type.startsWith(prefix)).length).toBeGreaterThan(100)
    }
  })
})
