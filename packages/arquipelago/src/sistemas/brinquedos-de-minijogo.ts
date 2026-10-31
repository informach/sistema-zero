import type { IlhaId, Minijogo } from '@sistemazero/arquipelago-contracts'

/**
 * Os brinquedos de minijogo das ilhas (B10, 31/10/2026). A proposta: "o minijogo aprovado vira
 * barraca na feira, fliperama em casa ou brinquedo no festival" e "quando passa, o minijogo fica na
 * ilha para você e a família jogarem". A barraca do jogo na feira da Vila Doce e o quiosque do
 * festival no Pico mostram na tela a capa do minijogo mais recente da própria ilha e abrem a lista
 * deles. O fliperama de casa continua com todos.
 */
export interface BrinquedoDeMinijogo {
  /** O nó do brinquedo no GLB da ilha completa (a `tela` e a âncora `jogar` ficam ao lado dele). */
  no: string
  titulo: string
  rotulo: string
  vazio: string
}

export const BRINQUEDOS_DE_MINIJOGO = {
  'vila-doce': {
    no: 'barraca-do-jogo',
    titulo: 'Barraca do jogo',
    rotulo: 'Jogar na barraca',
    vazio:
      'A barraca espera o seu jogo. Quando um desafio da Vila Doce virar minijogo no Estúdio, ele fica aqui para jogar.',
  },
  pico: {
    no: 'brinquedo-do-festival',
    titulo: 'Quiosque do festival',
    rotulo: 'Jogar no quiosque',
    vazio:
      'O quiosque espera o seu jogo. Quando um desafio do Pico Gelado virar minijogo no Estúdio, ele fica aqui para jogar.',
  },
} as const satisfies Partial<Record<IlhaId, BrinquedoDeMinijogo>>

export type IlhaComBrinquedo = keyof typeof BRINQUEDOS_DE_MINIJOGO

/** A tela do brinquedo e o ponto de jogar: nós soltos no GLB da ilha, um de cada por ilha. */
export const TELA_DO_BRINQUEDO = 'tela'
export const ANCORA_DO_BRINQUEDO = 'jogar'

/** O painel aberto pelo brinquedo de cada ilha. */
export const painelDoBrinquedo = (ilha: IlhaComBrinquedo) => `brinquedo-de-minijogo:${ilha}`

export function ilhaDoPainel(painel: string | null): IlhaComBrinquedo | null {
  if (!painel?.startsWith('brinquedo-de-minijogo:')) return null
  const ilha = painel.slice('brinquedo-de-minijogo:'.length)
  return ilha in BRINQUEDOS_DE_MINIJOGO ? (ilha as IlhaComBrinquedo) : null
}

/** Os minijogos aprovados da ilha, na ordem da lista (o mais recente primeiro). */
export function minijogosDaIlha(lista: readonly Minijogo[], ilha: IlhaId): Minijogo[] {
  return lista.filter((m) => m.ilha === ilha)
}

/** A capa na tela: a do minijogo mais recente da ilha que tem capa. */
export function capaDoBrinquedo(lista: readonly Minijogo[], ilha: IlhaId): string | null {
  return minijogosDaIlha(lista, ilha).find((m) => m.capa)?.capa ?? null
}
