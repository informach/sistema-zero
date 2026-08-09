import { describe, expect, it } from 'bun:test'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { SERVER_MECHANIC_DOCUMENTS } from '../../official-extensions/serverKnowledge'
import { BLOCK_CATALOG, SERVER_BLOCK_CATALOG } from '../blockCatalog'

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

  it('inclui as Áreas do projeto, para a aula poder escolher quais a criança recebe', () => {
    const areas = BLOCK_CATALOG.filter((e) => e.type.startsWith('sz_frame_'))
    expect(areas.map((e) => e.type).sort()).toEqual([
      'sz_frame_appearance',
      'sz_frame_events',
      'sz_frame_loops',
      'sz_frame_molds',
      'sz_frame_start',
      'sz_frame_structure',
    ])
    // Todas sob a mesma categoria que a criança vê na paleta.
    expect([...new Set(areas.map((e) => e.category))]).toEqual(['🗂️ Áreas do projeto'])
    // ⚠️ A moldura LEGADA de migração é `hidden` e não pode vazar para o picker.
    expect(BLOCK_CATALOG.some((e) => e.type === 'sz_frame_behavior')).toBe(false)
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

  it('catálogo server-safe cobre cada bloco visível com metadados autoritativos', () => {
    expect(SERVER_BLOCK_CATALOG).toHaveLength(BLOCK_CATALOG.length)
    const byType = new Map(SERVER_BLOCK_CATALOG.map((entry) => [entry.type, entry]))
    expect(byType.size).toBe(SERVER_BLOCK_CATALOG.length)
    for (const visible of BLOCK_CATALOG) {
      const server = byType.get(visible.type)
      expect(server, visible.type).toBeDefined()
      expect(server?.label).toBe(visible.label)
      expect(server?.category).toBe(visible.category)
      expect(server?.subcategory).toBeTruthy()
      expect(server?.level).toMatch(/^(iniciante|intermediario|avancado)-(2d|3d)$/)
      expect(server?.area).toMatch(/^(structure|appearance|molds|start|events|loops|value)$/)
      expect(Array.isArray(server?.inputs)).toBe(true)
    }
  })

  it('inclui os blocos das extensões (Jogo 2D/3D)', () => {
    const sprite = BLOCK_CATALOG.find((e) => e.type === 'sz_g2d_create_sprite')
    expect(sprite?.category).toBe('Jogo 2D')
    expect(BLOCK_CATALOG.some((e) => e.category === 'Jogo 3D')).toBe(true)
    expect(
      SERVER_BLOCK_CATALOG.filter((entry) => entry.extension).some(
        (entry) => entry.subcategory !== entry.category,
      ),
    ).toBe(true)
  })

  it('classifica leitores contextuais junto de Página e Eventos', () => {
    for (const type of ['sz_val_event_key', 'sz_val_event_pos']) {
      expect(BLOCK_CATALOG.find((entry) => entry.type === type)?.category, type).toBe(
        'Página e Eventos',
      )
    }
  })

  it('inclui exatamente uma vez cada bloco visível de toda extensão oficial', () => {
    for (const extension of OFFICIAL_CATALOG) {
      for (const block of extension.blockly.blocks.filter((definition) => !definition.hidden)) {
        expect(
          BLOCK_CATALOG.filter((entry) => entry.type === block.type),
          `${extension.manifest.id}: ${block.type}`,
        ).toHaveLength(1)
      }
    }
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

  it('tem um manual server-safe para cada extensão oficial do catálogo', () => {
    const extensions = new Set(
      SERVER_BLOCK_CATALOG.flatMap((entry) => (entry.extension ? [entry.extension] : [])),
    )
    const documents = new Map(
      SERVER_MECHANIC_DOCUMENTS.map((document) => [document.extension, document]),
    )

    expect([...documents.keys()].sort()).toEqual([...extensions].sort())
    for (const extension of extensions) {
      const document = documents.get(extension)
      expect(document?.title.length).toBeGreaterThan(10)
      expect(document?.content.length).toBeGreaterThan(200)
    }
  })
})
