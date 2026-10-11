/**
 * As classes dos botões da área dos pais, em pílula de 44px (o 3D do Brilliant vem da classe).
 *
 * ⚠️ Moram FORA do `parent-ui.tsx` de propósito: aquele módulo é `'use client'`, e num Server
 * Component (a Ajuda) todo export dele vira uma referência de cliente, ou seja, uma função. A
 * string chegava ao `className` como o código dessa função e o botão perdia o desenho.
 */
export const PRIMARY_ACTION = 'sz-btn-gradient h-11 gap-2 px-5 text-sm'
export const SECONDARY_ACTION = 'sz-btn-gradient sz-btn-contorno h-11 gap-2 px-5 text-sm'
/** O "Ir para a área da criança" da barra: mais estreito no celular, onde a barra é apertada. */
export const HEADER_ACTION = 'sz-btn-gradient h-11 gap-2 whitespace-nowrap px-3 text-sm sm:px-5'
