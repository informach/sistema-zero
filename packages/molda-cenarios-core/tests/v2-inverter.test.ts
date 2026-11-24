import { describe, expect, test } from 'bun:test'
import {
  type ComandoDeCenario,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  executarLote,
  type GrupoDeCenario,
  type InstanciaDeCenario,
  inverterLote,
} from '../src/v2'

const modelo = (id: string) => ({ id, biblioteca: 'b', modelo: id, digest: 'a'.repeat(64) })
const grupo = (id: string, extra: Partial<GrupoDeCenario> = {}): GrupoDeCenario => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  ...extra,
})
const objeto = (id: string, extra: Partial<InstanciaDeCenario> = {}): InstanciaDeCenario => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo: 'arvore',
  transformacao: {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
  apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false },
  colisao: 'caixa',
  ...extra,
})
const trilha = (id: string, largura = 2) => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  pontos: [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
  ],
  acabamento: null,
  largura,
  tipo: 'trilha' as const,
})
function base(): DocumentoDeCenario {
  return {
    ...criarDocumentoVazio('fase', 'Fase'),
    modelos: [modelo('arvore')],
    grupos: [grupo('vila'), grupo('casa', { grupo: 'vila' })],
    instancias: [objeto('a', { grupo: 'casa' }), objeto('b')],
    caminhos: [trilha('t')],
  }
}
/** A ordem das listas não tem significado: compara pelo conteúdo. */
function normal(d: DocumentoDeCenario) {
  const porId = <T extends { id: string }>(l: T[]) => [...l].sort((a, b) => (a.id < b.id ? -1 : 1))
  return {
    ...d,
    modelos: porId(d.modelos),
    grupos: porId(d.grupos),
    instancias: porId(d.instancias),
    caminhos: porId(d.caminhos),
    aguas: porId(d.aguas),
    marcadores: porId(d.marcadores),
  }
}
function idaEVolta(antes: DocumentoDeCenario, comandos: ComandoDeCenario[]) {
  const depois = executarLote({ documento: antes, revisao: 0 }, { revisaoEsperada: 0, comandos })
  const inverso = inverterLote(antes, depois.documento)
  const volta = inverso.length
    ? executarLote(depois, { revisaoEsperada: 1, comandos: inverso }).documento
    : depois.documento
  expect(normal(volta)).toEqual(normal(antes))
  return { depois: depois.documento, inverso }
}

describe('desfazer (inverso de um lote)', () => {
  test('uma restauração conserva a identidade e não altera a entrada', () => {
    const antes = base()
    expect(() =>
      executarLote(
        { documento: antes, revisao: 0 },
        {
          revisaoEsperada: 0,
          comandos: [{ tipo: 'cenario.restaurar', documento: { ...antes, id: 'outra-fase' } }],
        },
      ),
    ).toThrow('deste cenário')
    expect(antes.id).toBe('fase')
  })
  test('um lote de 500 objetos bloqueados continua podendo ser desfeito atomicamente', () => {
    const antes = { ...criarDocumentoVazio('fase', 'Fase'), modelos: [modelo('arvore')] }
    const comandos: ComandoDeCenario[] = Array.from({ length: 500 }, (_, i) => ({
      tipo: 'instancia.criar',
      instancia: objeto(`o-${i}`, { bloqueado: true }),
    }))
    const depois = executarLote({ documento: antes, revisao: 0 }, { revisaoEsperada: 0, comandos })
    const inversos = inverterLote(antes, depois.documento)
    expect(inversos.length).toBeLessThanOrEqual(500)
    expect(executarLote(depois, { revisaoEsperada: 1, comandos: inversos }).documento).toEqual(
      antes,
    )
  })
  test('nada mudou, nada a desfazer', () => {
    expect(inverterLote(base(), base())).toEqual([])
  })
  test('mover, criar e apagar objetos', () => {
    idaEVolta(base(), [
      {
        tipo: 'instancia.atualizar',
        id: 'a',
        alteracoes: {
          transformacao: {
            posicao: { x: 5, y: 1, z: -3 },
            rotacao: { x: 0, y: 1.5, z: 0 },
            escala: { x: 2, y: 1, z: 2 },
          },
        },
      },
      { tipo: 'instancia.criar', instancia: objeto('c') },
      { tipo: 'instancia.remover', id: 'b' },
    ])
  })
  test('uma propriedade acrescentada some de novo ao desfazer', () => {
    const { inverso } = idaEVolta(base(), [
      { tipo: 'instancia.atualizar', id: 'b', alteracoes: { propriedades: { vida: 3 } } },
    ])
    expect(inverso).toEqual([{ tipo: 'instancia.definir', instancia: objeto('b') }])
  })
  test('modelo novo com objeto, e a troca de base, hora e nome', () => {
    idaEVolta(base(), [
      { tipo: 'modelo.definir', modelo: modelo('pedra') },
      { tipo: 'instancia.criar', instancia: objeto('p', { modelo: 'pedra' }) },
      { tipo: 'base.definir', base: { tipo: 'plano', largura: 64, comprimento: 64 } },
      { tipo: 'iluminacao.definir', iluminacao: { hora: 20 } },
      { tipo: 'cenario.renomear', nome: 'Outra fase' },
    ])
  })
  test('apagar um grupo inteiro com o que tem dentro', () => {
    idaEVolta(base(), [
      { tipo: 'instancia.remover', id: 'a' },
      { tipo: 'grupo.remover', id: 'casa' },
      { tipo: 'grupo.remover', id: 'vila' },
    ])
  })
  test('agrupar: grupo novo, objeto dentro, e desfazer tira os dois', () => {
    idaEVolta(base(), [
      { tipo: 'grupo.definir', grupo: grupo('novo') },
      { tipo: 'instancia.atualizar', id: 'b', alteracoes: { grupo: 'novo' } },
    ])
  })
  test('mexer e trancar no mesmo lote: o desfazer destranca antes de devolver', () => {
    idaEVolta(base(), [
      { tipo: 'caminho.definir', caminho: trilha('t', 6) },
      { tipo: 'caminho.definir', caminho: { ...trilha('t', 6), bloqueado: true } },
      { tipo: 'instancia.atualizar', id: 'b', alteracoes: { nome: 'Outro' } },
      { tipo: 'instancia.atualizar', id: 'b', alteracoes: { bloqueado: true } },
    ])
  })
  test('mexer dentro de um grupo e trancar o grupo depois', () => {
    idaEVolta(base(), [
      { tipo: 'instancia.atualizar', id: 'a', alteracoes: { nome: 'Porta' } },
      { tipo: 'grupo.definir', grupo: grupo('vila', { bloqueado: true }) },
    ])
  })
  test('destrancar o grupo, mexer dentro e trancar de novo', () => {
    const antes = base()
    antes.grupos[0]!.bloqueado = true
    idaEVolta(antes, [
      { tipo: 'grupo.definir', grupo: grupo('vila') },
      { tipo: 'instancia.atualizar', id: 'a', alteracoes: { nome: 'Porta' } },
      { tipo: 'instancia.criar', instancia: objeto('z', { grupo: 'casa' }) },
      { tipo: 'grupo.definir', grupo: grupo('vila', { bloqueado: true }) },
    ])
  })
  test('um objeto trancado que foi destrancado e apagado volta trancado', () => {
    const antes = base()
    antes.instancias[1]!.bloqueado = true
    idaEVolta(antes, [
      { tipo: 'instancia.atualizar', id: 'b', alteracoes: { bloqueado: false } },
      { tipo: 'instancia.remover', id: 'b' },
    ])
  })
  test('o mesmo identificador trocando de tipo', () => {
    idaEVolta(base(), [
      { tipo: 'caminho.remover', id: 't' },
      { tipo: 'instancia.criar', instancia: objeto('t') },
    ])
  })
  test('refazer é desfazer o desfazer', () => {
    const antes = base()
    const { depois, inverso } = idaEVolta(antes, [
      { tipo: 'instancia.remover', id: 'a' },
      { tipo: 'grupo.remover', id: 'casa' },
      { tipo: 'instancia.criar', instancia: objeto('n', { grupo: 'vila' }) },
    ])
    const voltou = executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverso },
    )
    const refazer = inverterLote(depois, voltou.documento)
    const refeito = executarLote(voltou, { revisaoEsperada: 2, comandos: refazer })
    expect(normal(refeito.documento)).toEqual(normal(depois))
  })
})

describe('ordem dos caminhos', () => {
  test('desfazer a remoção devolve o caminho ao lugar dele (a ordem decide os encontros)', () => {
    const antes = { ...base(), caminhos: [trilha('t1'), trilha('t2'), trilha('t3')] }
    const depois = executarLote(
      { documento: antes, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [
          { tipo: 'caminho.remover', id: 't1' },
          { tipo: 'caminho.remover', id: 't3' },
          { tipo: 'caminho.definir', caminho: trilha('novo') },
        ],
      },
    ).documento
    const volta = executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(antes, depois) },
    ).documento
    expect(volta.caminhos.map((c) => c.id)).toEqual(['t1', 't2', 't3'])
  })

  test('a posição só vale para um caminho novo', () => {
    const antes = { ...base(), caminhos: [trilha('t1'), trilha('t2')] }
    const lote = (comandos: ComandoDeCenario[]) =>
      executarLote({ documento: antes, revisao: 0 }, { revisaoEsperada: 0, comandos }).documento
    expect(
      lote([{ tipo: 'caminho.definir', caminho: trilha('novo'), posicao: 0 }]).caminhos.map(
        (c) => c.id,
      ),
    ).toEqual(['novo', 't1', 't2'])
    expect(() => lote([{ tipo: 'caminho.definir', caminho: trilha('t2', 4), posicao: 0 }])).toThrow(
      'A posição só vale para um caminho novo',
    )
  })
})
