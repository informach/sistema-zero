import { describe, expect, it } from 'bun:test'
import { BLOCK_CATALOG } from '../blockCatalog'

describe('BLOCK_CATALOG (picker da lista de blocos da aula)', () => {
  it('tem muitos blocos, todos com id/rótulo/categoria limpos', () => {
    expect(BLOCK_CATALOG.length).toBeGreaterThan(200)
    for (const e of BLOCK_CATALOG) {
      expect(e.type).toBeTruthy()
      expect(e.label).toBeTruthy()
      expect(e.category).toBeTruthy()
      // Nenhum placeholder de argumento (%1, %2…) vazou pro rótulo (um `%` literal de
      // porcentagem é texto válido e pode ficar).
      expect(e.label).not.toMatch(/%\d/)
    }
  })

  it('NÃO inclui as Áreas do projeto (frames — sempre visíveis)', () => {
    expect(BLOCK_CATALOG.some((e) => e.type.startsWith('sz_frame_'))).toBe(false)
  })

  it('o rótulo vem do texto do bloco (ex.: sz_html_h1)', () => {
    const h1 = BLOCK_CATALOG.find((e) => e.type === 'sz_html_h1')
    expect(h1?.label).toBe('Criar título com texto')
    expect(h1?.category).toBe('HTML')
  })

  it('ids únicos (sem bloco duplicado entre categorias)', () => {
    const ids = BLOCK_CATALOG.map((e) => e.type)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('inclui os blocos das extensões (Jogo 2D/3D)', () => {
    const sprite = BLOCK_CATALOG.find((e) => e.type === 'sz_g2d_create_sprite')
    expect(sprite?.category).toBe('Jogo 2D')
    expect(BLOCK_CATALOG.some((e) => e.category === 'Jogo 3D')).toBe(true)
  })
})
