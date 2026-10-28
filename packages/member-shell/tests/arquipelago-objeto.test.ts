import { describe, expect, test } from 'bun:test'
import { CATALOGO_DE_OBJETOS, planificacaoDoMolde } from '@sistemazero/arquipelago-contracts'
import {
  caixaDoMolda,
  lerPedidoDeObjeto,
  telaDoPinta,
  UNIDADES_DO_MOLDA_POR_CELULA,
} from '../src/lib/arquipelago-objeto'

const geladeira = CATALOGO_DE_OBJETOS.geladeira.molde

describe('a ponte do molde de objeto (projeto azul)', () => {
  test('Pinta: a tela é a planificação do contrato, com a frente marcada', () => {
    const tela = telaDoPinta(geladeira)
    const planificacao = planificacaoDoMolde(geladeira)
    if (!tela || !planificacao) throw new Error('a geladeira tem faces')
    expect(tela.name).toBe('molde-geladeira')
    expect([tela.width, tela.height]).toEqual([planificacao.largura, planificacao.altura])
    expect(tela.guide).toHaveLength(4)
    expect(tela.guide.filter((r) => r.marked)).toEqual([
      expect.objectContaining({ width: planificacao.faces.find((f) => f.frente)?.largura }),
    ])
  })

  test('Pinta: objeto sem faces não abre (o modelo ainda não tem)', () => {
    expect(telaDoPinta(CATALOGO_DE_OBJETOS.forno.molde)).toBeNull()
  })

  test('Molda: a caixa na proporção do molde, 16 por célula quando cabe', () => {
    const { name, box } = caixaDoMolda(geladeira)
    expect(name).toBe('molde-geladeira')
    expect(box.name).toBe('Geladeira')
    expect(box.width).toBeCloseTo(0.82 * UNIDADES_DO_MOLDA_POR_CELULA)
    expect(box.height).toBeCloseTo(1.75 * UNIDADES_DO_MOLDA_POR_CELULA)
  })

  test('Molda: objeto largo encolhe para caber na grade, sem perder a proporção', () => {
    const { box } = caixaDoMolda(CATALOGO_DE_OBJETOS.banda.molde)
    expect(box.width).toBeCloseTo(30)
    expect(box.depth / box.width).toBeCloseTo(1.56 / 2.85)
    expect(box.height / box.width).toBeCloseTo(1.28 / 2.85)
  })

  test('lê o pedido do jogo: objeto abre Pinta e Molda; o resto segue o caminho de sempre', () => {
    expect(lerPedidoDeObjeto({ ferramenta: 'pinta', proposito: 'criar no Arquipélago' })).toBeNull()
    expect(
      lerPedidoDeObjeto({
        ferramenta: 'estudio',
        proposito: 'desafio',
        molde: { tipo: 'desafio' },
      }),
    ).toBeNull()
    const pinta = lerPedidoDeObjeto({ ferramenta: 'pinta', proposito: 'objeto', molde: geladeira })
    expect(pinta && 'tela' in pinta ? pinta.tela.name : null).toBe('molde-geladeira')
    const molda = lerPedidoDeObjeto({ ferramenta: 'molda', proposito: 'objeto', molde: geladeira })
    expect(molda && 'caixa' in molda ? molda.caixa.name : null).toBe('molde-geladeira')
    expect(
      lerPedidoDeObjeto({
        ferramenta: 'pinta',
        proposito: 'objeto',
        molde: CATALOGO_DE_OBJETOS.forno.molde,
      }),
    ).toEqual({ recusa: 'sem-faces' })
    expect(
      lerPedidoDeObjeto({ ferramenta: 'estudio', proposito: 'objeto', molde: geladeira }),
    ).toEqual({ recusa: 'em-breve' })
    expect(
      lerPedidoDeObjeto({ ferramenta: 'pinta', proposito: 'objeto', molde: { tipo: 'objeto' } }),
    ).toEqual({ recusa: 'molde-invalido' })
  })
})
