import { expect, test } from 'bun:test'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import { renderToStaticMarkup } from 'react-dom/server'
import { CamposDoArquipelago } from '../src/oficina/telas/CamposDoArquipelago'
import { agruparAvisos, Implantacao } from '../src/oficina/telas/Implantacao'

test('os avisos saem agrupados na ordem de gravidade, o que impede o jogo primeiro', () => {
  const grupos = agruparAvisos([
    { id: 'a', tipo: 'flutuando', mensagem: 'Flutua 0,4 m' },
    { id: 'b', tipo: 'ator-repetido', mensagem: 'Duas Íris' },
    { id: 'c', tipo: 'flutuando', mensagem: 'Flutua 0,2 m' },
  ])
  expect(grupos.map((g) => [g.tipo, g.avisos.length])).toEqual([
    ['ator-repetido', 1],
    ['flutuando', 2],
  ])
})

test('cenário sem nada fora do lugar mostra que está tudo assentado', () => {
  const html = renderToStaticMarkup(
    <Implantacao
      documento={criarDocumentoVazio('11111111-1111-4111-8111-111111111111', 'Praça')}
      fonte={() => 0}
      nomeDe={() => 'Objeto'}
      aoMostrar={() => {}}
      aoEscolherTodos={() => {}}
      aoFechar={() => {}}
    />,
  )
  expect(html).toContain('Tudo assentado')
})

test('os campos do Arquipélago mostram o que o objeto já tem e avisam o que o jogo recusaria', () => {
  const tronco = renderToStaticMarkup(
    <CamposDoArquipelago
      propriedades={{ 'arquipelago.fisica': 'tronco', 'arquipelago.raioDoTronco': 0.3 }}
      aoGuardar={() => {}}
    />,
  )
  expect(tronco).toContain('Raio do tronco')
  expect(tronco).toContain('open=""')
  const placaQuebrada = renderToStaticMarkup(
    <CamposDoArquipelago
      propriedades={{ 'arquipelago.sinal.texto': 'Horta' }}
      aoGuardar={() => {}}
    />,
  )
  expect(placaQuebrada).toContain('role="alert"')
  const vazio = renderToStaticMarkup(<CamposDoArquipelago propriedades={{}} aoGuardar={() => {}} />)
  expect(vazio).not.toContain('open=""')
  expect(vazio).not.toContain('role="alert"')
})
