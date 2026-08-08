import { describe, expect, it } from 'bun:test'
import { palettePathOf } from '../paletteMap'
import { groupSearchResultsByPalette } from '../searchCategory'

/**
 * Cabeçalhos de "categoria › subcategoria" nos resultados da busca.
 *
 * Pedido da dona do produto: achar o bloco pela busca resolve o problema de
 * agora; ver ONDE ele mora resolve o da próxima vez.
 */

const bloco = (type: string) => ({ kind: 'block', type })
const rotulos = (itens: { kind: string; text?: string }[]) =>
  itens.filter((i) => i.kind === 'label').map((i) => i.text)

describe('agrupar os resultados da busca', () => {
  it('põe um cabeçalho com o caminho REAL da paleta antes de cada grupo', () => {
    // Dois blocos que moram na MESMA subcategoria do Jogo 2D.
    const caminho = palettePathOf('sz_g2d_animate_sprite')
    expect(caminho.length).toBeGreaterThan(1) // sanidade: o mapa conhece o bloco

    const saida = groupSearchResultsByPalette([
      bloco('sz_g2d_animate_sprite'),
      bloco('sz_g2d_animate_once'),
    ])
    expect(saida[0]).toEqual({ kind: 'label', text: caminho.join(' › ') })
    expect(rotulos(saida)).toHaveLength(1) // um cabeçalho só: é o mesmo grupo
    expect(saida.filter((i) => i.kind === 'block')).toHaveLength(2)
  })

  it('⭐ a ordem dos grupos é a da RELEVÂNCIA, não alfabética', () => {
    // A criança digitou uma palavra: o primeiro grupo tem que ser o que ela quis.
    // "Jogo 2D" vem antes de "Programação" no alfabeto, então invertemos a
    // entrada de propósito — se o código ordenasse por nome, isto reprovaria.
    const primeiro = palettePathOf('sz_js_var_declare').join(' › ')
    const segundo = palettePathOf('sz_g2d_animate_sprite').join(' › ')
    expect(primeiro).not.toBe(segundo)

    const saida = groupSearchResultsByPalette([
      bloco('sz_js_var_declare'),
      bloco('sz_g2d_animate_sprite'),
    ])
    expect(rotulos(saida)).toEqual([primeiro, segundo])
  })

  it('não perde nem duplica bloco nenhum', () => {
    const entrada = [
      bloco('sz_g2d_animate_sprite'),
      bloco('sz_js_var_declare'),
      bloco('sz_g2d_animate_once'),
    ]
    const blocos = groupSearchResultsByPalette(entrada).filter((i) => i.kind === 'block')
    expect(blocos).toHaveLength(entrada.length)
    expect(new Set(blocos.map((b) => (b as { type?: string }).type)).size).toBe(entrada.length)
  })

  it('bloco fora de qualquer paleta não some — vai para "Outros blocos", no FIM', () => {
    // Deriva do mapa de paletas não pode engolir um resultado da busca.
    const saida = groupSearchResultsByPalette([
      bloco('bloco_que_nao_existe_em_paleta'),
      bloco('sz_g2d_animate_sprite'),
    ])
    const texto = rotulos(saida)
    expect(texto).toHaveLength(2)
    expect(texto.at(-1)).toBe('Outros blocos')
    expect(saida.at(-1)).toEqual(bloco('bloco_que_nao_existe_em_paleta'))
  })

  it('lista vazia continua vazia (o estado "Nada encontrado" é de quem chama)', () => {
    expect(groupSearchResultsByPalette([])).toEqual([])
  })

  it('nenhum cabeçalho usa travessão (contrato de copy da casa)', () => {
    const todos = ['sz_g2d_animate_sprite', 'sz_js_var_declare', 'sz_g3d_create_box']
    for (const texto of rotulos(groupSearchResultsByPalette(todos.map(bloco)))) {
      expect(texto, texto).not.toMatch(/[—–]/u)
    }
  })
})
