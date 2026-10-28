import type {
  AnaliseDoDesafio,
  ConteudoDoDesafio,
  MetadadosDoDesafio,
  SituacaoDoCadastro,
  VistaDoObjetivo,
} from '@sistemazero/arquipelago-contracts'

/** Um desafio como está guardado (o conteúdo validado pelo contrato antes de entrar). */
export interface DesafioNoBanco {
  id: string
  metadados: MetadadosDoDesafio
  situacao: SituacaoDoCadastro
  revisao: number
  revisaoPublicada: number | null
  /** Conteúdo ou posição diferem da cópia publicada; mudanças de situação não contam. */
  alteradoDepoisDePublicar: boolean
  conteudo: unknown
  atualizadoEm: Date
  atualizadoPor: string
  /** Os blocos exigidos congelados na última publicação (null antes de publicar). */
  blocosPublicados: string[] | null
}

/** O que a publicação congela. */
export interface Publicacao {
  conteudo: ConteudoDoDesafio
  blocosDerivados: string[]
  blocosExigidos: string[]
  vista: VistaDoObjetivo[]
  analise: AnaliseDoDesafio
}

export interface FiltroDosDesafios {
  publico?: MetadadosDoDesafio['publico']
  ilha?: MetadadosDoDesafio['ilha']
  tipo?: MetadadosDoDesafio['tipo']
  situacao?: SituacaoDoCadastro
}

/** Conflito de cadastro: outro desafio já usa o slug, ou o quadro da ilha já tem desafio. */
export type ConflitoDoCadastro = 'slug-em-uso' | 'quadro-ocupado'

export type ResultadoDaEscrita =
  | { ok: true; desafio: DesafioNoBanco }
  | { ok: false; motivo: 'revisao'; atual: DesafioNoBanco | null }
  | { ok: false; motivo: ConflitoDoCadastro }

/** Porta de persistência dos desafios (schema `arquipelago`). Toda escrita confere a revisão. */
export interface RepositorioDeDesafios {
  listar(filtro: FiltroDosDesafios): Promise<DesafioNoBanco[]>
  ler(id: string): Promise<DesafioNoBanco | null>
  criar(e: {
    id: string
    metadados: MetadadosDoDesafio
    conteudo: ConteudoDoDesafio
    por: string
    agora: Date
  }): Promise<ResultadoDaEscrita>
  gravar(e: {
    id: string
    revisaoBase: number
    metadados: MetadadosDoDesafio
    conteudo: ConteudoDoDesafio
    por: string
    agora: Date
  }): Promise<ResultadoDaEscrita>
  /** Congela a revisão atual (que precisa ser `revisaoBase`) e marca como publicada. */
  publicar(e: {
    id: string
    revisaoBase: number
    publicacao: Publicacao
    por: string
    agora: Date
  }): Promise<ResultadoDaEscrita>
  /** Arquivar ou reativar (volta a publicado se já teve publicação, senão rascunho). */
  mudarSituacao(e: {
    id: string
    revisaoBase: number
    situacao: 'arquivado' | 'ativo'
    por: string
    agora: Date
  }): Promise<ResultadoDaEscrita>
}

// ── Quem joga ────────────────────────────────────────────────────────────────────────────────

/** A cópia publicada que a pessoa joga e que a conferência usa. */
export interface PublicacaoGuardada {
  desafioId: string
  revisao: number
  conteudo: unknown
  blocosExigidos: string[]
  vista: VistaDoObjetivo[]
}

export interface DesafioPublicado {
  id: string
  metadados: MetadadosDoDesafio
  situacao: SituacaoDoCadastro
  /** A última publicação (a que vale para quem ainda não concluiu). */
  publicacao: PublicacaoGuardada
}

/**
 * O prêmio em moedas de uma conclusão: `nenhuma` (prêmio zero), `pendente` (ainda não confirmado
 * pelo Members), `creditado` ou `teto` (o teto semanal estava cheio: espera a semana seguinte).
 */
export type SituacaoDasMoedas = 'nenhuma' | 'pendente' | 'creditado' | 'teto'

export interface ConclusaoGuardada {
  desafioId: string
  /** Posição da publicação concluída, preservada mesmo após mover o cadastro. */
  ilha: MetadadosDoDesafio['ilha']
  tipo: MetadadosDoDesafio['tipo']
  quadro: number | null
  revisao: number
  concluidoEm: Date
  extraConcluidoEm: Date | null
  recompensaVistaEm: Date | null
  moedas: number
  moedasSituacao: SituacaoDasMoedas
  moedasExtra: number
  moedasExtraSituacao: SituacaoDasMoedas
  /** Semana (`semanaDeSaoPaulo`) em que o prêmio bateu no teto; cobra de novo numa seguinte. */
  moedasTetoSemana: string | null
  moedasExtraTetoSemana: string | null
}

export interface RepositorioDoJogadorNosDesafios {
  /** Desafios publicados do público (fora os arquivados), cada um com a última publicação. */
  listarPublicados(publico: MetadadosDoDesafio['publico']): Promise<DesafioPublicado[]>
  /** O desafio publicado (fora os arquivados) com a última publicação. */
  lerPublicado(desafioId: string): Promise<DesafioPublicado | null>
  /** Uma publicação específica (para conferir a revisão que a pessoa abriu). */
  lerPublicacao(
    desafioId: string,
    revisao: number,
  ): Promise<{
    publicacao: PublicacaoGuardada
    desafio: Omit<DesafioPublicado, 'publicacao'>
  } | null>
  /** Tudo o que a pessoa concluiu no público, arquivados inclusive (feito continua feito). */
  conclusoes(
    jogadorId: string,
    publico: MetadadosDoDesafio['publico'],
  ): Promise<ConclusaoGuardada[]>
  progresso(
    jogadorId: string,
    desafioId: string,
  ): Promise<{ revisao: number; ultimosResultados: { id: string; passou: boolean }[] } | null>
  guardarTentativa(e: {
    jogadorId: string
    desafioId: string
    revisao: number
    resultados: { id: string; passou: boolean }[]
    agora: Date
  }): Promise<void>
  /** Grava a conclusão uma vez só; devolve `true` só para quem gravou. */
  concluir(e: {
    jogadorId: string
    desafioId: string
    publico: MetadadosDoDesafio['publico']
    revisao: number
    moedas: number
    moedasExtra: number
    agora: Date
  }): Promise<boolean>
  /** Marca o desafio extra feito uma vez só; devolve `true` só na primeira. */
  marcarExtra(jogadorId: string, desafioId: string, agora: Date): Promise<boolean>
  marcarMoedas(
    jogadorId: string,
    desafioId: string,
    premio: 'principal' | 'extra',
    situacao: SituacaoDasMoedas,
    /** Com `teto`: a semana em que bateu. */
    semana?: string,
  ): Promise<void>
  marcarRecompensaVista(jogadorId: string, desafioId: string, agora: Date): Promise<void>
}
