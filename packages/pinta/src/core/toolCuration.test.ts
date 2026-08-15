import { describe, expect, it } from 'bun:test'
import { filterTools, isToolAllowed, PINTA_TOOL_PRESETS, toolFallback } from './toolCuration'

const CAIXA_PIXEL = [
  { id: 'pencil' },
  { id: 'eraser' },
  { id: 'fill' },
  { id: 'recolor' },
  { id: 'select' },
  { id: 'line' },
  { id: 'rect' },
  { id: 'ellipse' },
  { id: 'picker' },
  { id: 'grid' },
  { id: 'rotate' },
]

const CAIXA_VETOR = [
  { id: 'select' },
  { id: 'reshape' },
  { id: 'pan' },
  { id: 'brush' },
  { id: 'pen' },
  { id: 'text' },
  { id: 'picker' },
]

describe('curadoria da caixa de ferramentas', () => {
  it('sem lista, ou com lista vazia, nada é escondido', () => {
    // O Pinta solto nunca cura: o default tem que ser "mostra tudo".
    expect(filterTools(CAIXA_PIXEL, undefined)).toHaveLength(CAIXA_PIXEL.length)
    expect(filterTools(CAIXA_PIXEL, [])).toHaveLength(CAIXA_PIXEL.length)
    expect(isToolAllowed(undefined, 'qualquer')).toBe(true)
    expect(isToolAllowed([], 'qualquer')).toBe(true)
  })

  it('lista não-vazia é RESTRITIVA e preserva a ordem da caixa', () => {
    // Ordem importa: a criança aprende onde cada coisa fica.
    expect(filterTools(CAIXA_PIXEL, ['picker', 'pencil']).map((t) => t.id)).toEqual([
      'pencil',
      'picker',
    ])
  })

  it('id que o editor não conhece é ignorado, não quebra', () => {
    // É o que deixa UM preset servir os três editores.
    expect(filterTools(CAIXA_VETOR, ['pen', 'pencil', 'inexistente']).map((t) => t.id)).toEqual([
      'pen',
    ])
  })

  describe('⭐ um preset serve os três editores', () => {
    it('"essencial" deixa cada caixa desenhável', () => {
      const pixel = filterTools(CAIXA_PIXEL, PINTA_TOOL_PRESETS.essencial).map((t) => t.id)
      const vetor = filterTools(CAIXA_VETOR, PINTA_TOOL_PRESETS.essencial).map((t) => t.id)
      // O pixel desenha com lápis; o vetor, com pincel e caneta. Os dois têm com o que pintar.
      expect(pixel).toContain('pencil')
      expect(vetor).toContain('brush')
      expect(vetor).toContain('pen')
      // E os dois escondem de fato alguma coisa (anti-vácuo: preset que não corta nada é inútil).
      expect(pixel.length).toBeLessThan(CAIXA_PIXEL.length)
      expect(vetor.length).toBeLessThan(CAIXA_VETOR.length)
    })

    it('"livre" mostra mais que "essencial" e ainda esconde as ações do quadro', () => {
      const essencial = filterTools(CAIXA_PIXEL, PINTA_TOOL_PRESETS.essencial)
      const livre = filterTools(CAIXA_PIXEL, PINTA_TOOL_PRESETS.livre)
      expect(livre.length).toBeGreaterThan(essencial.length)
      expect(livre.map((t) => t.id)).toContain('rect')
      expect(livre.map((t) => t.id)).not.toContain('rotate')
    })
  })

  describe('🚨 ferramenta ativa cortada não pode virar estado impossível', () => {
    it('cai na primeira permitida quando a atual é escondida', () => {
      // Sem isto a criança fica com uma ferramenta selecionada que não está na tela.
      expect(toolFallback('rect', CAIXA_PIXEL, ['pencil', 'eraser'])).toBe('pencil')
    })

    it('devolve null quando a atual continua permitida (não mexe à toa)', () => {
      expect(toolFallback('pencil', CAIXA_PIXEL, ['pencil', 'eraser'])).toBeNull()
      expect(toolFallback('rect', CAIXA_PIXEL, undefined)).toBeNull()
    })

    it('devolve null quando NADA sobrou (não inventa id)', () => {
      // Caixa vazia é erro de autoria; trocar para um id inexistente seria pior que não trocar.
      expect(toolFallback('rect', CAIXA_PIXEL, ['so-existe-no-vetor'])).toBeNull()
    })
  })
})
