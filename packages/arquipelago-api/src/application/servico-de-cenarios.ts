import { createHash } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import {
  type CatalogoDeCenario,
  ConflitoDeCenario,
  CriarCenarioSchema,
  EditarCenarioSchema,
  executarLote,
  RestaurarCenarioSchema,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core'
import { z } from 'zod'
import type { RepositorioDeCenarios, RevisaoDeCenario } from '../domain/cenarios.port'
import type { Equipe } from '../domain/jogador'

export { CriarCenarioSchema, EditarCenarioSchema } from '@sistemazero/molda-cenarios-core'
export class CenarioNaoEncontrado extends Error {
  readonly code = 'CENARIO_NAO_ENCONTRADO'
}
export class OperacaoDeCenarioReutilizada extends Error {
  readonly code = 'OPERACAO_REUTILIZADA'
}
export class CatalogoDeCenarioDiferente extends Error {
  readonly code = 'CATALOGO_DIFERENTE'
}
export interface CatalogoDisponivel {
  id: string
  digest: string
  modelos: CatalogoDeCenario
}
const hash = (valor: unknown) => createHash('sha256').update(JSON.stringify(valor)).digest('hex')
export class ServicoDeCenarios {
  constructor(
    private readonly repo: RepositorioDeCenarios,
    private readonly catalogo: (referencia?: {
      id: string
      digest: string
    }) => Promise<CatalogoDisponivel>,
    private readonly agora = () => new Date(),
  ) {}
  private autor(equipe: Equipe) {
    if (!equipe.podeEscrever)
      throw new ForbiddenError('Somente administradores podem acessar os cenários')
    return equipe.id
  }
  async listar(equipe: Equipe) {
    this.autor(equipe)
    return this.repo.listar()
  }
  async ler(equipe: Equipe, id: string, revisao?: number) {
    this.autor(equipe)
    const r = await this.repo.ler(id, revisao)
    if (!r) throw new CenarioNaoEncontrado('Cenário não encontrado')
    return r
  }
  async historico(equipe: Equipe, id: string, antesDe?: number) {
    await this.ler(equipe, id)
    return this.repo.historico(id, antesDe)
  }
  private async validar(valor: unknown) {
    const inicial = validarDocumento(valor)
    const c = await this.catalogo(inicial.catalogo),
      d = validarDocumento(inicial, c.modelos)
    if (d.catalogo.id !== c.id || d.catalogo.digest !== c.digest)
      throw new CatalogoDeCenarioDiferente('O documento usa outro catálogo')
    return { documento: d, catalogo: c }
  }
  async criar(equipe: Equipe, entrada: unknown) {
    const autorId = this.autor(equipe),
      p = CriarCenarioSchema.parse(entrada),
      v = await this.validar(p.documento),
      id = p.operacaoId
    const documento = { ...v.documento, id, nome: p.nome },
      r: RevisaoDeCenario = {
        projetoId: id,
        revisao: 0,
        documento,
        autorId,
        criadoEm: this.agora().toISOString(),
        operacaoId: p.operacaoId,
        impressao: hash(p),
      }
    if (await this.repo.criar(r)) return r
    const anterior = await this.repo.ler(id, 0)
    if (anterior && anterior.impressao === r.impressao && anterior.autorId === autorId)
      return anterior
    throw new OperacaoDeCenarioReutilizada('Identificador já usado em outra operação')
  }
  async editar(equipe: Equipe, id: string, entrada: unknown) {
    const autorId = this.autor(equipe),
      p = EditarCenarioSchema.parse(entrada),
      impressao = hash(p)
    const repetida = await this.repo.operacao(id, p.operacaoId)
    if (repetida) {
      if (repetida.impressao !== impressao || repetida.autorId !== autorId)
        throw new OperacaoDeCenarioReutilizada('Identificador já usado em outra operação')
      return repetida
    }
    const atual = await this.ler(equipe, id),
      c = await this.catalogo(atual.documento.catalogo)
    if (atual.documento.catalogo.id !== c.id || atual.documento.catalogo.digest !== c.digest)
      throw new CatalogoDeCenarioDiferente('O catálogo do projeto não está disponível')
    const novo = executarLote(
      { documento: atual.documento, revisao: atual.revisao },
      { revisaoEsperada: p.revisaoEsperada, comandos: p.comandos },
      c.modelos,
    )
    const revisao: RevisaoDeCenario = {
      projetoId: id,
      revisao: novo.revisao,
      documento: novo.documento,
      autorId,
      criadoEm: this.agora().toISOString(),
      operacaoId: p.operacaoId,
      impressao,
    }
    if (await this.repo.gravar(revisao, p.revisaoEsperada)) return revisao
    const confirmada = await this.repo.operacao(id, p.operacaoId)
    if (confirmada && confirmada.impressao === impressao && confirmada.autorId === autorId)
      return confirmada
    throw new ConflitoDeCenario((await this.ler(equipe, id)).revisao)
  }
  async aplicar(equipe: Equipe, id: string, revisao: number) {
    this.autor(equipe)
    z.number().int().nonnegative().parse(revisao)
    const r = await this.ler(equipe, id, revisao)
    await this.validar(r.documento)
    if (!(await this.repo.aplicar(id, revisao, equipe.id)))
      throw new ConflitoDeCenario((await this.ler(equipe, id)).revisao)
    return { projetoId: id, revisao }
  }
  async aplicado(equipe: Equipe, base: string) {
    this.autor(equipe)
    const r = await this.repo.aplicado?.(base)
    if (!r) throw new CenarioNaoEncontrado('Nenhuma revisão aplicada a este ensaio')
    return r
  }
  async restaurar(equipe: Equipe, id: string, entrada: unknown) {
    const autorId = this.autor(equipe),
      p = RestaurarCenarioSchema.parse(entrada),
      impressao = hash({ tipo: 'restaurar', ...p })
    const repetida = await this.repo.operacao(id, p.operacaoId)
    if (repetida) {
      if (repetida.impressao !== impressao || repetida.autorId !== autorId)
        throw new OperacaoDeCenarioReutilizada('Identificador já usado em outra operação')
      return repetida
    }
    const atual = await this.ler(equipe, id)
    if (atual.revisao !== p.revisaoEsperada) throw new ConflitoDeCenario(atual.revisao)
    const origem = await this.ler(equipe, id, p.origem),
      v = await this.validar(origem.documento)
    const r: RevisaoDeCenario = {
      projetoId: id,
      revisao: atual.revisao + 1,
      documento: v.documento,
      autorId,
      criadoEm: this.agora().toISOString(),
      operacaoId: p.operacaoId,
      impressao,
    }
    if (await this.repo.gravar(r, p.revisaoEsperada)) return r
    const confirmada = await this.repo.operacao(id, p.operacaoId)
    if (confirmada && confirmada.impressao === impressao && confirmada.autorId === autorId)
      return confirmada
    throw new ConflitoDeCenario((await this.ler(equipe, id)).revisao)
  }
}
