import type {
  GravarObraEstendida,
  LeituraDaObraEstendida,
  PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import {
  ObraSemSalvamentoError,
  type RepositorioDaObraEstendida,
  type ResultadoDaObraEstendida,
} from '../../src/domain/obra-estendida.port'

/** A mesma troca por revisão do Postgres, em memória; `semSalvamento` imita a falta do save. */
export class ObraEstendidaEmMemoria implements RepositorioDaObraEstendida {
  readonly obras = new Map<string, LeituraDaObraEstendida>()
  readonly semSalvamento = new Set<string>()

  async ler(jogadorId: string, publico: PublicoJogo): Promise<LeituraDaObraEstendida> {
    return structuredClone(this.obras.get(`${jogadorId}:${publico}`) ?? { revisao: 0, obra: null })
  }

  async gravar(
    jogadorId: string,
    publico: PublicoJogo,
    pedido: GravarObraEstendida,
  ): Promise<ResultadoDaObraEstendida> {
    if (this.semSalvamento.has(jogadorId)) throw new ObraSemSalvamentoError()
    const atual = await this.ler(jogadorId, publico)
    if (atual.revisao !== pedido.revisaoBase) return { ok: false, atual }
    const guardada = { revisao: atual.revisao + 1, obra: structuredClone(pedido.obra) }
    this.obras.set(`${jogadorId}:${publico}`, guardada)
    return { ok: true, guardada: structuredClone(guardada) }
  }
}
