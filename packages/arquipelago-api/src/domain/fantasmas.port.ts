import type {
  Fantasma,
  GuardarFantasma,
  PercursoId,
  PublicoJogo,
} from '@sistemazero/arquipelago-contracts'

export interface RepositorioDosFantasmas {
  /** Trava o save antes de conferir revisão, público e recorde. Não modifica o save. */
  guardar(
    jogadorId: string,
    publico: PublicoJogo,
    pedido: GuardarFantasma,
    agora: Date,
  ): Promise<boolean>
  /** O mesmo snapshot compara o artefato ao recorde atual; trajeto antigo fica indisponível. */
  ler(jogadorId: string, publico: PublicoJogo, percurso: PercursoId): Promise<Fantasma | null>
}

export class RecordeDoFantasmaMudouError extends Error {
  constructor() {
    super('Confirme o recorde salvo antes de guardar o trajeto.')
  }
}
