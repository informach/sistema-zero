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
