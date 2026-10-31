import type { PermissoesDaFamilia } from '@sistemazero/arquipelago-contracts'

/** O tempo livre de uma criança numa janela de dias: a soma e em quantos dias ela jogou. */
export interface TempoNaJanela {
  segundos: number
  dias: number
}

/** Uma aparência aplicada a um objeto, como o serviço registrou (A33, 31/10/2026). */
export interface AparenciaAplicada {
  objeto: string
  revisao: number
  origem: string
  /** A marca da aparência (`marcaDaCriacao`); `null` nas linhas de antes da migração 0024. */
  criacao: string | null
  registradoEm: Date
}

/**
 * O que a área dos pais lê e grava no serviço do jogo (28/10/2026, fase1-18). Só lê perfis que o
 * próprio serviço viu jogar nesta conta (`perfisDaConta`).
 */
export interface RepositorioDaFamilia {
  /** Dos perfis pedidos, os que guardaram o jogo logados nesta conta. */
  perfisDaConta(contaId: string, perfis: readonly string[]): Promise<string[]>
  /**
   * Os outros perfis desta conta que já guardaram o jogo nela (os irmãos de `menos`), do mais
   * antigo ao mais novo, até `limite` (fase3-12, recordes e visitas).
   */
  outrosPerfisDaConta(contaId: string, menos: string, limite: number): Promise<string[]>
  /** Tempo livre de cada perfil entre `inicio` e `fim` (dias de São Paulo, inclusive). */
  tempoNaJanela(
    perfis: readonly string[],
    inicio: string,
    fim: string,
  ): Promise<Map<string, TempoNaJanela>>
  /**
   * O fim de cada sessão no jogo com tempo contado (o `cursor`), entre `de` e `ate`, por perfil
   * (quem não jogou fica de fora do mapa). É de onde sai a "volta ao curso" (29/10/2026).
   */
  sessoesNaJanela(perfis: readonly string[], de: Date, ate: Date): Promise<Map<string, Date[]>>
  /**
   * As aparências aplicadas a objetos entre `de` e `ate`, por perfil (quem não aplicou nada fica
   * de fora do mapa). É de onde sai "criações desta semana" no cartão dos pais (A33).
   */
  aparenciasNaJanela(
    perfis: readonly string[],
    de: Date,
    ate: Date,
  ): Promise<Map<string, AparenciaAplicada[]>>
  /** O salvamento cru de cada perfil (quem não tem fica de fora do mapa). */
  salvamentos(perfis: readonly string[]): Promise<Map<string, unknown>>
  lerPermissoes(contaId: string): Promise<PermissoesDaFamilia | null>
  gravarPermissoes(
    contaId: string,
    permissoes: PermissoesDaFamilia,
    agora: Date,
  ): Promise<PermissoesDaFamilia>
}
