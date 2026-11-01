import {
  ILHAS,
  type Ilha,
  type LumiDeLuz,
  type PostoDaJornada,
} from '@sistemazero/arquipelago-contracts'

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

/**
 * O recado da placa na ponte quebrada. Sem assinatura: a Íris aparece só pelas páginas do diário
 * até o final (proposta; lacunas de 01/11/2026).
 */
export function recadoDaPlaca(ilha: Ilha): string {
  return `Tem mais para descobrir. A ponte abre em ${NOMES_DOS_POSTOS[ilha.posto]}.`
}

export const SINAIS_DA_LUNETA = { periodo: 6, percurso: 2.6, brilhoMinimo: 0.65 } as const

/**
 * A prévia mexe devagar: o bicho vai e volta (`x`) virado para onde corre (`rumo`, em radianos: 0 é
 * de frente para a luneta, π/2 correndo para +x) e o segredo pulsa (`brilho`). Nas pontas do
 * caminho ele vira de frente um instante, como quem dá a volta. Com menos movimento, tudo fica
 * parado e o bicho olha para a luneta.
 */
export function passoDaPrevia(
  tempo: number,
  menosMovimento: boolean,
  saida: { x: number; brilho: number; rumo: number },
): void {
  const fase = menosMovimento ? 0 : (tempo * Math.PI * 2) / SINAIS_DA_LUNETA.periodo
  saida.x = Math.sin(fase) * SINAIS_DA_LUNETA.percurso
  saida.brilho = SINAIS_DA_LUNETA.brilhoMinimo + (Math.cos(fase) + 1) * 0.175
  saida.rumo = menosMovimento ? 0 : (Math.PI / 2) * Math.max(-1, Math.min(1, Math.cos(fase) * 4))
}

/**
 * O bicho que corre pela ilha vista (um dos que moram nela; na Vila, a ovelhinha de algodão-doce feita
 * para a luneta), o clipe de correr e o de ficar parado (com menos movimento), a escala para ler de
 * longe e quanto ele voa acima do chão. A tartaruguinha tem a origem no meio do corpo.
 */
export const BICHO_DA_LUNETA = {
  bosque: { bicho: 'coelho', correr: 'correr', parado: 'parado', escala: 1.6, altura: 0 },
  'vila-doce': { bicho: 'ovelhinha', correr: 'correr', parado: 'parado', escala: 2.1, altura: 0 },
  recife: { bicho: 'tartaruguinha', correr: 'nadar', parado: 'parado', escala: 2.2, altura: 0.2 },
  pico: { bicho: 'pinguim', correr: 'deslizar', parado: 'parado', escala: 1.9, altura: 0 },
  'vale-dos-dinos': {
    bicho: 'triceratops-filhote',
    correr: 'andar',
    parado: 'parado',
    escala: 1.6,
    altura: 0,
  },
  nuvens: {
    bicho: 'passaro-das-nuvens',
    correr: 'voar',
    parado: 'pousado',
    escala: 2.4,
    altura: 1.4,
  },
} as const

export type BichoDaLuneta = (typeof BICHO_DA_LUNETA)[keyof typeof BICHO_DA_LUNETA]['bicho']

/** O bicho da ilha vista, ou nenhum (o Farol). */
export function bichoDaLuneta(
  ilha: Pick<Ilha, 'id'>,
): (typeof BICHO_DA_LUNETA)[keyof typeof BICHO_DA_LUNETA] | null {
  return ilha.id in BICHO_DA_LUNETA
    ? BICHO_DA_LUNETA[ilha.id as keyof typeof BICHO_DA_LUNETA]
    : null
}

/**
 * O segredo que brilha na ilha vista: o Lumi de luz da família dela (B12), o que só sai do baú do
 * segredo. O do Pico fica na gruta da sua ilha, mas a família é a do Pico.
 */
export const SEGREDO_DA_LUNETA = {
  bosque: 'ipe-de-luz',
  'vila-doce': 'brigadeiro-de-luz',
  recife: 'perola-de-luz',
  pico: 'cristal-de-luz',
  'vale-dos-dinos': 'brotinho-de-luz',
  nuvens: 'pluma-de-luz',
} as const satisfies Record<string, LumiDeLuz>

export function segredoDaLuneta(ilha: Pick<Ilha, 'id'>): LumiDeLuz | null {
  return ilha.id in SEGREDO_DA_LUNETA
    ? SEGREDO_DA_LUNETA[ilha.id as keyof typeof SEGREDO_DA_LUNETA]
    : null
}

/** Quem acena pela luneta em cada ilha do anel (o morador da ilha, §6.28 A18). */
export const MORADOR_DA_LUNETA = {
  bosque: 'capi',
  'vila-doce': 'bento',
  recife: 'mare',
  pico: 'floco',
  'vale-dos-dinos': 'jade',
  nuvens: 'irie',
} as const

export type MoradorDaLuneta = (typeof MORADOR_DA_LUNETA)[keyof typeof MORADOR_DA_LUNETA]

/** O morador da ilha vista, ou nenhum (o Farol não tem ponte nem morador do anel). */
export function moradorDaLuneta(ilha: Pick<Ilha, 'id'>): MoradorDaLuneta | null {
  return ilha.id in MORADOR_DA_LUNETA
    ? MORADOR_DA_LUNETA[ilha.id as keyof typeof MORADOR_DA_LUNETA]
    : null
}

/** O morador acena de tanto em tanto tempo (s); com menos movimento, fica parado olhando. */
export const ACENO_DA_LUNETA = { aCada: 4.5 } as const

export function deveAcenar(
  tempo: number,
  ultimoAceno: number,
  duracaoDoAceno: number,
  menosMovimento: boolean,
): boolean {
  if (menosMovimento) return false
  return tempo - ultimoAceno >= Math.max(ACENO_DA_LUNETA.aCada, duracaoDoAceno)
}
