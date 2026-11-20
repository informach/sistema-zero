import { expect, test } from 'bun:test'
import {
  criarMemoriaDePublicacoes,
  lerCenarioPublicado,
} from '../src/sistemas/ler-cenario-publicado'
import { ilhasEmVolta, proximasVagas } from '../src/sistemas/vagas-de-publicacao'
import { cenarioPublicadoParaTeste, portaDoCenarioParaTeste } from './fixtures/cenario-publicado'

const ilhas = [
  { id: 'faisca', centro: { x: 0, z: 0 } },
  { id: 'bosque', centro: { x: 600, z: 0 } },
  { id: 'vila', centro: { x: 0, z: 600 } },
]

test('a vizinha só entra perto da divisa; longe dela fica a ilha de onde ela veio', () => {
  expect(ilhasEmVolta(ilhas, { x: 10, z: 0 })).toMatchObject({
    atual: 'faisca',
    pertoDaDivisa: false,
  })
  expect(ilhasEmVolta(ilhas, { x: 250, z: 0 })).toMatchObject({
    atual: 'faisca',
    vizinha: 'bosque',
    pertoDaDivisa: true,
  })
})

test('ir e voltar pela ponte só troca a vaga da frente, sem carregar nada de novo', () => {
  let vagas = proximasVagas(['faisca', null] as const, ilhasEmVolta(ilhas, { x: 250, z: 0 }))
  expect(vagas).toEqual(['faisca', 'bosque'])
  // Cruzou: as duas já estão carregadas, as vagas são as mesmas.
  const depois = proximasVagas(vagas, ilhasEmVolta(ilhas, { x: 350, z: 0 }))
  expect(depois).toBe(vagas)
  // Voltou para o meio da Faísca: a do Bosque fica guardada (longe da divisa, nada sai).
  vagas = proximasVagas(depois, ilhasEmVolta(ilhas, { x: 0, z: 10 }))
  expect(vagas).toEqual(['faisca', 'bosque'])
})

test('uma terceira ilha ocupa a vaga que não guarda a ilha atual', () => {
  const vagas = proximasVagas(['faisca', 'bosque'] as const, ilhasEmVolta(ilhas, { x: 0, z: 250 }))
  expect(vagas).toEqual(['faisca', 'vila'])
  // Chegou na Vila vindo da Faísca: a Faísca continua, a Vila já estava.
  expect(proximasVagas(vagas, ilhasEmVolta(ilhas, { x: 0, z: 400 }))).toBe(vagas)
})

test('a memória devolve o pacote baixado da mesma versão sem baixar os arquivos de novo', async () => {
  const b = await cenarioPublicadoParaTeste(),
    ensaio = await portaDoCenarioParaTeste(b)
  let baixados = 0
  const buscar: typeof ensaio.buscar = async (url, ...resto) => {
    baixados++
    return ensaio.buscar(url, ...resto)
  }
  const memoria = criarMemoriaDePublicacoes(2),
    sinal = new AbortController().signal
  const primeira = await lerCenarioPublicado(ensaio.porta, 'sua-ilha', sinal, buscar, memoria)
  const depoisDaPrimeira = baixados
  expect(depoisDaPrimeira).toBeGreaterThan(0)
  const segunda = await lerCenarioPublicado(ensaio.porta, 'sua-ilha', sinal, buscar, memoria)
  expect(segunda).toBe(primeira)
  expect(baixados).toBe(depoisDaPrimeira)
  // Outra versão publicada não aproveita o pacote da anterior.
  const nova = await cenarioPublicadoParaTeste()
  nova.publicacao.versao = 2
  await ensaio.usar(nova)
  const terceira = await lerCenarioPublicado(ensaio.porta, 'sua-ilha', sinal, buscar, memoria)
  expect(terceira).not.toBe(primeira)
  expect(baixados).toBeGreaterThan(depoisDaPrimeira)
})

test('a memória esquece a versão usada há mais tempo', () => {
  const memoria = criarMemoriaDePublicacoes(2),
    v = (n: number) => ({ n }) as never
  memoria.guardar('a', v(1))
  memoria.guardar('b', v(2))
  memoria.ler('a')
  memoria.guardar('c', v(3))
  expect(memoria.ler('b')).toBeUndefined()
  expect(memoria.ler('a')).toBeDefined()
  expect(memoria.tamanho).toBe(2)
})

test('indo longe da divisa (pelo Ir), a ilha de onde ela veio fica e a vaga vazia é usada primeiro', () => {
  // Da Faísca direto para o meio da Vila: a segunda vaga estava vazia.
  let vagas = proximasVagas(
    ['faisca', null] as const,
    ilhasEmVolta(ilhas, { x: 0, z: 600 }),
    'faisca',
  )
  expect(vagas).toEqual(['faisca', 'vila'])
  // Da Vila direto para o meio do Bosque: sai a Faísca, fica a Vila (de onde ela veio).
  vagas = proximasVagas(vagas, ilhasEmVolta(ilhas, { x: 600, z: 0 }), 'vila')
  expect(vagas).toEqual(['bosque', 'vila'])
})
