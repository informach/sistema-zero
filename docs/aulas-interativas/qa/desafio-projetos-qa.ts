// Independent programs authored from the recorded steps, not generated from criteria.
import type { Block } from './corre-dino-projetos-qa'

export type { Block }

const literal = (value: number | string): Block =>
  typeof value === 'number'
    ? { type: 'sz_val_number', fields: { NUM: value } }
    : { type: 'sz_val_text', fields: { TEXT: value } }

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
      typeof value === 'object'
        ? { block: value }
        : {
            shadow: literal(value),
          },
    ]),
  ),
})
const body = (owner: Block, key: string, children: Block[]) => {
  for (const child of children) delete child.next
  for (let i = 0; i < children.length - 1; i++) children[i]!.next = { block: children[i + 1]! }
  owner.inputs ??= {}
  owner.inputs[key] = children[0] ? { block: children[0] } : {}
  return owner
}
const cond = (name: string, children: Block[]) =>
  body(b('sz_js_if_else', {}, { COND: b('sz_g2d_scene_is', { SCENE: name }) }), 'THEN', children)
const v = (name: string) => b('sz_val_variable', { NAME: name })
export function courseProjects() {
  const start = [
    b('sz_g2d_setup_stage', { BG: '#07162e' }, { W: 800, H: 480 }),
    b(
      'sz_g2d_create_ship',
      { NAME: 'nave', BODY: '#35e8ff', WINGS: '#2568ff' },
      { X: 400, Y: 410, W: 54, H: 62 },
    ),
  ]
  const actions = [
    b('sz_g2d_clear'),
    b('sz_g2d_starfield', {}, { SPEED: 1 }),
    b('sz_g2d_arrows_x', { SPRITE: 'nave' }, { SPEED: 7 }),
    b('sz_g2d_clamp_to_screen', { SPRITE: 'nave' }),
    b('sz_g2d_draw_sprite', { SPRITE: 'nave' }),
  ]
  const loop = body(b('sz_g2d_update_each_frame'), 'BODY', actions)
  const timers: Block[] = [],
    events: Block[] = []
  const snapshots: Record<
    number,
    { blocksState: { blocks: { languageVersion: number; blocks: Block[] } } }
  > = {}
  function save(day: number) {
    const roots = [
      body(b('sz_frame_start'), 'CHILDREN', start),
      body(b('sz_frame_loops'), 'CHILDREN', [loop, ...timers]),
    ]
    if (events.length) roots.push(body(b('sz_frame_events'), 'CHILDREN', events))
    snapshots[day] = structuredClone({
      blocksState: { blocks: { languageVersion: 0, blocks: roots } },
    })
  }
  function cycle(group: string) {
    return [
      b('sz_g2d_update_group', { GROUP: group }),
      b('sz_g2d_prune_offscreen', { GROUP: group, ITEM: 'sprite' }),
      b('sz_g2d_draw_group', { GROUP: group }),
    ]
  }
  save(1)
  start.push(b('sz_g2d_create_group', { NAME: 'tiros' }))
  const shot = [
    b(
      'sz_g2d_spawn_bullet',
      { GROUP: 'tiros', COLOR: '#9cff57' },
      {
        X: b('sz_g2d_center_x', { SPRITE: 'nave' }),
        Y: b('sz_g2d_sprite_y', { SPRITE: 'nave' }),
        R: 5,
        VX: 0,
        VY: -9,
      },
    ),
    b('sz_g2d_play_shoot'),
  ]
  const space = body(b('sz_g2d_on_key', { KEY: 'Space' }), 'BODY', shot)
  events.push(space)
  actions.push(...cycle('tiros'))
  body(loop, 'BODY', actions)
  save(2)
  start.push(b('sz_g2d_create_group', { NAME: 'asteroides' }))
  const asteroid = b(
    'sz_g2d_spawn_asteroid',
    { GROUP: 'asteroides', COLOR: '#8d8f9b' },
    { X: b('sz_g2d_random_x'), Y: -30, SIZE: 40, VX: 0, VY: 3 },
  )
  const clock = body(b('sz_g2d_every_frames', {}, { N: 40 }), 'BODY', [asteroid])
  timers.push(clock)
  const hitActions = [
    b('sz_g2d_remove_from_group', { SPRITE: 'tiro', GROUP: 'tiros' }),
    b('sz_g2d_remove_from_group', { SPRITE: 'asteroide', GROUP: 'asteroides' }),
    b('sz_g2d_explode', { SPRITE: 'asteroide', COLOR: '#ffb13b' }),
    b('sz_g2d_play_explosion'),
  ]
  const hit = body(
    b('sz_g2d_on_group_overlap', {
      A: 'tiros',
      B: 'asteroides',
      ANAME: 'tiro',
      BNAME: 'asteroide',
    }),
    'BODY',
    hitActions,
  )
  actions.push(...cycle('asteroides'), hit)
  body(loop, 'BODY', actions)
  save(3)
  start.push(
    b('sz_js_var_create', { NAME: 'pontos' }, { VALUE: 0 }),
    b('sz_g2d_set_health', { SPRITE: 'nave' }, { AMOUNT: 3 }),
  )
  hitActions.push(b('sz_js_var_increment', { NAME: 'pontos', DELTA: 1 }))
  body(hit, 'BODY', hitActions)
  const crash = body(
    b('sz_g2d_on_sprite_group_overlap', { GROUP: 'asteroides', SPRITE: 'nave', ANAME: 'inimigo' }),
    'BODY',
    [
      b('sz_g2d_remove_from_group', { SPRITE: 'inimigo', GROUP: 'asteroides' }),
      b('sz_g2d_explode', { SPRITE: 'inimigo', COLOR: '#ffb13b' }),
      b('sz_g2d_damage_sprite', { SPRITE: 'nave' }, { AMOUNT: 1, FRAMES: 45 }),
      b('sz_g2d_shake', {}, { INTENSITY: 8 }),
    ],
  )
  actions.push(
    b(
      'sz_g2d_draw_score',
      { LABEL: 'Pontos:', COLOR: '#ffffff' },
      { VALUE: v('pontos'), X: 12, Y: 30, SIZE: 24 },
    ),
    crash,
    b(
      'sz_g2d_draw_sprite_health',
      { SPRITE: 'nave', STYLE: 'hearts', COLOR: '#ff5d5d' },
      { X: 12, Y: 48, SIZE: 22 },
    ),
  )
  body(loop, 'BODY', actions)
  save(4)
  start.push(
    b('sz_js_const_create', { NAME: 'alvo' }, { VALUE: 26 }),
    b('sz_g2d_set_scene', { SCENE: 'inicio' }),
  )
  const victory = body(
    b(
      'sz_js_if_else',
      {},
      { COND: b('sz_val_compare', { OP: '>=' }, { LEFT: v('pontos'), RIGHT: v('alvo') }) },
    ),
    'THEN',
    [b('sz_g2d_set_scene', { SCENE: 'vitoria' })],
  )
  const defeat = body(
    b('sz_js_if_else', {}, { COND: b('sz_g2d_health_depleted', { SPRITE: 'nave' }) }),
    'THEN',
    [b('sz_g2d_set_scene', { SCENE: 'fim' })],
  )
  actions.push(victory, defeat)
  const game = cond('jogando', actions)
  for (const [i, name] of ['inicio', 'vitoria', 'fim'].entries()) {
    game.inputs![`ELSEIF_COND${i}`] = { block: b('sz_g2d_scene_is', { SCENE: name }) }
    body(game, `ELSEIF_THEN${i}`, [
      b(
        'sz_g2d_show_screen',
        { BG: '#112b46' },
        {
          TITLE:
            name === 'inicio'
              ? 'Nave contra Asteroides'
              : name === 'vitoria'
                ? 'Você ganhou!'
                : 'Você perdeu',
          SUBTITLE: name === 'inicio' ? 'Destrua os asteroides' : '',
          HINT:
            name === 'inicio' ? 'Aperte Enter para começar' : 'Aperte Enter para voltar ao início',
        },
      ),
    ])
  }
  game.extraState = { elseIf: 3, hasElse: false }
  body(loop, 'BODY', [game])
  body(clock, 'BODY', [cond('jogando', [asteroid])])
  body(space, 'BODY', [cond('jogando', shot)])
  const enter = cond('inicio', [b('sz_g2d_set_scene', { SCENE: 'jogando' })])
  for (const [i, name] of ['fim', 'vitoria'].entries()) {
    enter.inputs![`ELSEIF_COND${i}`] = { block: b('sz_g2d_scene_is', { SCENE: name }) }
    body(enter, `ELSEIF_THEN${i}`, [b('sz_g2d_restart')])
  }
  enter.extraState = { elseIf: 2, hasElse: false }
  events.push(body(b('sz_g2d_on_key', { KEY: 'Enter' }), 'BODY', [enter]))
  save(5)
  return snapshots
}
