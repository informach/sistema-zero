import { describe, expect, it } from 'bun:test'
import { sortLegacyTopBlocks as sortTopBlocksReadingOrder } from '../../project-migrations/readingOrder'

/** A conversão ordena a geometria serializada antes de criar as áreas atuais. */
function fakeBlock(id: string, x: number, y: number) {
  return { id, x, y }
}

const ids = (blocks: { id: string }[]): string[] => blocks.map((b) => b.id)

describe('sortTopBlocksReadingOrder', () => {
  it('ordena colunas da esquerda para a direita', () => {
    // Duas colunas lado a lado, topos alinhados.
    const result = sortTopBlocksReadingOrder([fakeBlock('dir', 872, 32), fakeBlock('esq', 452, 32)])
    expect(ids(result)).toEqual(['esq', 'dir'])
  })

  it('dentro da mesma coluna, ordena de cima para baixo', () => {
    const result = sortTopBlocksReadingOrder([
      fakeBlock('baixo', 452, 300),
      fakeBlock('cima', 452, 40),
    ])
    expect(ids(result)).toEqual(['cima', 'baixo'])
  })

  it('coluna da esquerda vem primeiro mesmo se estiver mais embaixo (não é ordem por Y)', () => {
    // 'esq' está mais baixo (y=300) que 'dir' (y=32), mas é a coluna da esquerda.
    const result = sortTopBlocksReadingOrder([
      fakeBlock('dir', 872, 32),
      fakeBlock('esq', 452, 300),
    ])
    expect(ids(result)).toEqual(['esq', 'dir'])
  })

  it('agrupa por coluna com tolerância e ordena cada coluna por Y', () => {
    // Coluna A (x~452): a2 acima de a1. Coluna B (x~872): b1.
    const result = sortTopBlocksReadingOrder([
      fakeBlock('a1', 452, 200),
      fakeBlock('b1', 872, 50),
      fakeBlock('a2', 470, 40), // mesmo "bloco-coluna" de a1 (dentro da tolerância)
    ])
    expect(ids(result)).toEqual(['a2', 'a1', 'b1'])
  })

  it('fallback: sem geometria (headless) mantém a ordem original', () => {
    const tops: { id: string; x?: number; y?: number }[] = [{ id: 'x' }, { id: 'y' }]
    expect(sortTopBlocksReadingOrder(tops)).toBe(tops)
  })
})
