import {
  NINHOS_DO_VALE,
  type NinhoDoVale,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import type { PontoNoChao } from './caminho'

export const EXPLORACAO_DO_VALE = {
  /** Mesmo alcance de conversa da Jade. */
  alcance: 2.2,
  /** Dar espaço depois de observar, sem contar tempo. */
  afastamento: 3,
  /** Folga para seguir os três pontos do rastro sem andar sobre cada marca. */
  pertoDaPegada: 1.3,
  /** Grade de 12,5 cm para a passagem estreita entre cerca e costelas. */
  grade: 0.125,
  /** Metade da folga do corpo: evita raspar quinas sem fechar a passagem da cerca. */
  folgaDoCaminho: 0.03,
  /** Alternância das marcas ao lado do centro do caminho. */
  lado: 0.13,
  /** Pegada maior que a dos bichos do Bosque, com passos a cada 70 cm. */
  tamanhoDaPegada: 0.6,
  passo: 0.7,
  /** Osso do GLB tem 1,56 m de largura: reservar 0,8 m ao redor do centro. */
  raioDoOsso: 0.8,
} as const

export const ACOES_DA_ESCAVACAO = [
  'Tirar areia com cuidado',
  'Limpar com o pincel',
  'Observar o fóssil',
] as const
export const FALAS_DA_ESCAVACAO = [
  'Um pedaço de osso apareceu. Use o pincel para tirar o resto da areia.',
  'O osso ficou à mostra. Agora observe o fóssil.',
  'Você descobriu um osso fossilizado. Ele ficou registrado no seu diário.',
] as const

/** Não há cronômetro: pausa, leitura e repetição nunca avançam nem apagam conquistas. */
export function escavarNoVale(s: Salvamento, podeAgir: boolean): Salvamento {
  if (!podeAgir || s.vale.escavacao === 3) return s
  return { ...s, vale: { ...s.vale, escavacao: s.vale.escavacao + 1 } }
}
export function registrarPegadasDoVale(s: Salvamento, podeAgir: boolean): Salvamento {
  if (!podeAgir || s.vale.pegadas) return s
  return { ...s, vale: { ...s.vale, pegadas: true } }
}
export function cuidarDoNinho(s: Salvamento, ninho: NinhoDoVale, podeAgir: boolean): Salvamento {
  if (!podeAgir || s.vale.ninhos.includes(ninho)) return s
  return { ...s, vale: { ...s.vale, ninhos: [...s.vale.ninhos, ninho] } }
}
export function todosOsNinhosCuidados(s: Salvamento): boolean {
  return NINHOS_DO_VALE.every((id) => s.vale.ninhos.includes(id))
}
/** Só o próximo ponto conta: encontrar o fim por outro caminho não finge que seguiu o rastro. */
export function seguirPegadasDoVale(
  indice: number,
  pontos: readonly PontoNoChao[],
  p: PontoNoChao,
  podeAgir: boolean,
): number {
  const alvo = pontos[indice]
  return podeAgir &&
    alvo &&
    Math.hypot(p.x - alvo.x, p.z - alvo.z) <= EXPLORACAO_DO_VALE.pertoDaPegada
    ? indice + 1
    : indice
}
export function deuEspacoAoNinho(ninho: PontoNoChao, p: PontoNoChao, podeAgir: boolean): boolean {
  return podeAgir && Math.hypot(p.x - ninho.x, p.z - ninho.z) >= EXPLORACAO_DO_VALE.afastamento
}
