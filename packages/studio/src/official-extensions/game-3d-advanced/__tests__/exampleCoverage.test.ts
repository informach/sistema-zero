import { describe, expect, it } from 'bun:test'
import { SERVER_EXAMPLES_INDEX } from '../../../examples/__gen_serverExamplesIndex'
import { gameKit3DBlocks } from '../blocks'

/**
 * COBERTURA TOTAL da vitrine do Jogo 3D Avançado: todo bloco visível da paleta aparece em pelo
 * menos um exemplo, porque é nos exemplos que a criança vê o bloco funcionando dentro de um jogo.
 *
 * Até o lote 12 havia uma lista ACEITA de 27 blocos sem exemplo (som, céu 360°, jorro na mão,
 * ímã das faíscas, câmera por ponto, frear, cair, atravessar paredes, tocar/parar animação na
 * mão...). A cobertura fechou com a "Noite das Fogueiras" (os ARQUIVOS do projeto: céu de foto,
 * música e som, montados por código em `exampleAssets.ts`) e com encaixes nos exemplos em que
 * o bloco já fazia sentido (Salto nas Nuvens, Guardião do Portal, O Chefão das Sombras, Herói
 * do Molda, Reunir o Rebanho e A Lenda do Herói).
 *
 * Bloco novo sem exemplo reprova aqui: ponha-o num exemplo em que ele faça sentido.
 */

describe('g3k — todo bloco da paleta aparece num exemplo', () => {
  it('nenhum bloco visível fica sem exemplo', () => {
    const used = new Set<string>()
    let examples = 0
    for (const entry of SERVER_EXAMPLES_INDEX) {
      if (!entry.key.startsWith('game-3d-advanced:')) continue
      examples++
      for (const type of entry.blockTypes) used.add(type)
    }
    // Anti-vácuo: o índice gerado tem o catálogo inteiro (rode gen:server-examples).
    expect(examples).toBe(20)
    const visible = gameKit3DBlocks.filter((block) => !block.hidden).map((block) => block.type)
    expect(visible.length).toBeGreaterThan(140)
    expect(visible.filter((type) => !used.has(type))).toEqual([])
  })
})
