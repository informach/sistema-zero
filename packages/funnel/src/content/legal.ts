// Tipos legais e identificação da empresa compartilhados pelos funis ativos.

export interface LegalSecao {
  titulo: string
  paragrafos: string[]
  bullets?: string[]
  /** Parágrafos exibidos depois dos bullets (fechamento da seção). */
  posBullets?: string[]
}

export interface LegalDoc {
  titulo: string
  descricao: string
  atualizadoEm: string
  secoes: LegalSecao[]
}

export const EMPRESA = {
  razaoSocial: 'Informach — Núcleo de Aprendizagem Ltda.',
  cnpj: '43.588.758/0001-03',
  email: 'contato@sistemazero.com.br',
  foro: 'Belo Horizonte/MG',
}
