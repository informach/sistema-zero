import type { PermissoesDaFamilia } from '@sistemazero/arquipelago-contracts'

/** O tempo livre de uma criança numa janela de dias: a soma e em quantos dias ela jogou. */
export interface TempoNaJanela {
  segundos: number
  dias: number
}

/**
 * O que a área dos pais lê e grava no serviço do jogo (28/10/2026, fase1-18). Só lê perfis que o
 * próprio serviço viu jogar nesta conta (`perfisDaConta`).
 */
export interface RepositorioDaFamilia {
  /** Dos perfis pedidos, os que guardaram o jogo logados nesta conta. */
  perfisDaConta(contaId: string, perfis: readonly string[]): Promise<string[]>
  /** Tempo livre de cada perfil entre `inicio` e `fim` (dias de São Paulo, inclusive). */
  tempoNaJanela(
    perfis: readonly string[],
    inicio: string,
    fim: string,
  ): Promise<Map<string, TempoNaJanela>>
  /** O salvamento cru de cada perfil (quem não tem fica de fora do mapa). */
  salvamentos(perfis: readonly string[]): Promise<Map<string, unknown>>
  lerPermissoes(contaId: string): Promise<PermissoesDaFamilia | null>
  gravarPermissoes(
    contaId: string,
    permissoes: PermissoesDaFamilia,
    agora: Date,
  ): Promise<PermissoesDaFamilia>
}
