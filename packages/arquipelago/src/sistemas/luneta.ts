import { ILHAS, type Ilha, type PostoDaJornada } from '@sistemazero/arquipelago-contracts'

export const PAINEL_DA_LUNETA = 'luneta'
/** Só apresentação. Ordem e regras de abertura continuam no contrato das ilhas. */
export const NOMES_DOS_POSTOS: Readonly<Record<PostoDaJornada, string>> = {
  noob: 'Faísca',
  coder: 'Construtor(a)',
  hacker: 'Inventor(a)',
  explorer: 'Explorador(a) de Mundos',
  elite: 'Mestre dos Jogos',
  architect: 'Arquiteto(a) de Mundos',
  champion: 'Gênio da Criação',
  god: 'Lenda',
}

export function ilhaDaLuneta(posicao: number): Ilha {
  const atual = Number.isFinite(posicao) ? Math.max(1, posicao) : 1
  const proxima = ILHAS.find((i) => i.angulo !== null && i.posicao > atual)
  // O Farol fica na ilha central e não depende de uma ponte.
  return proxima ?? ILHAS.find((i) => i.id === 'farol')!
}

/** O artigo do nome da ilha nas falas: "a Vila Doce", "a Ilha das Nuvens", "o Bosque dos Bichos". */
export function artigoDaIlha(ilha: Pick<Ilha, 'id'>): 'a' | 'o' {
  return ilha.id === 'vila-doce' || ilha.id === 'nuvens' ? 'a' : 'o'
}

export function falaDaLuneta(ilha: Ilha): string {
  if (ilha.id === 'farol') return 'Lá está o Farol, ao lado da sua casa.'
  return `Lá é ${artigoDaIlha(ilha)} ${ilha.nome}. A ponte abre quando você chegar a ${NOMES_DOS_POSTOS[ilha.posto]}.`
}

export function recadoDaIris(ilha: Ilha): string {
  return `Tem mais para descobrir. A ponte abre em ${NOMES_DOS_POSTOS[ilha.posto]}. Íris.`
}

export const SINAIS_DA_LUNETA = { periodo: 6, percurso: 2.6, brilhoMinimo: 0.65 } as const

/** A prévia mexe devagar; com menos movimento, o vulto e o brilho ficam estáveis. */
export function passoDaPrevia(
  tempo: number,
  menosMovimento: boolean,
  saida: { x: number; brilho: number },
): void {
  const fase = menosMovimento ? 0 : (tempo * Math.PI * 2) / SINAIS_DA_LUNETA.periodo
  saida.x = Math.sin(fase) * SINAIS_DA_LUNETA.percurso
  saida.brilho = SINAIS_DA_LUNETA.brilhoMinimo + (Math.cos(fase) + 1) * 0.175
}
