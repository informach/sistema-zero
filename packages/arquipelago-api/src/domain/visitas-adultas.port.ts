export interface RepositorioDasVisitasAdultas {
  ativo(jogadorId: string): Promise<boolean>
  /** Só habilita quem já tem salvamento adulto. Substitui o código anterior atomicamente. */
  gerar(jogadorId: string, hash: string, agora: Date): Promise<boolean>
  desligar(jogadorId: string): Promise<void>
  encontrar(hash: string): Promise<{ jogadorId: string; salvamento: unknown } | null>
  dono(hash: string): Promise<string | null>
  confirmar(hash: string, jogadorId: string): Promise<boolean>
}
export class VisitaAdultaIndisponivelError extends Error {
  constructor() {
    super('Esta visita não está disponível.')
  }
}
export class SalvamentoDaVisitaNecessarioError extends Error {
  constructor() {
    super('Guarde seu jogo antes de compartilhar a casa.')
  }
}
