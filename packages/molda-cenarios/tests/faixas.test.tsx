import { describe, expect, test } from 'bun:test'
import { familiasDasFaixas } from '@sistemazero/molda-cenarios-core/v2'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  FerramentasDaOficina,
  FerramentasPorVir,
  lerAcessoAsFerramentas,
} from '../src/oficina/faixas'

const basico = {
  allow: familiasDasFaixas(['basic']),
  upcoming: [
    {
      when: 'Abrem no nível Arquiteto(a) de Mundos',
      families: familiasDasFaixas(['intermediate']),
    },
    { when: 'E tem muito mais pela frente', families: familiasDasFaixas(['professional']) },
  ],
}

describe('faixas na tela da oficina', () => {
  test('sem acesso do host, tudo liberado e nada por vir', () => {
    const tudo = lerAcessoAsFerramentas(undefined)
    expect(tudo.restrito).toBe(false)
    expect(tudo.pode('jogo.cameras')).toBe(true)
    expect(tudo.porVir('jogo')).toEqual([])
  })

  test('a lista do host é fechada e o que vem depois é agrupado por aba', () => {
    const leitor = lerAcessoAsFerramentas(basico)
    expect(leitor.pode('agua.mar-e-lago')).toBe(true)
    expect(leitor.pode('agua.rio-represa-cachoeira')).toBe(false)
    expect(leitor.porVir('agua').map((g) => [g.quando, g.familias.map((f) => f.id)])).toEqual([
      ['Abrem no nível Arquiteto(a) de Mundos', ['agua.rio-represa-cachoeira']],
      ['E tem muito mais pela frente', ['agua.aparencia']],
    ])
    // Família liberada nunca aparece como "por vir", mesmo que o host a anuncie.
    const anunciada = lerAcessoAsFerramentas({
      allow: ['agua.mar-e-lago', 'agua.rio-represa-cachoeira'],
      upcoming: [{ when: 'Depois', families: ['agua.rio-represa-cachoeira', 'id-desconhecido'] }],
    })
    expect(anunciada.porVir('agua')).toEqual([])
  })

  test('a linha "Ferramentas que vêm por aí" some sem nada trancado na aba', () => {
    const comTrava = renderToStaticMarkup(
      <FerramentasDaOficina acesso={basico}>
        <FerramentasPorVir aba="luz" />
      </FerramentasDaOficina>,
    )
    expect(comTrava).toContain('Ferramentas que vêm por aí')
    expect(comTrava).toContain('Sol e luz ambiente')
    expect(comTrava).toContain('Abrem no nível Arquiteto(a) de Mundos')
    const semTrava = renderToStaticMarkup(
      <FerramentasDaOficina acesso={undefined}>
        <FerramentasPorVir aba="luz" />
      </FerramentasDaOficina>,
    )
    expect(semTrava).toBe('')
  })
})
