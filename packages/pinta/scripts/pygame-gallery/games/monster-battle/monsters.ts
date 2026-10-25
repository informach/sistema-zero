/**
 * The sixteen monsters. Each one is designed once, facing left, in a 100×100 box with the feet
 * on y = 100; the back view is the same creature turned away (mirrored, no face, the back
 * markings), bigger and cut at the bottom like the original game's camera behind the player.
 */
import { type Color, darken, Px } from '../../pixel'
import { bounds, crop, Painter, type Painter as PainterType, type Ramp } from './kit'
import { fin, flame, leaf, leafMask, leg, marking, starPoints, tones, WHITE } from './parts'

type P = PainterType
export interface MonsterDesign {
  name: string
  /** Biggest side of the front and back views, Pinta pixels. */
  front: number
  back: number
  /** Part of the back view hidden below the screen. */
  cut?: number
  ink: Color
  draw(P: P, back: boolean): void
}

// ---------------------------------------------------------------------------------------- fire

const sparchu: MonsterDesign = {
  name: 'Sparchu',
  front: 92,
  back: 124,
  ink: '#3a160c',
  draw(P, back) {
    const fur = tones('#f08a3a')
    const cream = tones('#ffe3b0')
    const ember = tones('#b8401e')
    // Tail with a flame at the tip.
    P.tube(
      [
        [66, 88],
        [86, 76],
        [92, 56],
        [86, 40],
      ],
      15,
      9,
      fur,
    )
    flame(P, 86, 40, 9, 2, 2.4)
    // Back legs, body, front legs.
    P.ball(70, 90, 10, 9, fur)
    const body = P.mask().ellipse(56, 76, 24, 19)
    P.fill(body, fur)
    marking(
      P,
      body,
      (m) => {
        for (const x of [56, 66, 74])
          m.curve(
            [
              [x, 58],
              [x + 4, 70],
              [x + 2, 82],
            ],
            3.4,
            2,
          )
      },
      back ? ember[2]! : ember[1]!,
    )
    if (!back) P.ball(46, 80, 12, 12, cream, { seam: false })
    leg(P, 44, 82, 40, 97, 9, fur)
    leg(P, 58, 86, 56, 98, 9, fur)
    // Ears behind the head.
    P.shape(
      [
        [30, 40],
        [16, 6],
        [42, 30],
      ],
      fur,
    )
    P.shape(
      [
        [44, 34],
        [54, 4],
        [58, 36],
      ],
      fur,
    )
    if (!back) {
      P.shape(
        [
          [29, 34],
          [20, 13],
          [37, 29],
        ],
        ember,
        { seam: false },
      )
      P.shape(
        [
          [47, 30],
          [53, 12],
          [55, 32],
        ],
        ember,
        { seam: false },
      )
    }
    const head = P.mask().ellipse(38, 48, 20, 17)
    P.fill(head, fur)
    if (back) {
      marking(
        P,
        head,
        (m) =>
          m.curve(
            [
              [40, 33],
              [44, 44],
              [42, 56],
            ],
            4,
            2,
          ),
        ember[1]!,
      )
      return
    }
    P.ball(28, 56, 12, 8, cream, { seam: false })
    P.ball(20, 54, 8, 6, cream)
    P.dot(13.5, 52, 2.6, '#3a160c')
    P.eye(31, 45, 5, '#6a2c10', '#2a0e06')
    P.stroke(
      [
        [18, 60],
        [24, 62],
      ],
      1.2,
      ember[0]!,
    )
  },
}

const cindrill: MonsterDesign = {
  name: 'Cindrill',
  front: 124,
  back: 126,
  ink: '#33140c',
  draw(P, back) {
    const shell = tones('#b9533a')
    const skin = tones('#e3a464')
    // Tail with fire.
    P.tube(
      [
        [80, 80],
        [94, 74],
        [102, 62],
      ],
      12,
      7,
      skin,
    )
    flame(P, 102, 62, 8, 3, 2.6)
    leg(P, 78, 84, 80, 98, 11, skin)
    leg(P, 40, 86, 36, 98, 11, skin)
    // The banded shell.
    const dome = P.mask().ellipse(58, 62, 34, 28)
    dome.ellipse(58, 92, 40, 12, true)
    P.fill(dome, shell, { reach: 9 })
    marking(
      P,
      dome,
      (m) => {
        for (const x of [38, 50, 62, 74, 86])
          m.curve(
            [
              [x - 4, 34],
              [x, 60],
              [x - 2, 86],
            ],
            2.4,
            2,
          )
      },
      shell[0]!,
    )
    marking(
      P,
      dome,
      (m) => {
        for (const x of [44, 56, 68, 80])
          m.curve(
            [
              [x - 3, 40],
              [x, 60],
              [x - 2, 80],
            ],
            1.2,
            1,
          )
      },
      shell[3]!,
    )
    leg(P, 52, 84, 50, 98, 11, skin)
    leg(P, 86, 82, 90, 96, 9, skin)
    if (back) {
      // Seen from behind: the shell, the tail and the ears.
      P.shape(
        [
          [26, 46],
          [20, 18],
          [36, 40],
        ],
        skin,
      )
      return
    }
    // Head and long snout.
    P.shape(
      [
        [22, 46],
        [16, 18],
        [32, 42],
      ],
      skin,
    )
    P.shape(
      [
        [30, 46],
        [34, 20],
        [40, 46],
      ],
      skin,
    )
    P.ball(26, 62, 15, 13, skin)
    P.tube(
      [
        [16, 64],
        [6, 70],
      ],
      11,
      8,
      skin,
    )
    P.dot(2.5, 70, 2.4, '#33140c')
    P.eye(22, 58, 4.4, '#5a2210', '#2a0e06')
    P.ball(30, 72, 6, 4, tones('#f0866a'), { seam: false })
  },
}

const charmadillo: MonsterDesign = {
  name: 'Charmadillo',
  front: 126,
  back: 126,
  ink: '#1a0f12',
  draw(P, back) {
    const armor = tones('#5a4648', '#ffd8b0', '#120a14')
    const belly = tones('#e58a3a')
    const lava = '#ff8a2a'
    // Tail with fire.
    P.tube(
      [
        [70, 86],
        [90, 92],
        [104, 80],
        [108, 64],
      ],
      16,
      8,
      armor,
    )
    flame(P, 108, 64, 9, 2, 2.8)
    // Back spikes.
    for (const [x, y, a] of [
      [78, 30, 0.2],
      [86, 46, 0.4],
      [90, 62, 0.6],
      [86, 78, 0.8],
      [66, 18, 0],
    ] as const)
      P.shape(
        [
          [x - 6, y + 4],
          [x + 10 + a * 6, y - 8 + a * 10],
          [x + 2, y + 10],
        ],
        tones('#2e2228', '#c0a0a0', '#0a0610'),
      )
    leg(P, 70, 80, 74, 98, 16, armor)
    // Big body.
    const body = P.mask().ellipse(56, 60, 28, 34)
    P.fill(body, armor, { reach: 10 })
    marking(
      P,
      body,
      (m) => {
        m.curve(
          [
            [40, 40],
            [52, 50],
            [48, 64],
            [60, 76],
          ],
          1.6,
          1.2,
        )
        m.curve(
          [
            [64, 34],
            [72, 50],
            [66, 66],
            [76, 86],
          ],
          1.6,
          1.2,
        )
        m.curve(
          [
            [50, 82],
            [62, 90],
          ],
          1.4,
          1,
        )
      },
      lava,
    )
    if (!back) {
      const chest = P.mask().ellipse(48, 64, 16, 26)
      P.fill(chest, belly, { seam: false })
      marking(
        P,
        chest,
        (m) => {
          for (const y of [48, 58, 68, 78]) m.line(30, y, 66, y + 2, 1.2)
        },
        belly[1]!,
      )
    }
    leg(P, 44, 82, 38, 98, 17, armor)
    // Arm.
    P.tube(
      [
        [36, 50],
        [26, 62],
        [24, 70],
      ],
      11,
      9,
      armor,
    )
    for (const dx of [-3, 1, 5])
      P.shape(
        [
          [20 + dx, 72],
          [22 + dx, 78],
          [25 + dx, 72],
        ],
        tones('#efe2c8'),
      )
    // Head with horns.
    P.shape(
      [
        [40, 14],
        [52, -6],
        [50, 16],
      ],
      tones('#d9c8a8'),
    )
    const head = P.mask().ellipse(38, 22, 17, 13)
    head.ellipse(24, 28, 10, 7)
    P.fill(head, armor)
    if (back) {
      marking(
        P,
        head,
        (m) =>
          m.curve(
            [
              [44, 12],
              [48, 22],
              [44, 32],
            ],
            1.4,
            1,
          ),
        lava,
      )
      return
    }
    P.shape(
      [
        [30, 12],
        [36, -4],
        [38, 14],
      ],
      tones('#d9c8a8'),
    )
    P.eye(30, 20, 4.4, '#ffb238', '#2a0e06')
    P.stroke(
      [
        [16, 30],
        [28, 32],
      ],
      1.2,
      '#1a0f12',
    )
    P.dot(16, 26, 1.4, '#1a0f12')
  },
}

const atrox: MonsterDesign = {
  name: 'Atrox',
  front: 108,
  back: 124,
  ink: '#1e1030',
  draw(P, back) {
    const scales = tones('#8a52c8')
    const belly = tones('#f2dfa4')
    const bolt = tones('#ffd23a')
    // The coil, from the tail tip at the back to the neck.
    const coil = P.mask().curve(
      [
        [88, 70],
        [84, 92],
        [56, 98],
        [30, 94],
        [26, 80],
        [44, 72],
        [70, 76],
        [76, 62],
        [62, 50],
        [44, 46],
      ],
      12,
      20,
    )
    P.fill(coil, scales, { reach: 6 })
    marking(
      P,
      coil,
      (m) => {
        for (const [x, y] of [
          [80, 86],
          [64, 96],
          [44, 96],
          [30, 86],
          [52, 74],
          [72, 70],
          [70, 56],
        ] as const)
          m.ellipse(x, y, 3.4, 3.4)
      },
      back ? scales[1]! : scales[0]!,
    )
    if (!back)
      marking(
        P,
        coil,
        (m) =>
          m.curve(
            [
              [34, 92],
              [32, 82],
              [46, 76],
              [66, 80],
            ],
            5,
            4,
          ),
        belly[2]!,
      )
    // Tail spark.
    P.shape(
      [
        [88, 70],
        [98, 56],
        [92, 58],
        [100, 44],
        [84, 62],
        [90, 60],
      ],
      bolt,
    )
    // Neck and head.
    P.tube(
      [
        [44, 48],
        [34, 40],
        [34, 30],
      ],
      18,
      16,
      scales,
    )
    if (!back)
      P.tube(
        [
          [38, 54],
          [28, 44],
          [27, 36],
        ],
        7,
        6,
        belly,
        { seam: false },
      )
    // Lightning horns.
    P.shape(
      [
        [40, 18],
        [52, 2],
        [48, 12],
        [60, 4],
        [46, 24],
      ],
      bolt,
    )
    const head = P.mask().ellipse(30, 26, 15, 11)
    head.ellipse(18, 30, 8, 6)
    P.fill(head, scales)
    if (back) {
      marking(
        P,
        head,
        (m) =>
          m.curve(
            [
              [38, 18],
              [42, 26],
              [38, 34],
            ],
            3,
            2,
          ),
        bolt[2]!,
      )
      return
    }
    P.shape(
      [
        [24, 18],
        [26, 2],
        [32, 14],
      ],
      bolt,
    )
    P.eye(24, 24, 4.2, '#ffd23a', '#1e1030')
    P.stroke(
      [
        [10, 32],
        [4, 34],
        [2, 31],
      ],
      1,
      '#e8486a',
    )
  },
}

const jacana: MonsterDesign = {
  name: 'Jacana',
  front: 104,
  back: 126,
  ink: '#121d20',
  draw(P, back) {
    const plume = tones('#3f6463', '#e0fff0', '#0e1420')
    const breast = tones('#d8664a')
    const wing = tones('#f0703a')
    const beak = tones('#f6b23a')
    // Tail feathers.
    P.shape(
      [
        [70, 66],
        [100, 52],
        [96, 60],
        [104, 62],
        [74, 76],
      ],
      plume,
    )
    P.shape(
      [
        [72, 70],
        [98, 70],
        [94, 76],
        [74, 80],
      ],
      wing,
    )
    // Legs.
    P.stroke(
      [
        [48, 84],
        [46, 98],
      ],
      2.4,
      beak[1]!,
    )
    P.stroke(
      [
        [60, 84],
        [62, 98],
      ],
      2.4,
      beak[1]!,
    )
    P.stroke(
      [
        [40, 99],
        [52, 99],
      ],
      2,
      beak[1]!,
    )
    P.stroke(
      [
        [56, 99],
        [68, 99],
      ],
      2,
      beak[1]!,
    )
    const body = P.mask().ellipse(54, 66, 24, 21)
    P.fill(body, plume)
    if (!back) P.ball(44, 72, 14, 13, breast, { seam: false })
    // Wing with ember tips.
    const w = leafMask(P, 46, 58, 96, 76, 11, 3)
    P.fill(w, plume)
    marking(
      P,
      w,
      (m) =>
        m.poly([
          [74, 50],
          [100, 60],
          [100, 90],
          [70, 90],
        ]),
      wing[2]!,
    )
    marking(
      P,
      w,
      (m) => {
        for (const x of [66, 74, 82, 90]) m.line(x, 64, x - 3, 84, 0.9)
      },
      plume[0]!,
    )
    // Crest of little flames.
    flame(P, 42, 28, 4, -3, 2.6)
    flame(P, 48, 30, 4, 2, 2.2)
    P.ball(38, 42, 14, 13, plume)
    P.shape(
      [
        [26, 40],
        [8, 46],
        [26, 50],
      ],
      beak,
    )
    if (back) return
    P.eye(32, 39, 4.2, '#ff9a3a', '#121d20')
    P.ball(36, 48, 4, 2.5, tones('#e8708a'), { seam: false })
  },
}

// --------------------------------------------------------------------------------------- plant

const plumette: MonsterDesign = {
  name: 'Plumette',
  front: 90,
  back: 126,
  ink: '#16301a',
  draw(P, back) {
    const fur = tones('#9ad656')
    const dark = tones('#3f9a4a')
    // Leaf tail.
    P.tube(
      [
        [72, 82],
        [86, 74],
        [88, 60],
      ],
      6,
      4,
      fur,
    )
    leaf(P, 88, 62, 98, 38, 7, dark, 2)
    P.ball(72, 90, 9, 8, fur)
    const body = P.mask().ellipse(58, 78, 22, 16)
    P.fill(body, fur)
    marking(
      P,
      body,
      (m) => {
        for (const [x, y, r] of [
          [60, 70, 3.4],
          [70, 78, 3],
          [52, 84, 2.6],
          [68, 88, 2.4],
        ] as const)
          m.ellipse(x, y, r, r * 0.8)
      },
      dark[2]!,
    )
    leg(P, 44, 84, 42, 97, 8, fur)
    leg(P, 58, 88, 58, 98, 8, fur)
    // Leaf ears and a leaf tuft.
    leaf(P, 30, 40, 16, 14, 7, dark, -2)
    leaf(P, 46, 36, 58, 10, 7, dark, 2)
    leaf(P, 38, 34, 38, 18, 5, tones('#c4ec6a'), 1, false)
    const head = P.mask().ellipse(36, 50, 18, 16)
    P.fill(head, fur)
    marking(
      P,
      head,
      (m) => {
        m.ellipse(48, 44, 3, 2.4)
        m.ellipse(44, 58, 2.4, 2)
      },
      dark[2]!,
    )
    if (back) return
    P.ball(26, 58, 9, 6, tones('#e6f8b0'), { seam: false })
    P.eye(29, 47, 5.2, '#3a9a4a', '#0e2414')
    P.dot(19, 56, 1.8, '#16301a')
    P.stroke(
      [
        [8, 56],
        [16, 58],
      ],
      0.7,
      '#e6f8b0',
    )
    P.stroke(
      [
        [8, 61],
        [16, 60],
      ],
      0.7,
      '#e6f8b0',
    )
  },
}

const ivieron: MonsterDesign = {
  name: 'Ivieron',
  front: 124,
  back: 126,
  ink: '#10261a',
  draw(P, back) {
    const fur = tones('#5fb062')
    const vine = tones('#2f7a46')
    const pale = tones('#d4f0a8')
    // Curly vine tail: one and a half turns.
    const spiral: [number, number][] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const angle = Math.PI * 0.5 - t * Math.PI * 2.4
      const r = 13 * (1 - t * 0.7)
      spiral.push([92 + Math.cos(angle) * r, 46 - 13 + Math.sin(angle) * r - 0])
    }
    P.tube([[78, 66], [90, 60], [96, 50], ...spiral], 5, 2.4, vine)
    leaf(P, 92, 58, 104, 66, 3.4, vine, 1, false)
    // Legs behind.
    leg(P, 76, 72, 80, 98, 8, vine)
    leg(P, 42, 74, 44, 98, 8, vine)
    const body = P.mask().ellipse(58, 66, 28, 15)
    P.fill(body, fur)
    marking(
      P,
      body,
      (m) => {
        for (const [x, y] of [
          [50, 58],
          [62, 56],
          [74, 62],
          [56, 70],
          [70, 72],
        ] as const)
          m.ellipse(x, y, 4, 2.6)
      },
      vine[2]!,
    )
    if (!back) marking(P, body, (m) => m.ellipse(48, 80, 22, 6), pale[2]!)
    leg(P, 66, 74, 68, 98, 9, fur)
    leg(P, 34, 72, 30, 98, 9, fur)
    // Leaf mane and head.
    for (const [x0, y0, x1, y1] of [
      [40, 60, 50, 32],
      [36, 56, 30, 28],
      [44, 64, 58, 44],
    ] as const)
      leaf(P, x0, y0, x1, y1, 6, vine, 2)
    P.shape(
      [
        [17, 40],
        [14, 24],
        [25, 35],
      ],
      fur,
    )
    P.shape(
      [
        [29, 36],
        [33, 18],
        [37, 36],
      ],
      fur,
    )
    const head = P.mask().ellipse(26, 48, 14, 12)
    head.ellipse(16, 54, 8, 6)
    P.fill(head, fur)
    if (back) {
      marking(P, head, (m) => m.ellipse(34, 46, 4, 3), vine[2]!)
      return
    }
    P.ball(16, 56, 8, 5, pale, { seam: false })
    P.eye(22, 46, 4.2, '#e8d23a', '#0e2414')
    P.dot(9, 54, 1.6, '#10261a')
    for (const y of [56, 59])
      P.stroke(
        [
          [2, y - 1],
          [12, y],
        ],
        0.6,
        WHITE,
      )
  },
}

const pluma: MonsterDesign = {
  name: 'Pluma',
  front: 126,
  back: 126,
  ink: '#0e2416',
  draw(P, back) {
    const body = tones('#a8d470')
    const mane = tones('#2f8f4e')
    const maneLight = tones('#56b85a')
    const face = tones('#e8eab0')
    // Tail with leaf tuft.
    P.tube(
      [
        [82, 64],
        [98, 70],
        [104, 58],
      ],
      6,
      4,
      body,
    )
    leaf(P, 104, 60, 108, 40, 6, mane, 2)
    leaf(P, 104, 60, 112, 52, 5, maneLight, 1, false)
    leg(P, 82, 70, 86, 98, 12, body)
    leg(P, 56, 74, 58, 98, 12, body)
    const torso = P.mask().ellipse(64, 62, 28, 18)
    P.fill(torso, body, { reach: 9 })
    marking(
      P,
      torso,
      (m) => {
        for (const [x, y] of [
          [70, 54],
          [80, 62],
          [62, 68],
          [76, 72],
        ] as const)
          m.ellipse(x, y, 3.5, 2.2)
      },
      body[1]!,
    )
    leg(P, 72, 76, 74, 98, 13, body)
    leg(P, 42, 74, 40, 98, 13, body)
    // The great leafy mane.
    const ring = (count: number, radius: number, size: number, ramp: Ramp, turn: number) => {
      for (let i = 0; i < count; i++) {
        const angle = turn + (i / count) * Math.PI * 2
        const x = 34 + Math.cos(angle) * radius
        const y = 40 + Math.sin(angle) * radius * 0.95
        leaf(
          P,
          34 + Math.cos(angle) * radius * 0.3,
          40 + Math.sin(angle) * radius * 0.3,
          x + Math.cos(angle) * size,
          y + Math.sin(angle) * size,
          size * 0.55,
          ramp,
          2,
          false,
        )
      }
    }
    ring(12, 18, 14, mane, 0.1)
    ring(10, 14, 10, maneLight, 0.4)
    P.ball(34, 40, 18, 18, mane, { reach: 6 })
    if (back) {
      ring(8, 6, 10, maneLight, 0.8)
      return
    }
    const head = P.mask().ellipse(28, 42, 12, 12)
    head.ellipse(20, 48, 8, 6)
    P.fill(head, face)
    P.eye(24, 39, 3.8, '#3a9a4a', '#0e2416')
    P.dot(14, 47, 2, '#0e2416')
    P.stroke(
      [
        [14, 52],
        [22, 53],
      ],
      1,
      face[1]!,
    )
  },
}

const pouch: MonsterDesign = {
  name: 'Pouch',
  front: 94,
  back: 126,
  ink: '#2a160c',
  draw(P, back) {
    const fur = tones('#a8754a')
    const cream = tones('#f0d8a8')
    const sprout = tones('#6cc04a')
    leg(P, 40, 90, 34, 98, 10, fur)
    leg(P, 62, 90, 66, 98, 10, fur)
    const body = P.mask().ellipse(50, 66, 28, 32)
    P.fill(body, fur, { reach: 10 })
    if (!back) P.ball(44, 72, 16, 22, cream, { seam: false })
    // Little arms holding a seed.
    P.tube(
      [
        [30, 60],
        [28, 70],
      ],
      8,
      7,
      fur,
    )
    if (!back) P.ball(34, 74, 5, 4, tones('#c88a3a'))
    P.ball(58, 24, 6, 6, fur)
    const head = P.mask().ellipse(44, 38, 22, 18)
    P.fill(head, fur)
    // A sprout on top.
    P.stroke(
      [
        [44, 22],
        [44, 12],
      ],
      2,
      sprout[1]!,
    )
    leaf(P, 44, 14, 32, 6, 5, sprout, -1, false)
    leaf(P, 44, 14, 56, 4, 6, sprout, 1, false)
    if (back) {
      marking(
        P,
        body,
        (m) =>
          m.curve(
            [
              [54, 40],
              [58, 66],
              [52, 92],
            ],
            3,
            2,
          ),
        fur[1]!,
      )
      return
    }
    // Round cheek pouches, a snout and a little ear.
    P.ball(32, 48, 9, 7, cream)
    P.ball(54, 48, 8, 7, cream)
    P.ball(26, 22, 5, 5, fur)
    P.ball(28, 40, 7, 5, cream, { seam: false })
    P.dot(22, 38, 2, '#2a160c')
    P.eye(38, 32, 4, '#4a2a14', '#1a0c06')
    P.stroke(
      [
        [24, 44],
        [28, 45],
      ],
      1,
      '#2a160c',
    )
  },
}

const draem: MonsterDesign = {
  name: 'Draem',
  front: 124,
  back: 126,
  ink: '#140e2c',
  draw(P, back) {
    const hide = tones('#5a4aa8', '#ffe0ff', '#0e0a20')
    const pale = tones('#d8d0f0')
    const star = '#ffd6f0'
    // Tail with a star.
    P.tube(
      [
        [86, 68],
        [96, 62],
        [100, 52],
      ],
      4,
      2.5,
      hide,
    )
    P.shape(starPoints(100, 50, 6), tones('#ff9ad0'))
    leg(P, 80, 76, 84, 98, 11, hide)
    leg(P, 46, 78, 46, 98, 11, hide)
    const body = P.mask().ellipse(62, 70, 28, 19)
    P.fill(body, hide, { reach: 9 })
    if (!back) marking(P, body, (m) => m.ellipse(56, 88, 26, 8), pale[1]!)
    marking(
      P,
      body,
      (m) => {
        for (const [x, y, r] of [
          [58, 62, 4],
          [72, 58, 3],
          [80, 72, 3.5],
          [64, 76, 2.6],
          [48, 68, 2.4],
        ] as const)
          m.poly(starPoints(x, y, r, 4, 0.35))
      },
      star,
    )
    leg(P, 70, 82, 72, 98, 12, hide)
    leg(P, 38, 80, 34, 98, 12, hide)
    // Head with a long nose.
    P.shape(
      [
        [34, 52],
        [40, 40],
        [42, 54],
      ],
      hide,
    )
    const head = P.mask().ellipse(28, 64, 14, 13)
    head.curve(
      [
        [18, 64],
        [8, 68],
        [4, 78],
      ],
      9,
      6,
    )
    P.fill(head, hide)
    if (back) {
      marking(P, head, (m) => m.poly(starPoints(32, 62, 3, 4, 0.35)), star)
      return
    }
    marking(P, head, (m) => m.ellipse(14, 72, 6, 4), pale[1]!)
    // Sleepy eye.
    P.dot(26, 62, 3.6, WHITE)
    P.dot(25, 63, 2.4, '#4a2a8a')
    P.stroke(
      [
        [21, 60],
        [31, 60],
      ],
      1.4,
      hide[0]!,
    )
    P.dot(4, 78, 1.4, '#140e2c')
  },
}

const larvea: MonsterDesign = {
  name: 'Larvea',
  front: 88,
  back: 114,
  ink: '#123018',
  draw(P, back) {
    const shell = tones('#7ac84e')
    const dark = tones('#3f9a3a')
    const belly = tones('#e6f4a8')
    // Two leaf ears.
    leaf(P, 44, 50, 30, 8, 8, dark, -3)
    leaf(P, 56, 50, 70, 8, 8, dark, 3)
    leg(P, 40, 92, 38, 99, 7, shell)
    leg(P, 60, 92, 62, 99, 7, shell)
    const body = P.mask().ellipse(50, 72, 22, 25)
    P.fill(body, shell, { reach: 8 })
    if (back) {
      marking(
        P,
        body,
        (m) => {
          m.curve(
            [
              [50, 48],
              [50, 96],
            ],
            1.6,
            1.6,
          )
          m.curve(
            [
              [34, 56],
              [44, 74],
              [36, 92],
            ],
            1.4,
            1.4,
          )
          m.curve(
            [
              [66, 56],
              [56, 74],
              [64, 92],
            ],
            1.4,
            1.4,
          )
        },
        dark[1]!,
      )
      return
    }
    P.ball(48, 80, 13, 14, belly, { seam: false })
    P.eye(40, 64, 4.4, '#2a6a2a', '#0e2010')
    P.eye(58, 64, 4.4, '#2a6a2a', '#0e2010')
    P.stroke(
      [
        [45, 72],
        [49, 74],
        [53, 72],
      ],
      1.2,
      '#123018',
    )
  },
}

const cleaf: MonsterDesign = {
  name: 'Cleaf',
  front: 120,
  back: 126,
  ink: '#1a1410',
  draw(P, back) {
    const shell = tones('#d83a3a')
    const wing = tones('#4fb45a')
    const wingLight = tones('#8ad65a')
    const skin = tones('#3a6a3a')
    // Leaf wings.
    leaf(P, 48, 52, 14, 8, 15, wing, -4)
    leaf(P, 58, 50, 96, 6, 16, wing, 4)
    leaf(P, 50, 56, 24, 30, 7, wingLight, -2, false)
    // Dangling legs.
    for (const [x0, x1] of [
      [40, 34],
      [50, 48],
      [60, 64],
    ] as const)
      P.stroke(
        [
          [x0, 74],
          [x1, 86],
          [x1 - 2, 92],
        ],
        2,
        skin[1]!,
      )
    const body = P.mask().ellipse(52, 64, 22, 18)
    P.fill(body, shell, { reach: 8 })
    marking(
      P,
      body,
      (m) => {
        for (const [x, y, r] of [
          [46, 56, 5],
          [62, 56, 4],
          [56, 70, 5],
          [70, 66, 3.4],
          [40, 70, 3],
        ] as const)
          m.ellipse(x, y, r, r)
        m.line(52, 46, 54, 82, 1.2)
      },
      '#2a1418',
    )
    if (back) return
    // Head with mandibles and antennae.
    P.stroke(
      [
        [28, 58],
        [22, 44],
        [16, 40],
      ],
      1.4,
      skin[1]!,
    )
    P.stroke(
      [
        [34, 56],
        [32, 42],
        [26, 36],
      ],
      1.4,
      skin[1]!,
    )
    P.ball(30, 64, 11, 10, skin)
    P.shape(
      [
        [22, 70],
        [12, 76],
        [18, 70],
        [16, 66],
      ],
      tones('#e8d8a8'),
    )
    P.eye(26, 61, 4, '#e83a3a', '#1a1410')
  },
}

// --------------------------------------------------------------------------------------- water

const finsta: MonsterDesign = {
  name: 'Finsta',
  front: 92,
  back: 126,
  ink: '#0c2038',
  draw(P, back) {
    const skin = tones('#3aa2e6')
    const belly = tones('#d8f2ff')
    const finR = tones('#2a78c8')
    // Tail fin and dorsal fin.
    fin(
      P,
      [
        [76, 66],
        [78, 74],
      ],
      [100, 50],
      finR,
      2,
    )
    fin(
      P,
      [
        [78, 70],
        [74, 78],
      ],
      [98, 94],
      finR,
      -2,
    )
    fin(
      P,
      [
        [44, 52],
        [62, 50],
      ],
      [62, 30],
      finR,
      4,
    )
    const body = P.mask().curve(
      [
        [30, 70],
        [50, 66],
        [70, 70],
        [80, 72],
      ],
      32,
      12,
    )
    P.fill(body, skin, { reach: 8 })
    if (!back)
      marking(
        P,
        body,
        (m) =>
          m.curve(
            [
              [24, 82],
              [46, 84],
              [70, 78],
            ],
            10,
            4,
          ),
        belly[2]!,
      )
    marking(
      P,
      body,
      (m) =>
        m.curve(
          [
            [40, 60],
            [56, 62],
            [72, 66],
          ],
          3,
          1.6,
        ),
      back ? belly[1]! : '#f0a03a',
    )
    fin(
      P,
      [
        [44, 76],
        [52, 78],
      ],
      [52, 96],
      finR,
      -3,
    )
    if (back) return
    P.eye(28, 64, 6, '#2a5aa8', '#0c2038')
    P.stroke(
      [
        [16, 74],
        [22, 77],
      ],
      1.2,
      '#0c2038',
    )
  },
}

const gulfin: MonsterDesign = {
  name: 'Gulfin',
  front: 124,
  back: 126,
  ink: '#0c2440',
  draw(P, back) {
    const skin = tones('#4ab4e8')
    const belly = tones('#e0f6ff')
    const pink = tones('#f08ab8')
    // Tail flukes at the end of an arched body.
    fin(
      P,
      [
        [86, 84],
        [90, 90],
      ],
      [106, 72],
      pink,
      3,
    )
    fin(
      P,
      [
        [86, 88],
        [84, 94],
      ],
      [104, 100],
      pink,
      -3,
    )
    fin(
      P,
      [
        [46, 46],
        [62, 54],
      ],
      [70, 26],
      pink,
      6,
    )
    const body = P.mask().curve(
      [
        [24, 46],
        [42, 52],
        [60, 64],
        [76, 80],
        [90, 88],
      ],
      32,
      10,
    )
    body.curve(
      [
        [18, 50],
        [6, 56],
      ],
      12,
      9,
    )
    P.fill(body, skin, { reach: 9 })
    if (!back)
      marking(
        P,
        body,
        (m) =>
          m.curve(
            [
              [4, 60],
              [26, 66],
              [48, 72],
              [70, 86],
              [88, 92],
            ],
            14,
            4,
          ),
        belly[2]!,
      )
    marking(
      P,
      body,
      (m) =>
        m.curve(
          [
            [30, 38],
            [50, 46],
            [68, 60],
          ],
          4,
          2,
        ),
      back ? skin[3]! : skin[1]!,
    )
    // Pink frills behind the head.
    fin(
      P,
      [
        [30, 34],
        [38, 36],
      ],
      [46, 18],
      pink,
      3,
    )
    fin(
      P,
      [
        [38, 60],
        [48, 64],
      ],
      [34, 88],
      pink,
      -4,
    )
    if (back) return
    P.eye(24, 44, 4.8, '#2a5aa8', '#0c2440')
    P.stroke(
      [
        [6, 56],
        [14, 58],
      ],
      1,
      '#0c2440',
    )
  },
}

const finiette: MonsterDesign = {
  name: 'Finiette',
  front: 126,
  back: 126,
  ink: '#08183a',
  draw(P, back) {
    const skin = tones('#2a7ac8')
    const belly = tones('#f0ecd0')
    const pink = tones('#f08aa8')
    // Coiled tail at the front.
    P.tube(
      [
        [60, 96],
        [30, 98],
        [12, 88],
        [16, 76],
        [30, 80],
      ],
      18,
      8,
      skin,
    )
    fin(
      P,
      [
        [28, 80],
        [32, 84],
      ],
      [44, 66],
      pink,
      2,
    )
    // The long neck rising to the head.
    const neck = P.mask().curve(
      [
        [66, 98],
        [84, 82],
        [82, 56],
        [64, 36],
        [44, 22],
      ],
      34,
      18,
    )
    P.fill(neck, skin, { reach: 10 })
    if (!back)
      marking(
        P,
        neck,
        (m) =>
          m.curve(
            [
              [58, 98],
              [72, 82],
              [70, 60],
              [54, 42],
              [40, 30],
            ],
            12,
            7,
          ),
        belly[2]!,
      )
    marking(
      P,
      neck,
      (m) => {
        for (const [x, y] of [
          [84, 70],
          [80, 52],
          [68, 40],
        ] as const)
          m.ellipse(x, y, 3, 5)
      },
      back ? skin[3]! : skin[1]!,
    )
    // Pink back frills.
    fin(
      P,
      [
        [86, 64],
        [88, 74],
      ],
      [104, 54],
      pink,
      4,
    )
    fin(
      P,
      [
        [78, 44],
        [84, 52],
      ],
      [98, 30],
      pink,
      4,
    )
    fin(
      P,
      [
        [60, 28],
        [66, 34],
      ],
      [74, 8],
      pink,
      3,
    )
    const head = P.mask().ellipse(36, 20, 15, 10)
    head.curve(
      [
        [26, 22],
        [10, 26],
      ],
      9,
      6,
    )
    P.fill(head, skin)
    if (back) return
    marking(P, head, (m) => m.ellipse(18, 28, 12, 3), belly[2]!)
    P.eye(32, 17, 4, '#2a2a7a', '#08183a')
  },
}

const friolera: MonsterDesign = {
  name: 'Friolera',
  front: 120,
  back: 126,
  ink: '#1a2a48',
  draw(P, back) {
    const coat = tones('#e4eefa', '#ffffff', '#3a4a80')
    const ice = tones('#6ad2f2', '#f0ffff', '#14306a')
    // Icy tail plume.
    leaf(P, 76, 52, 100, 34, 9, ice, 3, false)
    leaf(P, 76, 54, 98, 50, 7, coat, 1, false)
    leg(P, 74, 60, 78, 98, 6, coat)
    leg(P, 44, 60, 42, 98, 6, coat)
    const body = P.mask().ellipse(60, 54, 22, 13)
    P.fill(body, coat, { reach: 8 })
    marking(
      P,
      body,
      (m) => {
        for (const [x, y] of [
          [62, 46],
          [72, 50],
          [54, 50],
        ] as const)
          m.poly(starPoints(x, y, 3, 4, 0.35))
      },
      ice[2]!,
    )
    leg(P, 66, 62, 68, 98, 7, coat)
    leg(P, 40, 60, 36, 98, 7, coat)
    // Neck and head with crystal antlers.
    P.tube(
      [
        [44, 50],
        [36, 38],
        [32, 30],
      ],
      12,
      9,
      coat,
    )
    const antler = (x: number, sign: number) => {
      P.stroke(
        [
          [x, 22],
          [x + sign * 4, 10],
          [x + sign * 2, -2],
        ],
        2.6,
        ice[2]!,
      )
      P.stroke(
        [
          [x + sign * 3.5, 12],
          [x + sign * 12, 6],
          [x + sign * 16, 0],
        ],
        2.2,
        ice[2]!,
      )
      P.stroke(
        [
          [x + sign * 2.5, 2],
          [x - sign * 4, -6],
        ],
        2,
        ice[2]!,
      )
      P.stroke(
        [
          [x + sign * 10, 7],
          [x + sign * 12, -2],
        ],
        1.8,
        ice[3]!,
      )
    }
    antler(34, 1)
    antler(28, -1)
    const head = P.mask().ellipse(28, 28, 10, 8)
    head.curve(
      [
        [22, 30],
        [12, 34],
      ],
      8,
      6,
    )
    P.fill(head, coat)
    P.shape(
      [
        [34, 22],
        [44, 14],
        [38, 26],
      ],
      coat,
    )
    if (back) return
    P.eye(26, 26, 3.4, '#3a8ad8', '#1a2a48')
    P.dot(10, 34, 1.6, '#1a2a48')
  },
}

export const MONSTERS: MonsterDesign[] = [
  plumette,
  ivieron,
  pluma,
  sparchu,
  cindrill,
  charmadillo,
  finsta,
  gulfin,
  finiette,
  atrox,
  pouch,
  draem,
  larvea,
  cleaf,
  jacana,
  friolera,
]

// -------------------------------------------------------------------------------------- render

function paintAt(design: MonsterDesign, s: number, back: boolean): Px {
  const size = Math.ceil(170 * s) + 8
  const canvas = new Px(size, size)
  const P = new Painter(canvas, Math.round(30 * s) + 4, Math.round(30 * s) + 4, s, back)
  design.draw(P, back)
  canvas.outline(design.ink)
  return canvas
}

/** A view whose biggest side is about `target` pixels (the back view is cut at the bottom). */
export function view(design: MonsterDesign, target: number, back: boolean, limit = 126): Px {
  const measure = (s: number) => {
    const canvas = paintAt(design, s, back)
    const box = bounds(canvas)!
    const cut = back ? Math.round(box.height * (design.cut ?? 0.2)) : 0
    return crop(canvas, box.x, box.y, box.width, box.height - cut)
  }
  let s = target / 100
  for (let attempt = 0; attempt < 12; attempt++) {
    const result = measure(s)
    const side = Math.max(result.width, result.height)
    const goal = Math.min(target, limit)
    if (side <= limit && side >= goal - 3) return result
    s *= goal / side
  }
  const result = measure(s)
  if (result.width > limit || result.height > limit)
    throw new Error(`${design.name} não coube no quadro`)
  return result
}

export const ICON_SIZE = 28
export { darken }
