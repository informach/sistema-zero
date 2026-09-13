import type {
  SectionProjectCheck as C,
  ProjectBlockPattern as P,
} from '../../../packages/core/src/learning'
import { c, frame, guarded, iff, p, scene } from './corre-dino-editorial'

export { c, frame, guarded, iff, p, scene }

const loop = { area: 'loops' as const, withinBlock: frame }
const start = { area: 'start' as const }
const event = (key: string, action: P) =>
  p('sz_g2d_on_key', { fields: { KEY: key }, inputBlocks: { BODY: action } })
const variable = (name: string) => p('sz_val_variable', { fields: { NAME: name } })
export const ship = p('sz_g2d_create_ship', {
  fields: { NAME: 'nave' },
  inputs: { X: 400, Y: 410, W: 54, H: 62 },
})
export const bullet = p('sz_g2d_spawn_bullet', {
  fields: { GROUP: 'tiros' },
  inputs: { R: 5, VX: 0, VY: -9 },
  inputBlocks: {
    X: p('sz_g2d_center_x', { fields: { SPRITE: 'nave' } }),
    Y: p('sz_g2d_sprite_y', { fields: { SPRITE: 'nave' } }),
  },
  beforeBlock: 'sz_g2d_play_shoot',
})
export const asteroid = p('sz_g2d_spawn_asteroid', {
  fields: { GROUP: 'asteroides' },
  inputs: { Y: -30, SIZE: 40, VX: 0, VY: 3 },
  inputBlocks: { X: p('sz_g2d_random_x') },
})
const shotCollision = (action: P) =>
  p('sz_g2d_on_group_overlap', {
    fields: { A: 'tiros', B: 'asteroides', ANAME: 'tiro', BNAME: 'asteroide' },
    inputBlocks: { BODY: action },
  })
const shipCollision = (action: P) =>
  p('sz_g2d_on_sprite_group_overlap', {
    fields: { GROUP: 'asteroides', SPRITE: 'nave', ANAME: 'inimigo' },
    inputBlocks: { BODY: action },
  })
export const addPoint = p('sz_js_var_increment', { fields: { NAME: 'pontos', DELTA: 1 } })
export const hud = p('sz_g2d_draw_score', {
  fields: { LABEL: 'Pontos:' },
  inputs: { X: 12, Y: 30, SIZE: 24 },
  inputBlocks: { VALUE: variable('pontos') },
})
export const hearts = p('sz_g2d_draw_sprite_health', {
  fields: { SPRITE: 'nave', STYLE: 'hearts' },
  inputs: { X: 12, Y: 48, SIZE: 22 },
})
const damage = p('sz_g2d_damage_sprite', {
  fields: { SPRITE: 'nave' },
  inputs: { AMOUNT: 1, FRAMES: 45 },
  beforeBlock: 'sz_g2d_shake',
})
const rule = (id: string, label: string, pattern: P, extra = {}) =>
  c(id, label, pattern.blockType, { ...pattern, ...extra })
const playing = (id: string, label: string, action: P) => rule(id, label, guarded(action), loop)
const groupCycle = (group: string) => [
  c(`mover-${group}`, `Mova ${group} antes de limpar o grupo.`, 'sz_g2d_update_group', {
    ...loop,
    fields: { GROUP: group },
    beforeBlock: 'sz_g2d_prune_offscreen',
  }),
  c(
    `limpar-${group}`,
    `Retire os ${group} que saem e depois desenhe esse grupo.`,
    'sz_g2d_prune_offscreen',
    { ...loop, fields: { GROUP: group }, beforeBlock: 'sz_g2d_draw_group' },
  ),
  c(`desenhar-${group}`, `Desenhe o grupo ${group} a cada quadro.`, 'sz_g2d_draw_group', {
    ...loop,
    fields: { GROUP: group },
  }),
]
export const checks = {
  areas: [
    c('inicio', 'Coloque Ao iniciar.', 'sz_frame_start', { count: 1 }),
    c('motor', 'Coloque Enquanto estiver rodando.', 'sz_frame_loops', { count: 1 }),
  ],
  tela: [
    c('tela', 'Prepare a tela de 800 × 480 em Ao iniciar.', 'sz_g2d_setup_stage', {
      ...start,
      inputs: { W: 800, H: 480 },
    }),
  ],
  nave: [
    rule('nave', 'Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.', ship, {
      ...start,
      count: 1,
    }),
  ],
  quadro: [
    c('quadro', 'Coloque A cada quadro do jogo em Enquanto estiver rodando.', frame, {
      area: 'loops',
      count: 1,
    }),
  ],
  fundo: [
    c('borracha', 'Limpe antes de desenhar o fundo de estrelas.', 'sz_g2d_clear', {
      ...loop,
      beforeBlock: 'sz_g2d_starfield',
    }),
    c('estrelas', 'Desenhe as estrelas com velocidade 1 a cada quadro.', 'sz_g2d_starfield', {
      ...loop,
      inputs: { SPEED: 1 },
    }),
  ],
  mover: [
    c(
      'setas',
      'Mova nave com as setas, velocidade 7, antes de prender à tela.',
      'sz_g2d_arrows_x',
      {
        ...loop,
        fields: { SPRITE: 'nave' },
        inputs: { SPEED: 7 },
        beforeBlock: 'sz_g2d_clamp_to_screen',
      },
    ),
    c('limite', 'Mantenha nave dentro da tela, no motor.', 'sz_g2d_clamp_to_screen', {
      ...loop,
      fields: { SPRITE: 'nave' },
    }),
  ],
  desenhar: [
    c('nave-visivel', 'Desenhe nave depois de manter dentro da tela.', 'sz_g2d_clamp_to_screen', {
      ...loop,
      fields: { SPRITE: 'nave' },
      beforeBlock: 'sz_g2d_draw_sprite',
    }),
    c('sprite-certo', 'Desenhe o sprite nave a cada quadro.', 'sz_g2d_draw_sprite', {
      ...loop,
      fields: { SPRITE: 'nave' },
    }),
    c('fundo-atras', 'As estrelas vêm antes do movimento da nave.', 'sz_g2d_starfield', {
      ...loop,
      beforeBlock: 'sz_g2d_arrows_x',
    }),
  ],
  grupoTiros: [
    c('grupo-tiros', 'Crie o grupo tiros em Ao iniciar.', 'sz_g2d_create_group', {
      ...start,
      fields: { NAME: 'tiros' },
      count: 1,
    }),
  ],
  espaco: [
    c(
      'evento-espaco',
      'Em Quando acontecer, coloque Quando apertar a tecla: barra de espaço.',
      'sz_g2d_on_key',
      { area: 'events', fields: { KEY: 'Space' }, count: 1 },
    ),
  ],
  origemTiro: [
    rule(
      'tiro-origem',
      'Dentro de Espaço, crie o tiro usando centro x e posição y da nave.',
      event(
        'Space',
        p(bullet.blockType, {
          fields: bullet.fields,
          inputBlocks: bullet.inputBlocks,
          inputs: { R: 5 },
        }),
      ),
      { area: 'events' },
    ),
  ],
  disparo: [
    rule(
      'disparo',
      'No evento Espaço: tiro com vx 0, vy −9 e depois som de tiro.',
      event('Space', bullet),
      { area: 'events' },
    ),
    c('tiro-unico', 'Mantenha apenas um comando de criar tiro.', 'sz_g2d_spawn_bullet', {
      count: 1,
    }),
  ],
  cicloTiros: groupCycle('tiros'),
  grupoAsteroides: [
    c('grupo-asteroides', 'Crie o grupo asteroides em Ao iniciar.', 'sz_g2d_create_group', {
      ...start,
      fields: { NAME: 'asteroides' },
      count: 1,
    }),
  ],
  relogio: [
    c(
      'relogio',
      'Use A cada 40 quadros como vizinho de A cada quadro do jogo.',
      'sz_g2d_every_frames',
      { area: 'loops', inputs: { N: 40 }, count: 1 },
    ),
    c('relogios-vizinhos', 'Os dois relógios são vizinhos em Enquanto estiver rodando.', frame, {
      area: 'loops',
      beforeBlock: 'sz_g2d_every_frames',
    }),
  ],
  asteroide: [
    rule(
      'asteroide',
      'No relógio, crie asteroide com x sorteado, y −30, tamanho 40, vx 0 e vy 3.',
      asteroid,
      { area: 'loops', withinBlock: 'sz_g2d_every_frames', count: 1 },
    ),
    c('criador-unico', 'Mantenha um único comando de criar asteroide.', 'sz_g2d_spawn_asteroid', {
      count: 1,
    }),
  ],
  cicloAsteroides: groupCycle('asteroides'),
  colisaoTiros: [
    rule(
      'remover-tiro',
      'Na colisão tiros × asteroides, remova o tiro do grupo tiros.',
      shotCollision(p('sz_g2d_remove_from_group', { fields: { SPRITE: 'tiro', GROUP: 'tiros' } })),
      loop,
    ),
    rule(
      'remover-pedra',
      'Na mesma colisão, remova o asteroide e então solte a explosão.',
      shotCollision(
        p('sz_g2d_remove_from_group', {
          fields: { SPRITE: 'asteroide', GROUP: 'asteroides' },
          beforeBlock: 'sz_g2d_explode',
        }),
      ),
      loop,
    ),
    rule(
      'explosao',
      'Exploda o asteroide atingido e toque o som de explosão dentro da colisão.',
      shotCollision(
        p('sz_g2d_explode', {
          fields: { SPRITE: 'asteroide' },
          beforeBlock: 'sz_g2d_play_explosion',
        }),
      ),
      loop,
    ),
  ],
  pontos: [
    c('pontos', 'Crie a variável pontos com 0 em Ao iniciar.', 'sz_js_var_create', {
      ...start,
      fields: { NAME: 'pontos' },
      inputs: { VALUE: 0 },
    }),
  ],
  somar: [
    rule(
      'somar-no-acerto',
      'Some 1 em pontos dentro da colisão tiros × asteroides.',
      shotCollision(addPoint),
      loop,
    ),
    c('soma-unica', 'Mantenha um único Somar 1 em pontos.', 'sz_js_var_increment', {
      fields: { NAME: 'pontos' },
      count: 1,
    }),
  ],
  placar: [
    rule('placar', 'Mostre Pontos: lendo a variável pontos, em x 12, y 30, tamanho 24.', hud, loop),
  ],
  vida: [
    c('vida', 'Dê 3 vidas à nave em Ao iniciar.', 'sz_g2d_set_health', {
      ...start,
      fields: { SPRITE: 'nave' },
      inputs: { AMOUNT: 3 },
    }),
  ],
  batida: [
    rule(
      'remover-inimigo',
      'Na colisão nave × asteroides, remova inimigo antes da explosão.',
      shipCollision(
        p('sz_g2d_remove_from_group', {
          fields: { SPRITE: 'inimigo', GROUP: 'asteroides' },
          beforeBlock: 'sz_g2d_explode',
        }),
      ),
      loop,
    ),
    rule(
      'dano-protegido',
      'Nessa colisão, tire 1 vida da nave, proteja por 45 quadros e trema a tela.',
      shipCollision(damage),
      loop,
    ),
    rule(
      'explodir-inimigo',
      'A explosão da batida usa inimigo, antes de machucar a nave.',
      shipCollision(
        p('sz_g2d_explode', { fields: { SPRITE: 'inimigo' }, beforeBlock: 'sz_g2d_damage_sprite' }),
      ),
      loop,
    ),
  ],
  coracoes: [rule('coracoes', 'Desenhe corações da nave em x 12, y 48, tamanho 22.', hearts, loop)],
  alvo: [
    c('alvo', 'Crie a constante alvo = 26 em Ao iniciar.', 'sz_js_const_create', {
      ...start,
      fields: { NAME: 'alvo' },
      inputs: { VALUE: 26 },
    }),
    c('tela-inicial', 'Vá para inicio em Ao iniciar.', 'sz_g2d_set_scene', {
      ...start,
      fields: { SCENE: 'inicio' },
    }),
  ],
  pergunta: [
    c('pergunta-jogando', 'No motor, use Se com a pergunta a tela atual é jogando.', iff, {
      ...loop,
      inputBlocks: { COND: scene('jogando') },
    }),
  ],
  guardarJogo: [
    playing(
      'guardar-fundo',
      'Leve a sequência para o então de Se jogando, começando por Limpar.',
      p('sz_g2d_clear', { beforeBlock: 'sz_g2d_starfield' }),
    ),
    playing(
      'guardar-nave',
      'O movimento da nave fica dentro de Se jogando.',
      p('sz_g2d_arrows_x', { fields: { SPRITE: 'nave' } }),
    ),
    playing('guardar-vidas', 'Os corações também ficam dentro de Se jogando.', hearts),
  ],
  guardarRelogio: [
    rule(
      'guardar-relogio',
      'Dentro do relógio de 40 quadros, crie asteroide só se a tela é jogando.',
      p('sz_g2d_every_frames', { inputs: { N: 40 }, inputBlocks: { BODY: guarded(asteroid) } }),
      { area: 'loops' },
    ),
    c(
      'um-asteroide',
      'Não deixe outro criador de asteroides fora da condição.',
      'sz_g2d_spawn_asteroid',
      { count: 1 },
    ),
  ],
  guardarTiro: [
    rule(
      'guardar-tiro',
      'Dentro de Espaço, coloque criar tiro e som no então de Se jogando.',
      event('Space', guarded(bullet)),
      { area: 'events' },
    ),
    c('um-tiro', 'Não deixe outro criador de tiro fora da condição.', 'sz_g2d_spawn_bullet', {
      count: 1,
    }),
  ],
  vitoria: [
    playing(
      'vitoria',
      'No final da partida, se pontos ≥ alvo, vá para vitoria.',
      p(iff, {
        inputBlocks: {
          COND: p('sz_val_compare', {
            fields: { OP: '>=' },
            inputBlocks: { LEFT: variable('pontos'), RIGHT: variable('alvo') },
          }),
          THEN: p('sz_g2d_set_scene', { fields: { SCENE: 'vitoria' } }),
        },
      }),
    ),
  ],
  derrota: [
    playing(
      'ordem-dos-finais',
      'Na partida, coloque a pergunta de vitória antes da pergunta de derrota.',
      p(iff, {
        beforeBlock: iff,
        inputBlocks: {
          COND: p('sz_val_compare', {
            fields: { OP: '>=' },
            inputBlocks: { LEFT: variable('pontos'), RIGHT: variable('alvo') },
          }),
          THEN: p('sz_g2d_set_scene', { fields: { SCENE: 'vitoria' } }),
        },
      }),
    ),
    playing(
      'derrota',
      'Se acabaram as vidas da nave, vá para fim, após a pergunta de vitória.',
      p(iff, {
        inputBlocks: {
          COND: p('sz_g2d_health_depleted', { fields: { SPRITE: 'nave' } }),
          THEN: p('sz_g2d_set_scene', { fields: { SCENE: 'fim' } }),
        },
      }),
    ),
  ],
  telas: ['inicio', 'vitoria', 'fim'].map((name, i) =>
    c(`tela-${name}`, `No senão se ${name}, encaixe Mostrar tela com a dica de Enter.`, iff, {
      ...loop,
      inputBlocks: {
        COND: scene('jogando'),
        [`ELSEIF_COND${i}`]: scene(name),
        [`ELSEIF_THEN${i}`]: p('sz_g2d_show_screen', {
          inputs: {
            HINT:
              name === 'inicio'
                ? 'Aperte Enter para começar'
                : 'Aperte Enter para voltar ao início',
          },
        }),
      },
    }),
  ),
  enter: [
    rule(
      'enter',
      'Enter: inicio vai para jogando; fim e vitoria reiniciam e voltam ao início.',
      event(
        'Enter',
        p(iff, {
          inputBlocks: {
            COND: scene('inicio'),
            THEN: p('sz_g2d_set_scene', { fields: { SCENE: 'jogando' } }),
            ELSEIF_COND0: scene('fim'),
            ELSEIF_THEN0: p('sz_g2d_restart'),
            ELSEIF_COND1: scene('vitoria'),
            ELSEIF_THEN1: p('sz_g2d_restart'),
          },
        }),
      ),
      { area: 'events' },
    ),
  ],
} satisfies Record<string, C[]>

export function finalChecks(day: number): C[] {
  if (day === 1)
    return [...checks.tela, ...checks.nave, ...checks.fundo, ...checks.mover, ...checks.desenhar]
  if (day === 2)
    return [...checks.nave, ...checks.grupoTiros, ...checks.disparo, ...checks.cicloTiros]
  if (day === 3)
    return [
      ...checks.disparo,
      ...checks.grupoAsteroides,
      ...checks.relogio,
      ...checks.asteroide,
      ...checks.cicloAsteroides,
      ...checks.colisaoTiros,
    ]
  if (day === 4)
    return [
      ...checks.pontos,
      ...checks.somar,
      ...checks.placar,
      ...checks.vida,
      ...checks.batida,
      ...checks.coracoes,
      ...checks.colisaoTiros,
    ]
  return [
    ...checks.alvo,
    ...checks.guardarJogo,
    ...checks.guardarRelogio,
    ...checks.guardarTiro,
    ...checks.vitoria,
    ...checks.derrota,
    ...checks.telas,
    ...checks.enter,
    playing('placar-jogando', 'O placar da variável fica na partida.', hud),
    playing('ponto-jogando', 'A colisão que soma pontos fica na partida.', shotCollision(addPoint)),
    playing('dano-jogando', 'A colisão que tira vida fica na partida.', shipCollision(damage)),
    ...checks.vida,
  ]
}
