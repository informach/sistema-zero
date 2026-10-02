import type { ProjectAsset } from '../core/project'

function asset(name: string, width: number, height: number, drawing: string): ProjectAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${drawing}</svg>`
  return {
    id: `snow-${name}`,
    name,
    kind: 'image',
    source: 'library',
    width,
    height,
    dataUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
  }
}

/** Original art; backgrounds share the same artboard and preserve empty/transparent areas. */
export const SNOW_DESCENT_ASSETS: ProjectAsset[] = [
  asset(
    'neve-ceu',
    640,
    720,
    '<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#70c9e8"/><stop offset="1" stop-color="#eafaff"/></linearGradient></defs><path fill="url(#s)" d="M0 0h640v720H0z"/><circle cx="515" cy="92" r="35" fill="#fff4c6"/><path d="M50 88h95m340 61h95M208 48h110" stroke="#effbff" stroke-width="12" stroke-linecap="round" opacity=".65"/>',
  ),
  asset(
    'neve-montanhas',
    640,
    720,
    '<path fill="#73a8cb" d="M0 255V178L80 77l99 144L300 50l98 151L474 89l166 135v90z"/><path fill="#ebf7ff" d="m28 143 52-66 47 69-33-14-18 13-19-20zm194 19L300 50l65 100-38-18-28 20-26-26zm210-20 42-53 52 44-31-8-16 13-16-15z"/><path fill="#a1cee2" d="M0 262v-49l94-44 76 75 97-43 61 39 98-63 97 67 67-46 50 37v85z"/>',
  ),
  asset(
    'neve-pista',
    640,
    720,
    '<path fill="#f7fbff" d="M310 199h22L640 286v434H0V286z"/><path fill="#d1e9f3" d="m310 199-93 68-118 28 40 12-93 45 42 20L0 442V286zm22 0 85 68 125 28-40 12 93 45-42 20 87 70V286z"/><path d="m309 227-73 119-45 161-24 213m162-493 73 119 45 161 24 213" stroke="#e7f1f7" stroke-width="3" fill="none"/>',
  ),
  asset(
    'neve-brilho',
    640,
    720,
    '<g fill="#fff" opacity=".75"><circle cx="44" cy="158" r="3"/><circle cx="580" cy="328" r="4"/><circle cx="32" cy="590" r="5"/><circle cx="610" cy="610" r="6"/><circle cx="88" cy="392" r="2"/><circle cx="525" cy="180" r="3"/></g>',
  ),
  asset(
    'neve-esquiador',
    52,
    84,
    '<ellipse cx="26" cy="76" rx="23" ry="6" fill="#789eb2" opacity=".2"/><path d="m12 58-5 21m30-21 8 21" stroke="#ee5f42" stroke-width="6" stroke-linecap="round"/><path d="m19 49-6 16m20-16 6 16" stroke="#283e58" stroke-width="8" stroke-linecap="round"/><path d="M10 37Q26 24 42 37l-6 19H16z" fill="#f99143"/><path d="m12 38-7 12m35-12 7 12" stroke="#ffb166" stroke-width="7" stroke-linecap="round"/><path d="m4 44-2 20m46-20 2 20" stroke="#3a516a" stroke-width="2"/><circle cx="26" cy="20" r="17" fill="#df633f"/><path d="M10 21Q10 1 26 1t16 20" fill="#ffb34d"/><rect x="11" y="15" width="30" height="12" rx="6" fill="#263f60"/><path d="m16 18 10 0" stroke="#b8ebf6" stroke-width="3" stroke-linecap="round"/><path d="M34 34 50 38l-4 8-15-7" fill="#f0614e"/>',
  ),
  asset(
    'neve-bandeira',
    52,
    112,
    '<ellipse cx="26" cy="105" rx="24" ry="6" fill="#9abfcf" opacity=".35"/><path d="M9 8v96m34-96v96" stroke="#405575" stroke-width="5" stroke-linecap="round"/><path d="M10 12h32v38H10z" fill="#ef6270"/><path d="m12 42 27-27" stroke="#fff1df" stroke-width="8"/>',
  ),
  asset(
    'neve-estrela',
    48,
    48,
    '<circle cx="24" cy="24" r="23" fill="#ffe28c" opacity=".25"/><path d="m24 3 6 13 15 2-11 11 3 15-13-7-13 7 3-15L3 18l15-2z" fill="#ffd159" stroke="#d78f2e" stroke-width="2"/><path d="m24 10-3 9-9 2" fill="none" stroke="#fff4ba" stroke-width="3" stroke-linecap="round"/>',
  ),
  asset(
    'neve-pinheiro',
    100,
    150,
    '<ellipse cx="50" cy="141" rx="48" ry="8" fill="#759eae" opacity=".25"/><path d="M44 108h12v35H44z" fill="#8a6a55"/><path d="m50 4 26 48H64l27 40H74l26 36H0l26-36H9l27-40H24z" fill="#2f8390"/><path d="m50 4 26 48-26-11-26 11zm-21 60 21 13 21-13 20 28-41-8L9 92zm-5 38 26 15 26-15 24 26H0z" fill="#e5f5fa"/>',
  ),
  asset(
    'neve-gelo',
    160,
    44,
    '<ellipse cx="80" cy="22" rx="78" ry="20" fill="#c3e7f4"/><path d="m20 22 34-7m16 13 41-8m8-3 18-4" stroke="#f0fbff" stroke-width="4" stroke-linecap="round"/>',
  ),
]

export interface SnowCourseObject {
  kind: 'star' | 'flag' | 'pine' | 'ice'
  x: number
  z: number
  w: number
  h: number
}
export const SNOW_COURSE: SnowCourseObject[] = []
for (let index = 0; index < 12; index++) {
  const lane = [-80, 0, 80, 0][index % 4] ?? 0
  const z = 600 + index * 480
  SNOW_COURSE.push({ kind: 'star', x: lane, z, w: 22, h: 22 })
  SNOW_COURSE.push({ kind: 'flag', x: -lane || 70, z: z + 240, w: 28, h: 60 })
  SNOW_COURSE.push({ kind: 'ice', x: lane / 2, z: z + 330, w: 150, h: 32 })
}
for (let index = 0; index < 36; index++) {
  SNOW_COURSE.push({
    kind: 'pine',
    x: -210 - (index % 3) * 30,
    z: 280 + index * 180,
    w: 90,
    h: 135,
  })
  SNOW_COURSE.push({ kind: 'pine', x: 210 + (index % 3) * 30, z: 340 + index * 180, w: 90, h: 135 })
}
SNOW_COURSE.sort((a, b) => a.z - b.z)

// Two frames of the original drawing: a slight sway while skiing. The named
// animation follows the same metadata contract as a drawing saved in Pinta.
const skier = SNOW_DESCENT_ASSETS.find((item) => item.name === 'neve-esquiador')!
const drawing = atob(skier.dataUrl.split(',')[1]!)
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>$/, '')
const animatedSkier = asset(
  'neve-esquiador-animado',
  104,
  84,
  `<g>${drawing}</g><g transform="translate(52 0)"><g transform="rotate(2 26 60)">${drawing}</g></g>`,
)
animatedSkier.sprite = {
  frameW: 52,
  frameH: 84,
  animations: [{ name: 'deslizar', from: 0, to: 1, fps: 6, loop: true }],
}
SNOW_DESCENT_ASSETS.push(animatedSkier)
