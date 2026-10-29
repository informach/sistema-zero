/**
 * As oito ilhas do Arquipélago. A sua ilha fica no centro (com a casa e o Farol); as outras seis
 * ficam em volta, em anel, cada uma a uma ponte da sua casa. A ilha abre quando a pessoa chega ao
 * POSTO dela na Jornada do Criador (no adulto, a etapa na mesma posição; as duas jornadas têm 8
 * posições, a última é a Lenda). O jogo nunca concede posto: só lê.
 *
 * Este arquivo é o ÚNICO lugar do mapa ilha → posto (decisão de 27/10/2026). O serviço do jogo
 * confere o mapa contra a jornada publicada no Members (`conferirMapaDasIlhas`).
 */
/**
 * Os postos da Jornada do Criador na ordem (espelha `JOURNEY_LEVEL_SLUGS` do core; o contrato não
 * importa o core, e o teste do serviço do jogo confere os dois). A página que hospeda o jogo no
 * Kids converte o posto em posição com `posicaoDoPostoKids`; a do adulto já tem a posição da etapa.
 */
export const POSTOS_DA_JORNADA = [
  'noob',
  'coder',
  'hacker',
  'explorer',
  'elite',
  'architect',
  'champion',
  'god',
] as const

export type PostoDaJornada = (typeof POSTOS_DA_JORNADA)[number]

export function posicaoDoPostoKids(posto: string | null | undefined): number {
  const i = POSTOS_DA_JORNADA.indexOf(posto as PostoDaJornada)
  return i < 0 ? 1 : i + 1
}

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
  /** O posto que abre a ilha (no adulto, a etapa na mesma posição). */
  posto: PostoDaJornada
  /** Posição do posto na jornada (1 = Faísca no Kids / primeira etapa no adulto). Derivada. */
  posicao: number
  /** Ângulo no anel, em graus (0 = leste, sentido anti-horário visto de cima). `null` = centro. */
  angulo: number | null
}

const MAPA: readonly Omit<Ilha, 'posicao'>[] = [
  { id: 'sua-ilha', nome: 'Sua ilha', posto: 'noob', angulo: null },
  { id: 'bosque', nome: 'Bosque dos Bichos', posto: 'coder', angulo: 20 },
  { id: 'vila-doce', nome: 'Vila Doce', posto: 'hacker', angulo: -40 },
  { id: 'recife', nome: 'Recife Coral', posto: 'explorer', angulo: -100 },
  { id: 'pico', nome: 'Pico Gelado', posto: 'elite', angulo: -160 },
  { id: 'vale-dos-dinos', nome: 'Vale dos Dinos', posto: 'architect', angulo: 140 },
  { id: 'nuvens', nome: 'Ilha das Nuvens', posto: 'champion', angulo: 80 },
  /** O Farol fica NA sua ilha, ao lado da casa: acende na Lenda. */
  { id: 'farol', nome: 'O Farol', posto: 'god', angulo: null },
]

export const ILHAS: readonly Ilha[] = MAPA.map((i) => ({
  ...i,
  posicao: posicaoDoPostoKids(i.posto),
}))

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

/** A ilha que o posto abre (cada posto abre exatamente uma). */
export function ilhaDoPosto(posto: PostoDaJornada): Ilha {
  const encontrada = ILHAS.find((i) => i.posto === posto)
  if (!encontrada) throw new Error(`Posto sem ilha: ${posto}`)
  return encontrada
}

/** As ilhas do anel (sem a sua ilha e sem o Farol), na ordem da jornada. */
export function ilhasDoAnel(): Ilha[] {
  return ILHAS.filter((i) => i.angulo !== null)
}
