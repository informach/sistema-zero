/** Arte de Cadê Todo Mundo?, compartilhada pelo projeto, caderno e experiências. */
import { JARDIM_SPRITE_BODIES } from './jardim-sprites.generated'

export const JARDIM_ASSETS = {
  jardim: {
    width: 640,
    height: 360,
    viewBox: '0 0 640 360',
    body: '<rect width="640" height="360" fill="#c7effb"/><circle cx="559" cy="67" r="36" fill="#ffec9b"/><path d="M0 250Q124 209 246 244T478 244T640 244V360H0" fill="#a9db8d"/><path d="M0 286Q130 257 256 284T512 282T640 274V360H0" fill="#70bb75"/><path d="M0 323Q98 302 184 324T376 320T640 319V360H0" fill="#54a96c"/><g fill="#f7f4cf"><circle cx="86" cy="273" r="4"/><circle cx="361" cy="273" r="4"/><circle cx="544" cy="300" r="4"/></g>',
  },
  coruja: { width: 72, height: 81, viewBox: '19 20 24 27', body: JARDIM_SPRITE_BODIES.coruja },
  pedras: { width: 161, height: 112, viewBox: '9 18 46 32', body: JARDIM_SPRITE_BODIES.pedras },
  arbusto: { width: 154, height: 116, viewBox: '10 19 44 33', body: JARDIM_SPRITE_BODIES.arbusto },
  flores: { width: 133, height: 144, viewBox: '12 11 38 41', body: JARDIM_SPRITE_BODIES.flores },
  raposa: { width: 66, height: 84, viewBox: '21 18 22 28', body: JARDIM_SPRITE_BODIES.raposa },
  coelho: { width: 54, height: 87, viewBox: '23 19 18 29', body: JARDIM_SPRITE_BODIES.coelho },
} as const

export type JardimAssetName = keyof typeof JARDIM_ASSETS
export type JardimSpriteName = Exclude<JardimAssetName, 'jardim'>

export const JARDIM_PARES = [
  { personagem: 'coelho', esconderijo: 'arbusto', centroX: 137 },
  { personagem: 'raposa', esconderijo: 'pedras', centroX: 310 },
  { personagem: 'coruja', esconderijo: 'flores', centroX: 483 },
] as const

export const JARDIM_BASE_PERSONAGENS = 268
export const JARDIM_BASE_ESCONDERIJOS = 282

export function jardimSpriteRect(name: JardimSpriteName, centroX: number, baseY: number) {
  const { width, height } = JARDIM_ASSETS[name]
  return { x: centroX - width / 2, y: baseY - height, w: width, h: height }
}

export function jardimSvg(name: JardimAssetName): string {
  const { width, height, viewBox, body } = JARDIM_ASSETS[name]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`
}

export function jardimSvgUrl(name: JardimAssetName): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(jardimSvg(name))}`
}
