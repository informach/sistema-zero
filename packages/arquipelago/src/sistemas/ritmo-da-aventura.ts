import { MUNDO_DA_AVENTURA } from './mundo-pela-animacao'

/** Perfis de ensaio: a escala e a altura do pulo são as mesmas. */
export const RITMOS_DA_AVENTURA = {
  referencia: {
    nome: 'Referência anterior',
    andar: MUNDO_DA_AVENTURA.andar,
    correr: MUNDO_DA_AVENTURA.correr,
    passada: 1,
    cadencia: 2,
  },
  explorar: { nome: 'Exploração', andar: 1.5, correr: 3.4, passada: 1.25, cadencia: 2.8 },
  agil: { nome: 'Ágil', andar: 1.7, correr: 3.9, passada: 1.3, cadencia: 3.1 },
} as const
export type RitmoDaAventura = keyof typeof RITMOS_DA_AVENTURA
export function ritmoDaAventura(pedido: unknown): RitmoDaAventura {
  return typeof pedido === 'string' && Object.hasOwn(RITMOS_DA_AVENTURA, pedido)
    ? (pedido as RitmoDaAventura)
    : 'explorar'
}
/** Mesma amplitude para a fase da animação e para o IK; nunca vale na água/patins/modos especiais. */
export function amplitudeDoPasso(velocidade: number, andar: number, maximo: number): number {
  return 1 + (maximo - 1) * Math.max(0, Math.min(1, velocidade / andar))
}
