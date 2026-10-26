/**
 * Vampire Survivor: as árvores, as ruínas e as pedras que o mapa espalha (camada "Objetos").
 * Cada objeto fica no PÉ do quadro, centralizado, e ocupa exatamente o tamanho do original
 * (o jogo recorta a área pintada: é ela que vira a caixa de colisão).
 */
import type { SpriteDrawing } from '../../drawing'
import { Px, random } from '../../pixel'

const INK = '#1d1420'
const LEAF = ['#173a26', '#21512c', '#2f6c33', '#468a3a', '#68a845', '#93c95a'] as const
const PALM = ['#1a4a2a', '#2a6a30', '#3f8a35', '#62ad42', '#90cf5a'] as const
const SNOW = ['#355a6e', '#5f8fa6', '#a9cede', '#e3f1f6', '#ffffff'] as const
const BARK = ['#3a2219', '#5e3726', '#80503a', '#a2704f'] as const
const STONE = ['#4b3a35', '#6e5a4e', '#958069', '#baa486', '#ddcca9', '#f1e6c8'] as const
const BOULDER = ['#3d2a25', '#6a4636', '#8f6346', '#b58459', '#d4a876'] as const
const MOSS = ['#2f5a2a', '#467d33', '#6a9f3e'] as const
const GROUND_GRASS = ['#24452a', '#33612e'] as const
const GROUND_SAND = ['#9c6c45', '#bf8d55'] as const

/** Sombra oval no chão, sob o objeto (a luz vem de cima à esquerda). */
function groundShadow(p: Px, h: number, colors: readonly [string, string]) {
  // Ocupa a largura toda do objeto: é a base dele no chão.
  p.ellipse(0, p.height - h, p.width, h, colors[1])
  p.ellipse(3, p.height - h + 1, p.width - 6, h - 2, colors[0])
}

function shadeRound(
  p: Px,
  cx: number,
  cy: number,
  r: number,
  ramp: readonly string[],
  seed: number,
) {
  const rng = random(seed)
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      const color = p.get(x, y)
      if (color !== ramp[2]) continue
      const light = -((x - cx) / r + (y - cy) / r) + (rng.next() - 0.5) * 0.5
      p.set(
        x,
        y,
        light > 0.9
          ? ramp[4]!
          : light > 0.25
            ? ramp[3]!
            : light < -0.8
              ? ramp[0]!
              : light < -0.2
                ? ramp[1]!
                : ramp[2]!,
      )
    }
}

function trunk(p: Px, cx: number, top: number, bottom: number, half: number) {
  p.rect(cx - half, top, half * 2, bottom - top, BARK[1])
  p.rect(cx - half, top, Math.max(1, Math.floor(half / 2)), bottom - top, BARK[2])
  p.rect(cx + half - 1, top, 1, bottom - top, BARK[0])
  // Raízes.
  p.rect(cx - half - 2, bottom - 2, half * 2 + 4, 2, BARK[1]).set(
    cx - half - 2,
    bottom - 2,
    BARK[2],
  )
}

/** Copa de pinheiro: camadas de "saias" do topo até a base. */
function pine(w: number, h: number, ramp: readonly string[], seed: number, snow = false): Px {
  const p = new Px(w, h)
  const cx = w / 2
  groundShadow(p, Math.max(6, Math.round(h * 0.12)), GROUND_GRASS)
  trunk(p, Math.floor(cx), Math.floor(h * 0.72), h - 3, Math.max(2, Math.round(w * 0.06)))
  const tiers = 4
  const crownTop = 0
  const crownBottom = Math.floor(h * 0.8)
  for (let tier = 0; tier < tiers; tier++) {
    const t0 = crownTop + ((crownBottom - crownTop) * tier) / (tiers + 0.6)
    const t1 = crownTop + ((crownBottom - crownTop) * (tier + 1.6)) / (tiers + 0.6)
    const half = (w / 2 - 1) * (0.4 + 0.6 * ((tier + 1) / tiers))
    // A saia: o bico em cima e a barra de baixo em zigue-zague (pontas dos galhos).
    const teeth = 6
    const skirt: [number, number][] = [[cx, t0]]
    for (let i = 0; i <= teeth; i++)
      skirt.push([cx + half - (2 * half * i) / teeth, t1 - (i % 2 === 0 ? 0 : 3)])
    p.polygon(skirt, ramp[2]!)
  }
  shadeRound(p, cx - w * 0.15, h * 0.3, w * 0.45, ramp, seed)
  if (snow) {
    const rng = random(seed + 3)
    for (let y = 1; y < p.height; y++)
      for (let x = 0; x < p.width; x++) {
        const above = p.get(x, y - 1)
        const here = p.get(x, y)
        if (
          here &&
          ramp.includes(here) &&
          (above === null || !ramp.includes(above)) &&
          rng.chance(0.85)
        ) {
          p.set(x, y, SNOW[4])
          if (rng.chance(0.6)) p.set(x, y + 1, SNOW[3])
        }
      }
  }
  p.outline(INK)
  return p
}

/** Árvore frondosa: nuvem de folhas redondas. */
function bushy(w: number, h: number, seed: number): Px {
  const p = new Px(w, h)
  const cx = w / 2
  groundShadow(p, 10, GROUND_GRASS)
  trunk(p, Math.floor(cx), Math.floor(h * 0.55), h - 4, 4)
  p.polygon(
    [
      [cx - 4, h - 22],
      [cx - 12, h - 30],
      [cx - 9, h - 32],
      [cx - 2, h - 26],
    ],
    BARK[1],
  )
  const blobs: [number, number, number][] = [
    [cx, 22, 18],
    [cx - 15, 32, 14],
    [cx + 15, 32, 14],
    [cx - 10, 47, 14],
    [cx + 11, 46, 14],
    [cx, 40, 16],
    [cx, 12, 11],
  ]
  for (const [x, y, r] of blobs) p.circle(x, y, r, LEAF[3])
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) if (p.get(x, y) === LEAF[3]) p.set(x, y, LEAF[2])
  shadeRound(p, cx - 12, 14, 30, LEAF, seed)
  // Cachos de folhas claras (luz de cima).
  const rng = random(seed + 9)
  for (let i = 0; i < 26; i++) {
    const x = rng.int(6, w - 8)
    const y = rng.int(4, 54)
    if (p.get(x, y) && p.get(x + 2, y + 2)) {
      p.set(x, y, LEAF[5])
        .set(x + 1, y, LEAF[4])
        .set(x, y + 1, LEAF[4])
      p.set(x + 1, y + 2, LEAF[1])
    }
  }
  p.outline(INK)
  return p
}

/** Palmeira: tronco curvo em anéis e folhas em leque. */
function palm(w: number, h: number, bend: number, seed: number, small = false): Px {
  const p = new Px(w, h)
  const cx = w / 2
  groundShadow(p, small ? 6 : 10, GROUND_SAND)
  const fronds = small ? 5 : 7
  const length = small ? 13 : 30
  const droop = small ? 4 : 12
  const leaf = (f: number, t: number) => {
    const angle = Math.PI + (Math.PI * f) / (fronds - 1) + (f % 2 ? 0.1 : -0.05)
    return {
      dx: Math.cos(angle) * length * t,
      dy: Math.sin(angle) * length * t * 0.75 + droop * t * t,
      width: Math.max(1, (small ? 3 : 5) * Math.sin(Math.PI * Math.min(1, t * 1.2))),
    }
  }
  // A copa encosta no topo do quadro (o objeto tem exatamente a altura do original).
  let highest = 0
  for (let f = 0; f < fronds; f++)
    for (let s = 0; s <= length; s++) {
      const { dy, width } = leaf(f, s / length)
      highest = Math.min(highest, dy - width / 2)
    }
  const topY = Math.ceil(-highest)
  const baseY = h - 4
  const head = { x: cx + bend, y: topY }
  // Tronco curvo, linha a linha, com os anéis da palmeira a cada poucos pixels.
  const ring = small ? 3 : 4
  for (let y = baseY; y >= topY; y--) {
    const t = (baseY - y) / (baseY - topY)
    const x = Math.round(cx + bend * t * t)
    const half = Math.max(1, Math.round((small ? 2.5 : 4.5) - t * (small ? 1 : 1.5)))
    const band = (baseY - y) % ring === 0
    p.rect(x - half, y, half * 2, 1, band ? BARK[0] : BARK[2])
    if (!band) p.set(x - half, y, BARK[3]).set(x + half - 1, y, BARK[1])
  }
  for (let f = 0; f < fronds; f++)
    for (let s = 0; s <= length; s++) {
      const { dx, dy, width } = leaf(f, s / length)
      const x = head.x + dx
      const y = head.y + dy
      p.ellipse(x - width / 2, y - width / 2, width, width, f % 2 ? PALM[2] : PALM[3])
      p.set(x, y, PALM[1])
    }
  // Cocos.
  if (!small)
    for (const [dx, dy] of [
      [-3, 3],
      [2, 4],
      [-1, 6],
    ] as const)
      p.circle(head.x + dx, head.y + dy, 2.2, BARK[1]).set(
        head.x + dx - 1,
        head.y + dy - 1,
        BARK[3],
      )
  shadeRound(p, head.x - 10, head.y - 10, 26, PALM, seed)
  p.outline(INK)
  return p
}

/** Coluna de pedra: base, fuste com caneluras e capitel (ou o topo quebrado). */
function pillar(w: number, h: number, top: 'capitel' | 'quebrado' | 'rachado', seed: number): Px {
  const p = new Px(w, h)
  const rng = random(seed)
  p.ellipse(1, h - 7, w - 2, 7, GROUND_SAND[1])
  p.rect(2, h - 9, w - 4, 6, STONE[3])
    .rect(2, h - 9, w - 4, 1, STONE[5])
    .rect(2, h - 4, w - 4, 1, STONE[1])
  const shaftTop = top === 'capitel' ? 9 : 0
  const left = 6
  const right = w - 6
  for (let y = shaftTop; y < h - 9; y++)
    for (let x = left; x < right; x++) {
      const flute = (x - left) % 5
      p.set(
        x,
        y,
        x === left ? STONE[5] : flute === 0 ? STONE[2] : flute === 1 ? STONE[4] : STONE[3],
      )
    }
  p.rect(right - 2, shaftTop, 2, h - 9 - shaftTop, STONE[1])
  if (top === 'capitel') {
    p.rect(1, 0, w - 2, 5, STONE[3])
      .rect(1, 0, w - 2, 1, STONE[5])
      .rect(1, 4, w - 2, 1, STONE[1])
    p.rect(4, 5, w - 8, 4, STONE[4]).rect(4, 8, w - 8, 1, STONE[2])
  } else {
    // Topo quebrado: um corte em zigue-zague, com o miolo mais claro.
    let edge = 0
    for (let x = left; x < right; x++) {
      edge = Math.max(0, Math.min(9, edge + rng.int(-2, 2)))
      for (let y = 0; y < edge; y++) p.set(x, y, null)
      p.set(x, edge, STONE[5])
    }
    p.set(left, 0, STONE[5])
    if (top === 'rachado') {
      let x = left + 8
      for (let y = 10; y < h - 14; y += 2) {
        x += rng.int(-1, 1)
        p.set(x, y, STONE[1]).set(x, y + 1, STONE[1])
      }
    }
  }
  // Musgo no pé.
  for (let x = left; x < right; x++)
    if (rng.chance(0.5)) p.set(x, h - 10 - rng.int(0, 2), MOSS[rng.int(0, 2)]!)
  p.outline(INK)
  return p
}

function boulder(w: number, h: number, sand: boolean, seed: number): Px {
  const p = new Px(w, h)
  const rng = random(seed)
  p.ellipse(0, h - 7, w, 7, sand ? GROUND_SAND[0] : GROUND_GRASS[0])
  const lumps: [number, number, number][] = [
    [w * 0.5, w * 0.33 + 1, w * 0.33],
    [w * 0.3, h * 0.6, w * 0.27],
    [w * 0.7, h * 0.6, w * 0.27],
  ]
  for (const [x, y, r] of lumps) p.circle(x, y, r, BOULDER[2])
  shadeRound(p, w * 0.35, h * 0.35, w * 0.4, BOULDER, seed)
  if (!sand)
    for (let x = 2; x < w - 2; x++)
      if (rng.chance(0.55))
        for (let k = 0; k < rng.int(1, 3); k++) p.set(x, h - 4 - k, MOSS[k % 3]!)
  p.outline(INK)
  // O desenho encosta nas quatro bordas: é ele que vira a caixa do objeto.
  return p
}

/** Põe o objeto (w×h) no pé do quadro, centralizado, e confere que ele ocupa o tamanho todo. */
function place(name: string, object: Px, frameWidth: number, frameHeight: number): Px {
  const frame = new Px(frameWidth, frameHeight)
  const x = Math.floor((frameWidth - object.width) / 2)
  frame.draw(object, x, frameHeight - object.height)
  let [left, top, right, bottom] = [Infinity, Infinity, -1, -1]
  for (let y = 0; y < object.height; y++)
    for (let ox = 0; ox < object.width; ox++)
      if (object.get(ox, y) !== null) {
        left = Math.min(left, ox)
        right = Math.max(right, ox)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
  if (left !== 0 || top !== 0 || right !== object.width - 1 || bottom !== object.height - 1)
    throw new Error(
      `${name}: o desenho não ocupa ${object.width}x${object.height} (${left},${top}..${right},${bottom})`,
    )
  return frame
}

function still(name: string, frame: Px) {
  return { name, fps: 1, loop: true, frames: [frame] }
}

export function objectDrawings(): SpriteDrawing[] {
  const T = (name: string, art: Px) => still(name, place(name, art, 64, 96))
  const R = (name: string, art: Px) => still(name, place(name, art, 32, 96))
  return [
    {
      kind: 'sprite',
      name: 'arvores',
      frameWidth: 64,
      frameHeight: 96,
      animations: [
        T('pinheiro', pine(64, 96, LEAF, 3)),
        T('frondosa', bushy(64, 96, 5)),
        T('nevada', pine(64, 96, SNOW, 7, true)),
        T('palmeira', palm(64, 96, 6, 11)),
        T('palmeira-curva', palm(64, 96, -9, 13)),
        T('pinheirinho', pine(32, 64, LEAF, 17)),
        T('palmeirinha', palm(32, 64, 2, 19, true)),
      ],
    },
    {
      kind: 'sprite',
      name: 'pedras-e-ruinas',
      frameWidth: 32,
      frameHeight: 96,
      animations: [
        R('pilar', pillar(32, 96, 'capitel', 23)),
        R('pilar-quebrado', pillar(32, 52, 'quebrado', 29)),
        R('pilar-rachado', pillar(32, 64, 'rachado', 31)),
        R('pedra-grama', boulder(30, 30, false, 37)),
        R('pedra-grama-2', boulder(28, 30, false, 41)),
        R('pedra-areia', boulder(30, 30, true, 43)),
        R('pedra-areia-2', boulder(28, 30, true, 47)),
      ],
    },
  ]
}
