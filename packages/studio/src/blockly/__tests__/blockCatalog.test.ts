import { describe, expect, it } from 'bun:test'
import { BLOCK_CATALOG } from '../blockCatalog'

describe('BLOCK_CATALOG (picker da lista de blocos da aula)', () => {
  it('tem muitos blocos, todos com id/rótulo/categoria limpos', () => {
    expect(BLOCK_CATALOG.length).toBeGreaterThan(200)
    for (const e of BLOCK_CATALOG) {
      expect(e.type).toBeTruthy()
      expect(e.label).toBeTruthy()
      expect(e.category).toBeTruthy()
      expect(e.label, e.type).not.toBe(e.type)
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

  it('rótulos repetidos numa mesma categoria são poucos e com ids distintos (picker mostra o id)', () => {
    const byKey = new Map<string, string[]>()
    for (const e of BLOCK_CATALOG) {
      const k = `${e.category}\n${e.label}`
      byKey.set(k, [...(byKey.get(k) ?? []), e.type])
    }
    const dups = [...byKey.values()].filter((ids) => ids.length > 1)
    // Hoje só 1: "Tocar som de explosão" (2 kits do Jogo 2D). Os 4 pares do core que colidiam
    // ("de"/"Alterar para"…) ganharam rótulo amigável (LABEL_OVERRIDES) e saíram da colisão.
    // Trava p/ não floodar de ids — se crescer, melhor revisar o rótulo do que mostrar id.
    expect(dups.length).toBeLessThanOrEqual(3)
    for (const ids of dups) expect(new Set(ids).size).toBe(ids.length) // ids distintos
    const boom = byKey.get('Jogo 2D\nTocar som de explosão')
    expect(boom?.length).toBeGreaterThanOrEqual(2)
  })

  it('blocos com texto nos soquetes ganham rótulo amigável (não "de"/"Alterar para")', () => {
    const labelOf = (t: string) => BLOCK_CATALOG.find((e) => e.type === t)?.label
    expect(labelOf('sz_math_function')).toBe('Função matemática (arredondar, raiz, absoluto…)')
    expect(labelOf('sz_js_set_property_text')).toBe('Alterar uma propriedade (escrever um texto)')
    // Os pares valor/comando ficam DISTINTOS (não colidem mais → sem id ao lado).
    expect(labelOf('sz_val_method_on')).not.toBe(labelOf('sz_js_method_on'))
    // Consumidores legados continuam registrados para projetos salvos, mas não
    // aparecem no catálogo da aula (foram substituídos pelos blocos de Objetos).
    expect(labelOf('sz_js_call_method')).toBeUndefined()
    expect(labelOf('sz_val_call_method')).toBeUndefined()
    expect(labelOf('sz_js_try_catch')).toBe('Tentar, tratar erro e finalizar')
    expect(labelOf('sz_canvas_anim_loop')).toBe('A cada quadro da animação')
    expect(labelOf('sz_t3d_set_visible')).toBe('Mostrar ou esconder objeto 3D')
  })

  it('explica os blocos SVG sem expor uma lista de atributos', () => {
    const labelOf = (type: string) => BLOCK_CATALOG.find((entry) => entry.type === type)?.label
    expect(labelOf('sz_html_svg')).toBe('Criar uma área de desenho vetorial')
    expect(labelOf('sz_svg_circle')).toBe('Desenhar um círculo')
    expect(labelOf('sz_svg_use')).toBe('Reutilizar uma forma pelo nome')
  })
})
