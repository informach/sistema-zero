/** Exemplos didáticos: as crianças desenham as próprias artes, com estas dimensões. */
import type { ProjectAsset } from '../../../../packages/studio/src/core/project'

export function naveQuadro(frame: number) {
  return `<g shape-rendering="crispEdges"><path d="M14 2h4v4h3v9h5v4h3v7h-9v2h-8v-2H3v-7h3v-4h5V6h3z" fill="#242b55"/><path d="M14 6h4v3h1v15h-6V9h1z" fill="#a5dbff"/><path d="M7 17h4v7H5v-4h2z" fill="#508cda"/><path d="M21 17h4v3h2v4h-6z" fill="#4776b1"/><path d="M14 11h4v7h-4z" fill="#19b7bf"/><path d="M14 11h2v5h-2z" fill="#b9fff0"/><path d="M13 28h6v${frame ? 4 : 2}h-6z" fill="#ff9844"/><path d="M15 28h2v${frame ? 3 : 1}h-2z" fill="#ffe79b"/></g>`
}
export function pedraQuadro(frame: number) {
  return `<path d="M15 39 Q10 18 20 ${frame ? 3 : 7} L30 16 L36 2 L43 17 L50 7 Q58 25 50 43Z" fill="#f47b36"/><path d="M22 36 Q19 25 24 15 L32 24 L37 11 L42 25 L47 19 L44 40Z" fill="#ffd262"/><path d="M9 39 Q6 28 20 27 Q30 20 42 28 Q57 30 56 44 Q54 59 39 61 Q25 66 14 57 Q6 52 9 39Z" fill="#7f7198" stroke="#403951" stroke-width="2"/><path d="M11 38 Q11 29 23 30 L32 27 Q22 31 21 40 Q16 49 15 52 Q10 48 11 38Z" fill="#b2a3bf"/><ellipse cx="${frame ? 31 : 28}" cy="39" rx="7" ry="5" fill="#574967"/><ellipse cx="${frame ? 42 : 40}" cy="52" rx="5" ry="4" fill="#574967"/><ellipse cx="21" cy="53" rx="3" ry="2" fill="#574967"/>`
}
export function svgSheet(name: 'nave' | 'asteroide') {
  const size = name === 'nave' ? 32 : 64
  const draw = name === 'nave' ? naveQuadro : pedraQuadro
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size}" viewBox="0 0 ${size * 2} ${size}">${draw(0)}<g transform="translate(${size})">${draw(1)}</g></svg>`
}
export function artesReferencia(): ProjectAsset[] {
  return (['nave', 'asteroide'] as const).map((name) => ({
    id: `meu-jeito-referencia-${name}`,
    name,
    kind: 'image',
    source: 'upload',
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(svgSheet(name)).toString('base64')}`,
    width: name === 'nave' ? 64 : 128,
    height: name === 'nave' ? 32 : 64,
    sprite: {
      frameW: name === 'nave' ? 32 : 64,
      frameH: name === 'nave' ? 32 : 64,
      animations: [
        { name: name === 'nave' ? 'voando' : 'girando', from: 0, to: 1, fps: 8, loop: true },
      ],
    },
  }))
}
