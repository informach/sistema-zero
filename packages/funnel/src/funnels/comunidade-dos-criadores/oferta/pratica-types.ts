export interface ComunidadeImagem {
  src: string
  alt: string
  width: number
  height: number
}

export interface ComunidadeFigura {
  image: ComunidadeImagem
  caption: string
}

export interface ComunidadePraticaSection {
  id: string
  tag: string
  title: string
  intro: string
  cards: [string, string][]
  paras: string[]
  kind: 'cards' | 'family' | 'quotes'
  layout?: 'visual-first'
  visual?: ComunidadeFigura
  visuals?: ComunidadeFigura[]
}
