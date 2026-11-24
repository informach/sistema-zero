import { describe, expect, test } from 'bun:test'
import { ConflitoDeCenario, executarLote } from '../src/comandos'
import type { DocumentoDeCenario, InstanciaDeCenario } from '../src/documento'
import { poligonoSimples, validarDocumento } from '../src/validacao'

const objeto = (id: string): InstanciaDeCenario => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo: 'reino/arvore',
  transformacao: { posicao: { x: 0, y: 0, z: 0 }, rotacao: { x: 0, y: 0, z: 0 }, escala: 1 },
  apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false },
  fisica: 'tronco',
})
function documento(): DocumentoDeCenario {
  return {
    formato: 'molda-cenario',
    versao: 1,
    id: 'faisca',
    nome: 'Faísca',
    unidade: 'metro',
    eixoVertical: 'y',
    base: { id: 'faisca-v2', versao: '1' },
    catalogo: { id: 'acervo', digest: 'a'.repeat(64) },
    grupos: [],
    instancias: [objeto('a')],
    caminhos: [],
    aguas: [],
    relevo: [],
    marcos: [],
    iluminacao: { noite: false },
  }
}
describe('transações de cenário', () => {
  test('recusa hierarquias e carimbos que excedem o orçamento de processamento', () => {
    const d = documento()
    d.grupos = Array.from({ length: 66 }, (_, i) => ({
      id: `g${i}`,
      nome: `Grupo ${i}`,
      grupo: i ? `g${i - 1}` : null,
      bloqueado: false,
      oculto: false,
    }))
    d.instancias[0]!.grupo = 'g65'
    expect(() => validarDocumento(d)).toThrow('64 níveis')
    const relevo = documento()
    relevo.relevo = Array.from({ length: 40 }, (_, i) => ({
      id: `r${i}`,
      tipo: 'elevar',
      centro: { x: 0, z: 0 },
      raio: 500,
      valor: 1,
      intensidade: 1,
    }))
    expect(() => validarDocumento(relevo)).toThrow('orçamento de amostragem')
  })
  test('altera uma instância sem mutar a entrada e incrementa uma revisão por lote', () => {
    const d = documento(),
      r = executarLote(
        { documento: d, revisao: 3 },
        {
          revisaoEsperada: 3,
          comandos: [
            { tipo: 'instancia.atualizar', id: 'a', alteracoes: { nome: 'Árvore do lago' } },
            { tipo: 'iluminacao.definir', noite: true },
          ],
        },
      )
    expect(r.revisao).toBe(4)
    expect(r.documento.instancias[0].nome).toBe('Árvore do lago')
    expect(r.documento.iluminacao.noite).toBe(true)
    expect(d).toEqual(documento())
  })
  test('recusa revisão vencida', () =>
    expect(() =>
      executarLote(
        { documento: documento(), revisao: 4 },
        { revisaoEsperada: 3, comandos: [{ tipo: 'iluminacao.definir', noite: true }] },
      ),
    ).toThrow(ConflitoDeCenario))
  test('lote inválido não aplica parcialmente', () => {
    const d = documento()
    expect(() =>
      executarLote(
        { documento: d, revisao: 0 },
        {
          revisaoEsperada: 0,
          comandos: [
            { tipo: 'instancia.remover', id: 'a' },
            { tipo: 'instancia.atualizar', id: 'inexistente', alteracoes: { nome: 'Nada' } },
          ],
        },
      ),
    ).toThrow()
    expect(d.instancias).toHaveLength(1)
  })
  test('permite criar grupo e vincular instância na mesma transação', () => {
    const r = executarLote(
      { documento: documento(), revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [
          {
            tipo: 'grupo.definir',
            grupo: { id: 'jardim', nome: 'Jardim', grupo: null, bloqueado: false, oculto: false },
          },
          { tipo: 'instancia.atualizar', id: 'a', alteracoes: { grupo: 'jardim' } },
        ],
      },
    )
    expect(r.documento.instancias[0].grupo).toBe('jardim')
  })
  test('bloqueio herdado protege descendentes', () => {
    const d = documento()
    d.grupos = [{ id: 'jardim', nome: 'Jardim', grupo: null, bloqueado: true, oculto: false }]
    d.instancias[0].grupo = 'jardim'
    expect(() =>
      executarLote(
        { documento: d, revisao: 0 },
        { revisaoEsperada: 0, comandos: [{ tipo: 'instancia.remover', id: 'a' }] },
      ),
    ).toThrow(/bloquead/)
  })
  test('desbloqueio explícito permite editar', () => {
    const d = documento()
    d.instancias[0].bloqueado = true
    const r = executarLote(
      { documento: d, revisao: 0 },
      {
        revisaoEsperada: 0,
        comandos: [
          { tipo: 'instancia.atualizar', id: 'a', alteracoes: { bloqueado: false } },
          { tipo: 'instancia.atualizar', id: 'a', alteracoes: { nome: 'Livre' } },
        ],
      },
    )
    expect(r.documento.instancias[0].nome).toBe('Livre')
  })
  test('apoio removido causa rejeição de todo lote', () => {
    const d = documento()
    d.instancias.push({ ...objeto('b'), apoio: { tipo: 'objeto', objeto: 'a', deslocamento: 1 } })
    expect(() =>
      executarLote(
        { documento: d, revisao: 0 },
        { revisaoEsperada: 0, comandos: [{ tipo: 'instancia.remover', id: 'a' }] },
      ),
    ).toThrow(/Apoio ausente/)
  })
  test('recusa dados desconhecidos, escala negativa e números inválidos', () => {
    for (const valor of [NaN, Infinity, -1, 0]) {
      const d = documento()
      d.instancias[0].transformacao.escala = valor
      expect(() => validarDocumento(d)).toThrow()
    }
    expect(() => validarDocumento({ ...documento(), script: 'alert(1)' })).toThrow()
  })
  test('recusa ciclos de apoio e grupo e identificadores duplicados', () => {
    const d = documento()
    d.instancias[0].apoio = { tipo: 'objeto', objeto: 'a', deslocamento: 0 }
    expect(() => validarDocumento(d)).toThrow(/Ciclo/)
    d.instancias[0] = objeto('a')
    d.instancias.push(objeto('a'))
    expect(() => validarDocumento(d)).toThrow(/duplicado/)
  })
  test('valida polígonos côncavos e rejeita cruzamentos e tangências', () => {
    expect(
      poligonoSimples([
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 4 },
        { x: 2, z: 2 },
        { x: 0, z: 4 },
      ]),
    ).toBe(true)
    expect(
      poligonoSimples([
        { x: 0, z: 0 },
        { x: 4, z: 4 },
        { x: 0, z: 4 },
        { x: 4, z: 0 },
      ]),
    ).toBe(false)
    expect(
      poligonoSimples([
        { x: 0, z: 0 },
        { x: 2, z: 0 },
        { x: 2, z: 2 },
        { x: 1, z: 0 },
        { x: 0, z: 2 },
      ]),
    ).toBe(false)
  })
  test('catálogo desconhecido não é substituído silenciosamente', () =>
    expect(() => validarDocumento(documento(), new Map())).toThrow(/Modelo ausente/))
})
