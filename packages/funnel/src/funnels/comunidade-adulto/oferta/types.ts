/** Dados editoriais da oferta; HTML inline é estático, escrito no repositório. */
export type CorAdulto = 'amarelo' | 'rosa' | 'azul' | 'verde' | 'menta' | 'dourado'
export interface ImagemAdulto {
  src: string
  alt: string
  width: number
  height: number
}
export interface SecaoAdulta {
  titulo?: string | { antes: string; destaque: string; depois: string }
  texto?: string
  textoPlanoUnico?: string
  imagens?: readonly ImagemAdulto[]
  rotulos?: readonly string[]
  inclui?: readonly string[]
  acoes?: readonly string[]
  paragrafos?: readonly string[]
  subtitulos?: readonly string[]
  legendas?: readonly string[]
  destaques?: readonly string[]
  itens?: readonly string[] | readonly { pergunta: string; resposta: string }[]
}
export interface PaginaOfertaAdulta {
  seoTitle: string
  description: string
  pularParaConteudo: string
  [secao: string]: string | SecaoAdulta
}
