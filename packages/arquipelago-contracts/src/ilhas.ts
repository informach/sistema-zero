/**
 * As oito ilhas do Arquipélago. A sua ilha fica no centro (com a casa e o Farol); as outras seis
 * ficam em volta, em anel, cada uma a uma ponte da sua casa. A ilha abre quando a pessoa chega à
 * posição da jornada dela: posto no Kids, etapa no adulto (as duas jornadas têm 8 posições, a
 * última é a Lenda). O jogo nunca concede posição: só lê.
 */
export const ILHA_IDS = [
  'sua-ilha',
  'bosque',
  'vila-doce',
  'recife',
  'pico',
  'vale-dos-dinos',
  'nuvens',
  'farol',
] as const

export type IlhaId = (typeof ILHA_IDS)[number]

export interface Ilha {
  id: IlhaId
  nome: string
  /** Posição da jornada que abre a ilha (1 = Faísca no Kids / primeira etapa no adulto). */
  posicao: number
  /** Ângulo no anel, em graus (0 = leste, sentido anti-horário visto de cima). `null` = centro. */
  angulo: number | null
}

export const ILHAS: readonly Ilha[] = [
  { id: 'sua-ilha', nome: 'Sua ilha', posicao: 1, angulo: null },
  { id: 'bosque', nome: 'Bosque dos Bichos', posicao: 2, angulo: 20 },
  { id: 'vila-doce', nome: 'Vila Doce', posicao: 3, angulo: -40 },
  { id: 'recife', nome: 'Recife Coral', posicao: 4, angulo: -100 },
  { id: 'pico', nome: 'Pico Gelado', posicao: 5, angulo: -160 },
  { id: 'vale-dos-dinos', nome: 'Vale dos Dinos', posicao: 6, angulo: 140 },
  { id: 'nuvens', nome: 'Ilha das Nuvens', posicao: 7, angulo: 80 },
  /** O Farol fica NA sua ilha, ao lado da casa: acende na Lenda. */
  { id: 'farol', nome: 'O Farol', posicao: 8, angulo: null },
]

export const POSICOES_DA_JORNADA = 8

export function ilha(id: IlhaId): Ilha {
  const encontrada = ILHAS.find((i) => i.id === id)
  if (!encontrada) throw new Error(`Ilha desconhecida: ${id}`)
  return encontrada
}

/** A ilha já tem cor (e ponte) para quem está nesta posição da jornada? */
export function ilhaAberta(id: IlhaId, posicao: number): boolean {
  return posicao >= ilha(id).posicao
}

/** As ilhas do anel (sem a sua ilha e sem o Farol), na ordem da jornada. */
export function ilhasDoAnel(): Ilha[] {
  return ILHAS.filter((i) => i.angulo !== null)
}

/**
 * Postos do Kids na ordem da jornada (espelha `StudentLevelSlug` do member-shell). A página que
 * hospeda o jogo no Kids converte o posto em posição com esta função; a do adulto já tem a
 * posição da etapa.
 */
export const POSTOS_KIDS = [
  'noob',
  'coder',
  'hacker',
  'explorer',
  'elite',
  'architect',
  'champion',
  'god',
] as const

export type PostoKids = (typeof POSTOS_KIDS)[number]

export function posicaoDoPostoKids(posto: string | null | undefined): number {
  const i = POSTOS_KIDS.indexOf(posto as PostoKids)
  return i < 0 ? 1 : i + 1
}
