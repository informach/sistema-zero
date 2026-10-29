import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { type SinaisDePausa, salvamentoPausado } from './pausa'

/** A Lenda já acende o Farol no jogo. */
export const POSICAO_DO_FINAL = 8
/** Tempo de cada ilha iluminada. Seis ilhas, sem prazo para ler a página. */
export const SEGUNDOS_POR_FACHO = 2
/** Afastamento suave da varanda para a vista do anel, antes dos fachos. */
export const SEGUNDOS_DA_VISTA = 3
export const PAINEL_DO_FINAL = 'final-do-farol'
export const PAINEL_DA_IRIS = 'iris'

export const ULTIMA_PAGINA = [
  'Guardei meus rascunhos com medo de que não fossem bons o bastante. Foi dos rascunhos trancados que o Cinza nasceu.',
  'Antes de partir, deixei minha primeira faísca de criatividade para guiar quem viesse depois. Essa faísca é o Zappy.',
  'O Farol, ao lado da sua casa, se acende com a luz de tudo o que você e as pessoas da comunidade criaram.',
  'Agora a luz alcança as seis ilhas. Posso voltar para casa.',
] as const
export const FALA_FINAL_DO_ZAPPY =
  'Eu sou a primeira faísca da Íris. As suas criações e as da comunidade trouxeram luz ao Farol. Há lugar para os rascunhos também.'
export const VOLTA_DA_IRIS = [
  'Voltei para casa. Obrigada por abrir meus rascunhos.',
  'Agora quero criar junto. Um rascunho pode ser o começo de uma ideia.',
] as const

export function podeSubirOFarol(jornada: number, visitando = false): boolean {
  return Number.isFinite(jornada) && jornada >= POSICAO_DO_FINAL && !visitando
}

export function fachosAcesos(segundos: number, menosMovimento: boolean): number {
  const inicio = menosMovimento ? 0 : SEGUNDOS_DA_VISTA
  return Math.max(0, Math.min(6, Math.floor((segundos - inicio) / SEGUNDOS_POR_FACHO) + 1))
}

export function finalTerminou(segundos: number, menosMovimento: boolean): boolean {
  return segundos >= (menosMovimento ? 0 : SEGUNDOS_DA_VISTA) + 6 * SEGUNDOS_POR_FACHO
}

/** O painel do próprio final segura o corpo, mas não pausa sua sequência. */
export function finalPausado(s: SinaisDePausa, visivel: boolean): boolean {
  return (
    !visivel ||
    s.menuAberto ||
    s.ferramentaAberta ||
    s.tempoAcabou ||
    s.tempoPausado ||
    s.tempoSincronizando ||
    salvamentoPausado(s.salvamentoSituacao) ||
    s.resultado !== null ||
    (s.painelAberto !== null && s.painelAberto !== PAINEL_DO_FINAL)
  )
}

export const IRIS_EM_CASA = {
  /** Parâmetros de interação iguais aos demais moradores. */
  olharDe: 7,
  alcance: 2.2,
  acenoACada: 45,
  rapidezDoGiro: 3,
  /** iris.glb: cabeça x ±0,488558; topo da pele y 2,127988. Sem chapéu ou braços. */
  raio: 0.49,
  altura: 2.13,
  /** Centro vertical da cabeça, entre 1,279 e 2,128. */
  alturaDaCabeca: (1.279 + 2.128) / 2,
} as const

export function conversarComAIris(salvamento: Salvamento) {
  return { salvamento, falas: [...VOLTA_DA_IRIS] }
}

/** Corte próprio, 600 ms de tempo ativo; o meio fica opaco para trocar o ambiente. */
export const DURACAO_DO_CORTE = 0.6
export function opacidadeDoCorte(tempo: number): number {
  return Math.max(0, Math.min(1, tempo / 0.26, (DURACAO_DO_CORTE - tempo) / 0.26))
}

/** A saída só está no chão da ilha depois do corte e de a física atender o teleporte. */
export function foraDaPassagemDoFarol(
  s: { etapa: string; corte: number | null },
  teleportePendente: boolean,
): boolean {
  return s.etapa === 'fora' && s.corte === null && !teleportePendente
}
