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

const JARDIM_SPRITE_Y: Record<JardimSpriteName, number> = {
  coelho: 181,
  arbusto: 166,
  raposa: 190,
  pedras: 185,
  coruja: 187,
  flores: 138,
}

export function jardimSpriteRect(name: JardimSpriteName, centroX: number, baseY?: number) {
  const { width, height } = JARDIM_ASSETS[name]
  return {
    x: centroX - width / 2,
    y: baseY === undefined ? JARDIM_SPRITE_Y[name] : baseY - height,
    w: width,
    h: height,
  }
}

/**
 * `cobrir`: a arte PREENCHE a caixa em que for colocada, cortando as sobras, em vez de caber
 * inteira com faixas vazias dos lados.
 *
 * ⚠️⚠️ Um `<image>` de SVG que aponta para OUTRO SVG não manda no encaixe de dentro: o
 * `preserveAspectRatio="slice"` do `<image>` de fora vale só para a caixa dele, e quem decide
 * como o desenho de 640 × 360 entra nessa caixa é a RAIZ do SVG apontado, que por padrão é
 * "meet". Foi assim que o fundo do jardim, num palco de 560 × 300, ficou com ~13 px de beirada
 * vazia de cada lado (30/09/2026): as cenas assumiam a escala 0,875 do "slice" e recebiam 0,833.
 */
export function jardimSvg(name: JardimAssetName, opcoes: { cobrir?: boolean } = {}): string {
  const { width, height, viewBox, body } = JARDIM_ASSETS[name]
  const encaixe = opcoes.cobrir ? ' preserveAspectRatio="xMidYMid slice"' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}"${encaixe}>${body}</svg>`
}

export function jardimSvgUrl(name: JardimAssetName, opcoes: { cobrir?: boolean } = {}): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(jardimSvg(name, opcoes))}`
}
