import { createHash } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import {
  LIMITES_CENARIO,
  type ModeloDeCatalogo,
  ReferenciaDeCatalogoSchema,
  RegistrarCatalogoSchema,
} from '@sistemazero/molda-cenarios-core'
import type { Equipe } from '../domain/jogador'
import { CatalogoDeCenarioDiferente, type CatalogoDisponivel } from './servico-de-cenarios'

export {
  ReferenciaDeCatalogoSchema,
  RegistrarCatalogoSchema,
} from '@sistemazero/molda-cenarios-core'
export interface CatalogoGuardado {
  id: string
  digest: string
  modelos: ModeloDeCatalogo[]
  autorId: string
  criadoEm: string
}
export interface RepositorioDeCatalogos {
  registrar(catalogo: CatalogoGuardado): Promise<void>
  obter(id: string, digest: string): Promise<CatalogoGuardado | null>
  listar(): Promise<Omit<CatalogoGuardado, 'modelos'>[]>
}
export class CatalogosDeCenarios {
  constructor(
    private readonly repo: RepositorioDeCatalogos,
    private readonly agora = () => new Date(),
  ) {}
  private exigir(e: Equipe) {
    if (!e.podeEscrever) throw new ForbiddenError('Somente administradores podem acessar o acervo')
  }
  async listar(e: Equipe) {
    this.exigir(e)
    return this.repo.listar()
  }
  async registrar(e: Equipe, entrada: unknown) {
    this.exigir(e)
    const p = RegistrarCatalogoSchema.parse(entrada),
      json = JSON.stringify(p.modelos)
    if (new TextEncoder().encode(json).length > LIMITES_CENARIO.bytes)
      throw new CatalogoDeCenarioDiferente('Catálogo excede o orçamento de bytes')
    if (new Set(p.modelos.map((m) => m.id)).size !== p.modelos.length)
      throw new CatalogoDeCenarioDiferente('Identificadores de modelos duplicados')
    if (createHash('sha256').update(json).digest('hex') !== p.digest)
      throw new CatalogoDeCenarioDiferente('Digest não corresponde ao catálogo')
    await this.repo.registrar({ ...p, autorId: e.id, criadoEm: this.agora().toISOString() })
    return { id: p.id, digest: p.digest, quantidade: p.modelos.length }
  }
  async ler(e: Equipe, referencia: unknown) {
    this.exigir(e)
    const r = ReferenciaDeCatalogoSchema.parse(referencia),
      c = await this.repo.obter(r.id, r.digest)
    if (!c) throw new CatalogoDeCenarioDiferente('Catálogo não encontrado')
    return c
  }
  async resolver(referencia?: { id: string; digest: string }): Promise<CatalogoDisponivel> {
    if (!referencia) throw new CatalogoDeCenarioDiferente('Informe a versão do catálogo')
    const r = ReferenciaDeCatalogoSchema.parse(referencia),
      c = await this.repo.obter(r.id, r.digest)
    if (!c) throw new CatalogoDeCenarioDiferente('A versão do catálogo não está disponível')
    return { id: c.id, digest: c.digest, modelos: new Map(c.modelos.map((m) => [m.id, m])) }
  }
}
