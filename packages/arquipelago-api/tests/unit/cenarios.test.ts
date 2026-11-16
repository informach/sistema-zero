import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import { ServicoDeCenarios } from '../../src/application/servico-de-cenarios'
import type { RepositorioDeCenarios, RevisaoDeCenario } from '../../src/domain/cenarios.port'

class Repositorio implements RepositorioDeCenarios {
  linhas = new Map<string, RevisaoDeCenario[]>()
  async listar() {
    return [...this.linhas.values()].map((h) => {
      const r = h.at(-1)!
      return {
        id: r.projetoId,
        nome: r.documento.nome,
        revisao: r.revisao,
        revisaoAplicada: null,
        atualizadoEm: r.criadoEm,
        autorId: r.autorId,
      }
    })
  }
  async criar(r: RevisaoDeCenario) {
    if (this.linhas.has(r.projetoId)) return false
    this.linhas.set(r.projetoId, [structuredClone(r)])
    return true
  }
  async ler(id: string, n?: number) {
    const h = this.linhas.get(id)
    return structuredClone((n === undefined ? h?.at(-1) : h?.find((r) => r.revisao === n)) ?? null)
  }
  async historico(id: string, antesDe = Infinity) {
    return (this.linhas.get(id) ?? [])
      .filter((r) => r.revisao < antesDe)
      .reverse()
      .slice(0, 30)
      .map(({ documento, ...r }) => r)
  }
  async operacao(id: string, op: string) {
    return structuredClone(this.linhas.get(id)?.find((r) => r.operacaoId === op) ?? null)
  }
  async gravar(r: RevisaoDeCenario, esperada: number) {
    const h = this.linhas.get(r.projetoId)
    if (!h || h.at(-1)!.revisao !== esperada) return false
    h.push(structuredClone(r))
    return true
  }
  async aplicar(id: string, revisao: number) {
    return this.linhas.get(id)?.at(-1)?.revisao === revisao
  }
}
function preparar() {
  const documento: DocumentoDeCenario = {
    formato: 'molda-cenario',
    versao: 1,
    id: 'base',
    nome: 'Base',
    unidade: 'metro',
    eixoVertical: 'y',
    base: { id: 'faisca-v2', versao: '1' },
    catalogo: { id: 'catalogo', digest: 'a'.repeat(64) },
    grupos: [],
    instancias: [],
    caminhos: [],
    aguas: [],
    relevo: [],
    marcos: [],
    iluminacao: { noite: false },
  }
  const repo = new Repositorio(),
    s = new ServicoDeCenarios(repo, async () => ({
      id: 'catalogo',
      digest: 'a'.repeat(64),
      modelos: new Map(),
    })),
    autor = { id: randomUUID(), podeEscrever: true, podeRevisar: true }
  return { repo, s, autor, entrada: { nome: 'Faísca', documento, operacaoId: randomUUID() } }
}
describe('autoria compartilhada de cenários', () => {
  test('criação repetida após perda de resposta devolve o mesmo projeto', async () => {
    const { s, autor, entrada } = preparar()
    const a = await s.criar(autor, entrada),
      b = await s.criar(autor, entrada)
    expect(b).toEqual(a)
    expect(await s.listar(autor)).toHaveLength(1)
  })
  test('edição repetida não cria revisão duplicada', async () => {
    const { s, autor, entrada } = preparar(),
      p = await s.criar(autor, entrada),
      e = {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'iluminacao.definir', noite: true }],
      }
    const a = await s.editar(autor, p.projetoId, e)
    expect(await s.editar(autor, p.projetoId, e)).toEqual(a)
    expect(await s.historico(autor, p.projetoId)).toHaveLength(2)
  })
  test('duas sessões concorrentes não sobrescrevem uma à outra', async () => {
    const { s, autor, entrada } = preparar(),
      p = await s.criar(autor, entrada)
    const r = await Promise.allSettled([
      s.editar(autor, p.projetoId, {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'projeto.renomear', nome: 'A' }],
      }),
      s.editar(autor, p.projetoId, {
        revisaoEsperada: 0,
        operacaoId: randomUUID(),
        comandos: [{ tipo: 'projeto.renomear', nome: 'B' }],
      }),
    ])
    expect(r.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(r.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect((await s.ler(autor, p.projetoId)).revisao).toBe(1)
  })
  test('identificador de operação não pode ser reutilizado com outro conteúdo', async () => {
    const { s, autor, entrada } = preparar(),
      p = await s.criar(autor, entrada),
      op = randomUUID()
    await s.editar(autor, p.projetoId, {
      revisaoEsperada: 0,
      operacaoId: op,
      comandos: [{ tipo: 'iluminacao.definir', noite: true }],
    })
    await expect(
      s.editar(autor, p.projetoId, {
        revisaoEsperada: 0,
        operacaoId: op,
        comandos: [{ tipo: 'iluminacao.definir', noite: false }],
      }),
    ).rejects.toThrow(/Identificador/)
  })
  test('contas sem administração não leem nem alteram projetos', async () => {
    const { s, autor, entrada } = preparar(),
      sem = { ...autor, podeEscrever: false }
    await expect(s.criar(sem, entrada)).rejects.toThrow(/administradores/)
    await expect(s.listar(sem)).rejects.toThrow(/administradores/)
    await expect(s.ler(sem, randomUUID())).rejects.toThrow(/administradores/)
  })
  test('aplicar exige a revisão atual e não modifica o documento', async () => {
    const { s, autor, entrada } = preparar(),
      p = await s.criar(autor, entrada)
    await s.editar(autor, p.projetoId, {
      revisaoEsperada: 0,
      operacaoId: randomUUID(),
      comandos: [{ tipo: 'iluminacao.definir', noite: true }],
    })
    await expect(s.aplicar(autor, p.projetoId, 0)).rejects.toThrow(/Revisão/)
    expect(await s.aplicar(autor, p.projetoId, 1)).toEqual({ projetoId: p.projetoId, revisao: 1 })
    expect((await s.ler(autor, p.projetoId)).revisao).toBe(1)
  })
  test('catálogo divergente e vínculos inválidos não entram no banco', async () => {
    const { s, repo, autor, entrada } = preparar()
    entrada.documento.catalogo.digest = 'b'.repeat(64)
    await expect(s.criar(autor, entrada)).rejects.toThrow(/catálogo/)
    expect(await repo.listar()).toHaveLength(0)
  })
})
