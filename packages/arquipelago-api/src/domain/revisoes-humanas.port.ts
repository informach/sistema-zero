import type {
  EstadoDaRevisaoHumana,
  ItemDaFilaDeRevisao,
  PublicoDoDesafio,
  RevisaoHumana,
} from '@sistemazero/arquipelago-contracts'

/** A fila da revisão humana da Lenda (lacunas, 01/11/2026). */
export interface RepositorioDasRevisoesHumanas {
  /** Um envio aprovado entra (ou volta) na fila como `aguardando`, com o número do envio + 1. */
  enviar(e: {
    jogadorId: string
    desafioId: string
    publico: PublicoDoDesafio
    titulo: string
    agora: Date
  }): Promise<void>
  /** As revisões da pessoa, por desafio (a lista de desafios mostra o estado e o retorno). */
  daPessoa(jogadorId: string): Promise<Map<string, RevisaoHumana>>
  fila(filtro: { estado?: EstadoDaRevisaoHumana; limite: number }): Promise<ItemDaFilaDeRevisao[]>
  ler(jogadorId: string, desafioId: string): Promise<ItemDaFilaDeRevisao | null>
  /** Responde ao envio `envio`; `false` quando ele já foi trocado por um envio novo. */
  responder(e: {
    jogadorId: string
    desafioId: string
    envio: number
    estado: Exclude<EstadoDaRevisaoHumana, 'aguardando'>
    retorno: string
    revisadoPor: string
    agora: Date
  }): Promise<boolean>
}
