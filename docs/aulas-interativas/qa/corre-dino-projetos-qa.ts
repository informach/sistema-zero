/** Hand-authored end-of-lesson programs, independent of the manifest rule objects. */
export interface Block {
  type: string
  fields?: Record<string, string | number | boolean>
  inputs?: Record<string, { block?: Block; shadow?: Block }>
  next?: { block: Block }
  extraState?: unknown
}
const shadow = (value: number | string): Block => ({
  type: typeof value === 'number' ? 'sz_val_number' : 'sz_val_text',
  fields: typeof value === 'number' ? { NUM: value } : { TEXT: value },
})
const b = (
  type: string,
  fields: Block['fields'] = {},
  values: Record<string, number | string | Block> = {},
): Block => ({
  type,
  fields,
  inputs: Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === 'object' ? { block: value } : { shadow: shadow(value) },
    ]),
  ),
})
const chain = (blocks: Block[]): Block | undefined => {
  for (const block of blocks) delete block.next
  for (let i = 0; i < blocks.length - 1; i++) blocks[i]!.next = { block: blocks[i + 1]! }
  return blocks[0]
}
const body = (owner: Block, name: string, children: Block[]) => {
  owner.inputs ??= {}
  owner.inputs[name] = { block: chain(children) }
  return owner
}
const condition = (name: string, children: Block[]) =>
  body(b('sz_js_if_else', {}, { COND: b('sz_g2d_scene_is', { SCENE: name }) }), 'THEN', children)
const variable = (name: string) => b('sz_val_variable', { NAME: name })
export function courseProjects() {
  const start = [
    b('sz_g2d_setup_stage', { BG: '#81d4fa' }, { W: 480, H: 270 }),
    b('sz_g2d_stage_border', { COLOR: '#ffffff' }, { WIDTH: 4 }),
    b('sz_g2d_set_stage_description', {
      DESCRIPTION: 'Corra com o dino e pule os cactos apertando espaço',
    }),
    b('sz_g2d_create_dino', { NAME: 'dino', COLOR: '#8b5cf6' }, { X: 110, Y: 150, SIZE: 64 }),
  ]
  const actions = [b('sz_g2d_draw_sprite', { SPRITE: 'dino' })]
  const background = [b('sz_g2d_clear'), b('sz_g2d_forest', {}, { SPEED: 5 })]
  const loop = b('sz_g2d_update_each_frame')
  const timers: Block[] = []
  const events: Block[] = []
  const snapshots: Record<number, unknown> = {}
  function save(lesson: number) {
    const roots = [body(b('sz_frame_start'), 'CHILDREN', start)]
    if (lesson >= 2) roots.push(body(b('sz_frame_loops'), 'CHILDREN', [loop, ...timers]))
    if (events.length) roots.push(body(b('sz_frame_events'), 'CHILDREN', events))
    snapshots[lesson] = structuredClone({
      blocksState: { blocks: { languageVersion: 0, blocks: roots } },
    })
  }
  save(1)
  start.splice(1, 1)
  body(loop, 'BODY', [...background, ...actions])
  save(2)
  actions.unshift(
    b('sz_g2d_apply_gravity', { SPRITE: 'dino' }),
    b('sz_g2d_control_dino', { SPRITE: 'dino' }, { JUMP: 14 }),
  )
  body(loop, 'BODY', [...background, ...actions])
  save(3)
  events.push(body(b('sz_g2d_on_jump', { SPRITE: 'dino' }), 'BODY', [b('sz_g2d_play_jump')]))
  save(4)
  start.push(b('sz_g2d_create_group', { NAME: 'cactos' }))
  const spawn = b(
    'sz_g2d_spawn_obstacle',
    { GROUP: 'cactos', SHAPE: 'cactus' },
    { X: 560, VX: -5, SIZE: 44 },
  )
  const spawnTimer = body(b('sz_g2d_every_seconds', {}, { SECS: 1.4 }), 'BODY', [spawn])
  timers.push(spawnTimer)
  actions.push(
    b('sz_g2d_update_group', { GROUP: 'cactos' }),
    b('sz_g2d_draw_group', { GROUP: 'cactos' }),
  )
  body(loop, 'BODY', [...background, ...actions])
  save(5)
  actions.push(b('sz_g2d_prune_offscreen', { GROUP: 'cactos', ITEM: 'cacto' }))
  body(loop, 'BODY', [...background, ...actions])
  save(6)
  start.push(b('sz_g2d_set_scene', { SCENE: 'inicio' }))
  const game = condition('jogando', actions)
  body(loop, 'BODY', [...background, game])
  body(spawnTimer, 'BODY', [condition('jogando', [spawn])])
  save(7)
  const menu = b(
    'sz_g2d_show_screen',
    { BG: '#102030' },
    {
      TITLE: 'Corre, Dino!',
      SUBTITLE: 'Pule os cactos!',
      HINT: 'Aperte qualquer tecla ou toque na tela para começar',
    },
  )
  game.inputs!.ELSEIF_COND0 = { block: b('sz_g2d_scene_is', { SCENE: 'inicio' }) }
  body(game, 'ELSEIF_THEN0', [menu])
  game.extraState = { elseIf: 1, hasElse: false }
  const inputBranches = condition('inicio', [b('sz_g2d_set_scene', { SCENE: 'jogando' })])
  const inputEvent = body(b('sz_g2d_on_any_input'), 'BODY', [inputBranches])
  events.push(inputEvent)
  save(8)
  events.push(
    body(
      b('sz_g2d_on_sprite_group_overlap', { GROUP: 'cactos', SPRITE: 'dino', ANAME: 'cacto' }),
      'BODY',
      [
        b('sz_g2d_explode', { SPRITE: 'cacto', COLOR: '#ffab00' }),
        b('sz_g2d_shake', {}, { INTENSITY: 8 }),
        b('sz_g2d_play_fx', { FX: 'gameover' }),
        b('sz_g2d_set_scene', { SCENE: 'fim' }),
      ],
    ),
  )
  const end = b(
    'sz_g2d_show_screen',
    { BG: '#102030' },
    {
      TITLE: 'Fim de jogo',
      SUBTITLE: 'Boa tentativa!',
      HINT: 'Aperte qualquer tecla ou toque para jogar de novo',
    },
  )
  game.inputs!.ELSEIF_COND1 = { block: b('sz_g2d_scene_is', { SCENE: 'fim' }) }
  body(game, 'ELSEIF_THEN1', [end])
  game.extraState = { elseIf: 2, hasElse: false }
  inputBranches.inputs!.ELSEIF_COND0 = { block: b('sz_g2d_scene_is', { SCENE: 'fim' }) }
  body(inputBranches, 'ELSEIF_THEN0', [b('sz_g2d_restart')])
  inputBranches.extraState = { elseIf: 1, hasElse: false }
  save(9)
  start.push(b('sz_g2d_set_hitbox_scale', { SPRITE: 'dino' }, { PERCENT: 80 }))
  save(10)
  start.push(b('sz_js_var_create', { NAME: 'pontos' }, { VALUE: 0 }))
  const score = b(
    'sz_g2d_draw_score',
    { LABEL: 'Pontos:', COLOR: '#102030' },
    { VALUE: variable('pontos'), X: 10, Y: 10, SIZE: 20 },
  )
  body(loop, 'BODY', [...background, game, score])
  timers.push(
    body(b('sz_g2d_every_seconds', {}, { SECS: 1 }), 'BODY', [
      condition('jogando', [b('sz_js_var_increment', { NAME: 'pontos', DELTA: 1 })]),
    ]),
  )
  const join = b(
    'sz_val_join',
    {},
    { ITEM0: 'Você fez ', ITEM1: variable('pontos'), ITEM2: ' pontos. Tente bater essa marca!' },
  )
  join.extraState = { items: 3 }
  end.inputs!.SUBTITLE = { block: join }
  save(11)
  spawn.inputs!.X = { block: b('sz_g2d_random_between', {}, { MIN: 500, MAX: 560 }) }
  const formula = b(
    'sz_math_arithmetic',
    { OP: '-' },
    { A: -5, B: b('sz_g2d_random_between', {}, { MIN: 0, MAX: 1 }) },
  )
  spawn.inputs!.VX = { block: formula }
  save(12)
  start.push(b('sz_js_var_create', { NAME: 'velocidade' }, { VALUE: -5 }))
  formula.inputs!.A = { block: variable('velocidade') }
  const limit = body(
    b(
      'sz_js_if_else',
      {},
      { COND: b('sz_val_compare', { OP: '>' }, { LEFT: variable('velocidade'), RIGHT: -9 }) },
    ),
    'THEN',
    [b('sz_js_var_increment', { NAME: 'velocidade', DELTA: -1 })],
  )
  timers.push(
    body(b('sz_g2d_every_seconds', {}, { SECS: 5 }), 'BODY', [condition('jogando', [limit])]),
  )
  start.find((block) => block.type === 'sz_g2d_set_stage_description')!.fields!.DESCRIPTION =
    'Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela'
  save(13)
  return snapshots
}
