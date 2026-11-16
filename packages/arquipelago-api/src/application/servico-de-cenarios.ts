import { createHash } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import {
  type CatalogoDeCenario,
  ConflitoDeCenario,
  executarLote,
  LoteDeCenarioSchema,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core'
import { z } from 'zod'
import type { RepositorioDeCenarios, RevisaoDeCenario } from '../domain/cenarios.port'
import type { Equipe } from '../domain/jogador'

export const CriarCenarioSchema = z
  .object({ nome: z.string().min(1).max(120), documento: z.unknown(), operacaoId: z.uuid() })
  .strict()
export const EditarCenarioSchema = LoteDeCenarioSchema.extend({ operacaoId: z.uuid() }).strict()
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
    private readonly catalogo: () => Promise<CatalogoDisponivel>,
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
    const c = await this.catalogo(),
      d = validarDocumento(valor, c.modelos)
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
      c = await this.catalogo()
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
    if (!(await this.repo.aplicar(id, revisao)))
      throw new ConflitoDeCenario((await this.ler(equipe, id)).revisao)
    return { projetoId: id, revisao }
  }
}
