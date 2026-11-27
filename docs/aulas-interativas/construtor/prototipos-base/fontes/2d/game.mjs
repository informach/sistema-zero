/** Declarative native IR. No raw JavaScript nodes or custom runtime APIs. */
import { assets, presets } from './assets.mjs'

const num = (value) => ({ type: 'num', value })
const str = (value) => ({ type: 'str', value })
const value = (x) => (typeof x === 'number' ? num(x) : typeof x === 'string' ? str(x) : x)
const variable = (name) => ({ type: 'var', name })
const binary = (op, a, b) => ({ type: 'binop', op, left: value(a), right: value(b) })
const command = (type, fields = {}) => ({ type: `g2d:${type}`, ...fields })
const condition = (cond, then, otherwise) => ({
  type: 'if',
  cond,
  then,
  ...(otherwise ? { else: otherwise } : {}),
})
const scene = (name) => ({ type: 'g2d:sceneIs', name })
const whilePlaying = (statements) => condition(scene('jogando'), statements)
const label = (text, x, y, size = 20, color = '#ffffff', align = 'center') =>
  command('drawLabel', {
    ctxVar: 'ctx',
    text: value(text),
    x,
    y,
    color,
    size,
    align,
  })
const drawSprite = (spriteVar) => command('drawSprite', { spriteVar, ctxVar: 'ctx' })

/** Prepared presentation and navigation shared by the starter and finished game.
 * The learner supplies gameplay rules and the conditions that select a result.
 */
const preparedEnter = () =>
  command('onKey', {
    key: 'Enter',
    body: [
      condition(
        scene('inicio'),
        [command('setScene', { name: 'jogando' })],
        [
          condition(
            scene('vitoria'),
            [command('restart')],
            [condition(scene('derrota'), [command('restart')])],
          ),
        ],
      ),
    ],
  })

const preparedScreens = (goalText) => [
  condition(scene('inicio'), [
    drawSprite('painelMensagem'),
    label('NAVE CONTRA ASTEROIDES', 400, 182, 29, '#e0f5ff'),
    label(goalText, 400, 220, 21, '#d1e5f3'),
    label('Desvie para proteger suas três vidas.', 400, 252, 19, '#c4d7eb'),
    label('Aperte ENTER para começar', 400, 290, 21, '#7ce9da'),
  ]),
  condition(scene('vitoria'), [
    drawSprite('painelMensagem'),
    label('ROTA LIBERADA!', 400, 187, 32, '#8cf1cb'),
    label('Boa viagem, comandante!', 400, 232, 24, '#f2f9ff'),
    label('ENTER para voltar ao início', 400, 283, 20, '#b5d4ef'),
  ]),
  condition(scene('derrota'), [
    drawSprite('painelMensagem'),
    label('VAMOS TENTAR OUTRA VEZ?', 400, 187, 27, '#ffd19d'),
    label('Desvie dos asteroides e encontre sua rota.', 400, 232, 20, '#f2f9ff'),
    label('ENTER para voltar ao início', 400, 283, 20, '#b5d4ef'),
  ]),
]

/** Cosmetic parameters are image names only. Physics and rules stay constant. */
export function createIR(preset = presets[0], initial = false) {
  const start = [
    command('setupStage', { width: 800, height: 480, bg: '#07152b' }),
    command('fitScreen', { percent: 100 }),
    command('setStageDescription', {
      description: initial
        ? 'Projeto inicial de Nave Contra Asteroides. Enter começa. Cenário, nave, telas e reinício preparados; movimento e regras serão construídos nas aulas.'
        : 'Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início.',
    }),
    command('setBackdrop', { image: preset.cenario }),
    command('createImageSprite', {
      varName: 'nave',
      x: 372,
      y: 396,
      w: 56,
      h: 64,
      image: preset.nave,
    }),
    command('setHitboxScale', { spriteVar: 'nave', percent: 75 }),
    command('createSprite', {
      varName: 'painelMensagem',
      x: 48,
      y: 140,
      w: 704,
      h: 176,
      color: '#0c1a34',
    }),
  ]

  if (initial) {
    start.push(command('setScene', { name: 'inicio' }))
    const ir = {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start,
        events: [preparedEnter()],
        loops: [
          command('updateEachFrame', {
            body: [
              whilePlaying([]),
              command('clear'),
              drawSprite('nave'),
              ...preparedScreens('Abra a rota: acerte 20 asteroides.'),
            ],
          }),
        ],
      },
      extensions: [{ extensionId: 'game-2d' }],
    }
    return identify(ir, `nave-2d-inicial`)
  }

  start.push(
    command('createGroup', { varName: 'tiros' }),
    command('createGroup', { varName: 'asteroides' }),
    { type: 'var', name: 'pontos', value: num(0) },
    { type: 'var', name: 'meta', value: num(20) },
    command('setHealth', { spriteVar: 'nave', amount: 3 }),
    command('setScene', { name: 'inicio' }),
  )

  const shoot = command('onKey', {
    key: 'Space',
    body: [
      whilePlaying([
        command('spawnImageInGroup', {
          groupVar: 'tiros',
          x: binary('-', { type: 'g2d:centerX', spriteVar: 'nave' }, 5),
          y: binary('-', { type: 'g2d:spriteY', spriteVar: 'nave' }, 24),
          w: 10,
          h: 28,
          image: preset.laser,
          vx: num(0),
          vy: num(-7),
        }),
        command('playFx', { fx: 'shoot' }),
      ]),
    ],
  })

  const enter = preparedEnter()

  const timer = command('everySeconds', {
    seconds: 1.5,
    body: [
      whilePlaying([
        command('spawnImageInGroup', {
          groupVar: 'asteroides',
          x: { type: 'random', min: num(24), max: num(728) },
          y: num(-52),
          w: 48,
          h: 48,
          image: preset.asteroide,
          vx: num(0),
          vy: num(2),
        }),
      ]),
    ],
  })

  const hits = command('onGroupOverlap', {
    aGroup: 'tiros',
    aName: 'tiro',
    bGroup: 'asteroides',
    bName: 'asteroide',
    body: [
      command('removeFromGroup', { spriteVar: 'tiro', groupVar: 'tiros' }),
      command('removeFromGroup', { spriteVar: 'asteroide', groupVar: 'asteroides' }),
      command('explode', { spriteVar: 'asteroide', color: '#ffce69' }),
      command('playFx', { fx: 'explosion' }),
      { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), 1) },
    ],
  })

  const crashes = command('onSpriteGroupOverlap', {
    groupVar: 'asteroides',
    spriteVar: 'nave',
    itemName: 'atingiuNave',
    body: [
      command('removeFromGroup', { spriteVar: 'atingiuNave', groupVar: 'asteroides' }),
      command('explode', { spriteVar: 'atingiuNave', color: '#ff956c' }),
      command('damageSprite', { spriteVar: 'nave', amount: 1, invincibilityFrames: 60 }),
      command('playFx', { fx: 'hit' }),
    ],
  })

  const result = condition(
    { type: 'g2d:healthDepleted', spriteVar: 'nave' },
    [command('setScene', { name: 'derrota' })],
    [
      condition(binary('>=', variable('pontos'), variable('meta')), [
        command('setScene', { name: 'vitoria' }),
      ]),
    ],
  )

  const hud = [
    command('drawScore', {
      ctxVar: 'ctx',
      label: 'Acertos:',
      value: variable('pontos'),
      x: 22,
      y: 32,
      color: '#f3f8ff',
      size: 23,
    }),
    command('drawScore', {
      ctxVar: 'ctx',
      label: 'Meta:',
      value: variable('meta'),
      x: 650,
      y: 32,
      color: '#c9eaff',
      size: 21,
    }),
    command('drawSpriteHealth', {
      ctxVar: 'ctx',
      spriteVar: 'nave',
      style: 'hearts',
      x: 22,
      y: 52,
      color: '#ff9bae',
      size: 21,
    }),
    command('drawBar', {
      ctxVar: 'ctx',
      value: variable('pontos'),
      max: variable('meta'),
      x: 280,
      y: 23,
      w: 240,
      h: 11,
      color: '#65dfcf',
    }),
    label('SETAS: mover   ESPAÇO: disparar', 400, 60, 15, '#ffffff', 'center'),
  ]

  const frames = command('updateEachFrame', {
    body: [
      whilePlaying([
        command('arrowsX', { spriteVar: 'nave', speed: 5 }),
        command('clampToScreen', { spriteVar: 'nave', ctxVar: 'ctx' }),
        command('updateGroup', { groupVar: 'tiros' }),
        command('updateGroup', { groupVar: 'asteroides' }),
        command('pruneOffscreen', {
          groupVar: 'tiros',
          ctxVar: 'ctx',
          itemName: 'foraDaTela',
          body: [],
        }),
        command('pruneOffscreen', {
          groupVar: 'asteroides',
          ctxVar: 'ctx',
          itemName: 'foraDaTela',
          body: [],
        }),
        hits,
        crashes,
        result,
      ]),
      command('clear'),
      command('drawGroup', { groupVar: 'asteroides', ctxVar: 'ctx' }),
      command('drawGroup', { groupVar: 'tiros', ctxVar: 'ctx' }),
      drawSprite('nave'),
      ...hud,
      ...preparedScreens(
        binary('+', binary('+', 'Abra a rota: acerte ', variable('meta')), ' asteroides.'),
      ),
    ],
  })

  return identify(
    {
      version: 2,
      html: [],
      css: [],
      behavior: { start, events: [enter, shoot], loops: [frames, timer] },
      extensions: [{ extensionId: 'game-2d' }],
    },
    'nave-2d-completo',
  )
}

function identify(ir, prefix) {
  let serial = 0
  const visit = (value) => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (typeof value.type === 'string') value.__id = `${prefix}-${serial++}`
    Object.values(value).forEach(visit)
  }
  visit(ir)
  return ir
}

export const specifications = [
  {
    filename: 'nave-2d-completo.szproject.json',
    projectId: 'construtor-nave-2d-completo-aurora',
    name: 'Nave Contra Asteroides · Aurora · completo',
    initial: false,
    preset: presets[0],
  },
  {
    filename: 'nave-2d-inicial.szproject.json',
    projectId: 'construtor-nave-2d-inicial-aurora',
    name: 'Nave Contra Asteroides · projeto inicial',
    initial: true,
    preset: presets[0],
  },
  {
    filename: 'nave-2d-orbita.szproject.json',
    projectId: 'construtor-nave-2d-completo-orbita',
    name: 'Nave Contra Asteroides · Órbita · completo',
    initial: false,
    preset: presets[1],
  },
  {
    filename: 'nave-2d-nebulosa.szproject.json',
    projectId: 'construtor-nave-2d-completo-nebulosa',
    name: 'Nave Contra Asteroides · Nebulosa · completo',
    initial: false,
    preset: presets[2],
  },
  {
    filename: 'nave-2d-estacao.szproject.json',
    projectId: 'construtor-nave-2d-completo-estacao',
    name: 'Nave Contra Asteroides · Estação · completo',
    initial: false,
    preset: presets[3],
  },
]

export function sourceProjects() {
  return specifications.map((spec) => ({
    ...spec,
    ir: createIR(spec.preset, spec.initial),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '2.1.0', installedAt: 0 }],
  }))
}
