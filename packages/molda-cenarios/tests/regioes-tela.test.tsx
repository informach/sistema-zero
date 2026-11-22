import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  type DocumentoDeCenario,
  type RegiaoDeCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import { renderToStaticMarkup } from 'react-dom/server'
import { Regioes } from '../src/oficina/telas/Regioes'
import type { useRegioes } from '../src/oficina/useRegioes'

/**
 * O painel da ferramenta Regiões (lote 7 da conclusão, 22/11/2026): a lista com medidas e
 * vizinhas, o editor com as vizinhas que encostam e os recados que impedem guardar.
 */

const vila: RegiaoDeCenario = {
  id: 'vila',
  nome: 'Vila',
  caixa: { x0: -32, z0: -32, x1: 0, z1: 32 },
  vizinhas: ['floresta'],
}
const floresta: RegiaoDeCenario = {
  id: 'floresta',
  nome: 'Floresta',
  caixa: { x0: 0, z0: -32, x1: 32, z1: 0 },
  vizinhas: ['vila'],
}
const doc: DocumentoDeCenario = {
  ...criarDocumentoVazio('ilha', 'Ilha'),
  base: { tipo: 'plano', largura: 64, comprimento: 64 },
  regioes: [vila, floresta],
}

type Hook = ReturnType<typeof useRegioes>
const hook = (extra: Partial<Hook> = {}): Hook =>
  ({
    rascunho: null,
    previa: null,
    preparando: false,
    aplicando: false,
    erro: null,
    mensagem: null,
    criando: false,
    movendoCantos: false,
    mudar: () => true,
    cancelar: () => {},
    iniciarCriacao: () => {},
    editar: () => {},
    moverCantos: () => {},
    preparar: async () => true,
    aplicar: async () => true,
    apagar: () => true,
    ...extra,
  }) as unknown as Hook

const render = (t: Hook) =>
  renderToStaticMarkup(
    <Regioes regioes={t} documento={doc} indisponivel={false} aoCapturar={() => {}} />,
  )

test('a lista mostra cada região com as medidas e as vizinhas', () => {
  const html = render(hook())
  expect(html).toContain('Nova região')
  expect(html).toContain('Vila')
  expect(html).toContain('32 m por 64 m')
  expect(html).toContain('vizinha de Floresta')
  expect(html).not.toContain('—')
})

test('criando, o painel diz o que fazer no chão', () => {
  expect(render(hook({ criando: true }))).toContain('Toque em dois cantos opostos')
})

test('o editor sugere a vizinha que encosta e mostra o que impede guardar', () => {
  const lago: RegiaoDeCenario = {
    id: 'lago',
    nome: 'Floresta',
    caixa: { x0: 0, z0: 0, x1: 20, z1: 20 },
    vizinhas: [],
  }
  const html = render(hook({ rascunho: lago }))
  expect(html).toContain('Nova região')
  expect(html).toContain('Vila (encosta nesta)')
  expect(html).toContain('Já existe uma região chamada Floresta.')
  // Com problema, a prévia fica desligada.
  expect(html).toMatch(/disabled=""[^>]*>Ver prévia da região/)
})

test('editar uma região que existe oferece apagar', () => {
  const html = render(hook({ rascunho: vila }))
  expect(html).toContain('Editar região')
  expect(html).toContain('Apagar região')
  expect(html).not.toContain('O que falta acertar')
})
