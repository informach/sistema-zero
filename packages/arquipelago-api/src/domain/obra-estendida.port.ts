import type {
  GravarObraEstendida,
  LeituraDaObraEstendida,
  PublicoJogo,
} from '@sistemazero/arquipelago-contracts'

export type ResultadoDaObraEstendida =
  | { ok: true; guardada: LeituraDaObraEstendida }
  | { ok: false; atual: LeituraDaObraEstendida }

export interface RepositorioDaObraEstendida {
  /** Revisão 0 e obra `null` quando nunca foi gravada. */
  ler(jogadorId: string, publico: PublicoJogo): Promise<LeituraDaObraEstendida>
  /**
   * Grava numa instrução só (insert na revisão 0, update com `where revisao = base` nas demais);
   * quem perde recebe o que está guardado. Sem salvamento do mesmo público, nada é gravado.
   */
  gravar(
    jogadorId: string,
    publico: PublicoJogo,
    pedido: GravarObraEstendida,
    agora: Date,
  ): Promise<ResultadoDaObraEstendida>
}

/** Outro aparelho gravou antes: vai junto o que está guardado agora. */
export class ObraEstendidaDesatualizadaError extends Error {
  constructor(readonly atual: LeituraDaObraEstendida) {
    super('A obra mudou em outro aparelho')
  }
}

/** A obra vive ao lado do salvamento (a FK apaga uma com o outro): sem salvamento, não grava. */
export class ObraSemSalvamentoError extends Error {
  constructor() {
    super('Guarde o jogo antes da obra')
  }
}

/** O que está guardado não passa no formato atual: nunca devolver "vazio" por cima. */
export class ObraEstendidaIlegivelError extends Error {
  constructor() {
    super('Obra guardada em formato desconhecido')
  }
}
