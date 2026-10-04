import { FAROL_ASSETS } from './farol-assets.generated'

export { FAROL_ASSETS }
export type FarolAssetName = keyof typeof FAROL_ASSETS

/** Coordenadas do cenário original. O barco chega pelo mar, à direita da ilha. */
export const FAROL_LAYOUT = {
  palco: { w: 480, h: 360 },
  personagem: { x: 21, y: 141, w: 64, h: 64 },
  chave: { x: 211, y: 53, w: 32, h: 32 },
  farol: { x: 328, y: 40, w: 152, h: 152 },
  barco: { x: 492, y: 240, w: 88, h: 88 },
  chegadaBarcoX: 387,
  personagemNaPorta: { x: 358, y: 137, w: 64, h: 64 },
} as const

/** Frações do SVG: ignoram transparência e luz; o contato da torre fica na base. */
const porta = { x: 46 / 128, y: 105 / 128, w: 36 / 128, h: 23 / 128 }
export const FAROL_HITBOXES: Partial<
  Record<FarolAssetName, { x: number; y: number; w: number; h: number }>
> = {
  personagem: { x: 16 / 64, y: 11 / 64, w: 30 / 64, h: 53 / 64 },
  chave: { x: 3 / 32, y: 2 / 32, w: 28 / 32, h: 29 / 32 },
  'farol-apagado': porta,
  'farol-aceso': porta,
}

export function farolSvg(name: FarolAssetName): string {
  const { width, height, body } = FAROL_ASSETS[name]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}

export function farolSvgUrl(name: FarolAssetName): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(farolSvg(name))}`
}
