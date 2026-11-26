import type {
  ExecutionCompare,
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type {
  ProjectBlockPattern as Pattern,
  SectionProjectCheck,
  SectionStructureRule,
} from '../../../packages/core/src/learning/section-progression'
import { etapas2D } from './construtor-2d-projetos'

const p = (
  blockType: string,
  fields?: Record<string, string | number | boolean>,
  extra: Partial<Pattern> = {},
): Pattern => ({ blockType, ...(fields ? { fields } : {}), ...extra })
const check = (
  id: string,
  label: string,
  rule: SectionStructureRule,
  hint: string,
): SectionProjectCheck => ({ id, label, rule, hint })
const uses = (
  pattern: Pattern,
  area?: 'start' | 'events' | 'loops',
  withinBlock?: string,
): SectionStructureRule => ({
  type: 'usesBlock',
  ...pattern,
  ...(area ? { area } : {}),
  ...(withinBlock ? { withinBlock } : {}),
})
const variable = (name: string) => p('sz_val_variable', { NAME: name })
const playing = (body?: Pattern | Pattern[]) =>
  p('sz_js_if_else', undefined, {
    inputBlocks: {
      COND: p('sz_g2d_scene_is', { SCENE: 'jogando' }),
      ...(!Array.isArray(body) && body ? { THEN: body } : {}),
    },
    ...(Array.isArray(body) ? { inputBlocksAll: { THEN: body } } : {}),
  })
const frame = (body: Pattern | Pattern[]) =>
  uses(
    p('sz_g2d_update_each_frame', undefined, {
      inputBlocks: { BODY: playing(body) },
    }),
    'loops',
  )
const remove = (sprite: string, group: string) =>
  p('sz_g2d_remove_from_group', { SPRITE: sprite, GROUP: group })
const victory = p('sz_js_if_else', undefined, {
  inputBlocks: {
    COND: p(
      'sz_val_compare',
      { OP: '>=' },
      { inputBlocks: { LEFT: variable('pontos'), RIGHT: variable('meta') } },
    ),
    THEN: p('sz_g2d_set_scene', { SCENE: 'vitoria' }),
  },
})
const outcome = p('sz_js_if_else', undefined, {
  inputBlocks: {
    COND: p('sz_g2d_health_depleted', { SPRITE: 'nave' }),
    THEN: p('sz_g2d_set_scene', { SCENE: 'derrota' }),
    ELSE: victory,
  },
})
const begin: ExecutionStep[] = [
  { action: 'press', key: 'Enter', holdMs: 40 },
  { action: 'wait', ms: 50 },
]
const value = (
  path: string,
  compare: ExecutionCompare,
  expected?: number,
): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare,
  ...(expected === undefined ? {} : { value: expected }),
})
function behavior(
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints?: Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints'],
): SectionProjectCheck {
  return {
    id,
    label,
    hint: 'Clique no jogo e repita o teste da aula. Confira os blocos e em qual momento suas ações ficam permitidas.',
    rule: { type: 'behavior', steps, expect, ...(checkpoints?.length ? { checkpoints } : {}) },
  }
}

/**
 * Critérios cumulativos por sistema: nenhuma conquista anterior some da verificação.
 * Os agrupamentos respeitam o limite de vinte objetivos e quatro níveis de padrões.
 * As oito observações de execução leem somente escalares, como faz o executor real;
 * não serializam sprites, grupos inteiros, Canvas ou o estado completo do projeto.
 */
export function criterios2D(etapa: string): SectionProjectCheck[] {
  const index = etapas2D.indexOf(etapa as (typeof etapas2D)[number])
  if (index < 0) throw new Error(`Critérios ausentes: ${etapa}`)
  const reached = (stage: (typeof etapas2D)[number]) => index >= etapas2D.indexOf(stage)
  const checks: SectionProjectCheck[] = []
  const prepared = [
    p('sz_g2d_create_image_sprite', { NAME: 'nave' }, { inputs: { W: 56, H: 64 } }),
    p('sz_g2d_set_scene', { SCENE: 'inicio' }),
  ]
  if (reached('grupo-tiros')) prepared.push(p('sz_g2d_create_group', { NAME: 'tiros' }))
  if (reached('relogio-asteroides')) prepared.push(p('sz_g2d_create_group', { NAME: 'asteroides' }))
  if (reached('placar'))
    prepared.push(p('sz_js_var_create', { NAME: 'pontos' }, { inputs: { VALUE: 0 } }))
  if (reached('vidas'))
    prepared.push(p('sz_g2d_set_health', { SPRITE: 'nave' }, { inputs: { AMOUNT: 3 } }))
  if (reached('meta'))
    prepared.push(p('sz_js_var_create', { NAME: 'meta' }, { inputs: { VALUE: 20 } }))
  checks.push(
    check(
      'nave-preservada',
      reached('meta')
        ? 'Comece com grupos vazios, zero pontos, três vidas e meta 20, conservando a nave.'
        : reached('vidas')
          ? 'Conserve a preparação: grupos, pontos em zero, nave e três vidas.'
          : reached('placar')
            ? 'Conserve a nave, os dois grupos e pontos começando em zero.'
            : reached('grupo-tiros')
              ? 'Conserve a nave e crie em Ao iniciar os grupos que você já montou.'
              : 'Conserve a nave e a abertura; a escolha da imagem mantém seu tamanho.',
      uses(p('sz_frame_start', undefined, { inputBlocksAll: { CHILDREN: prepared } }), 'start'),
      'Confira Ao iniciar: mantenha a nave com largura 56 e altura 64 e prepare os valores que já aprendeu.',
    ),
  )

  if (reached('movimento')) {
    const moving = p(
      'sz_g2d_arrows_x',
      { SPRITE: 'nave' },
      {
        inputs: { SPEED: 5 },
        ...(reached('limite')
          ? { beforePattern: p('sz_g2d_clamp_to_screen', { SPRITE: 'nave' }) }
          : {}),
      },
    )
    checks.push(
      check(
        'movimento-na-partida',
        reached('limite')
          ? 'Mova a nave com passinho 5 e confira a borda depois, dentro de Se jogando.'
          : 'Mova a nave com passinho 5 dentro de Se jogando, a cada quadro.',
        frame(moving),
        'O movimento fica no então de Se jogando; o limite vem logo depois dele.',
      ),
    )
  }

  const drawings = [p('sz_g2d_draw_sprite', { SPRITE: 'nave' })]
  if (reached('grupo-tiros')) drawings.push(p('sz_g2d_draw_group', { GROUP: 'tiros' }))
  if (reached('asteroides')) drawings.push(p('sz_g2d_draw_group', { GROUP: 'asteroides' }))
  if (reached('placar'))
    drawings.push(p('sz_g2d_draw_score', undefined, { inputBlocks: { VALUE: variable('pontos') } }))
  if (reached('vidas')) drawings.push(p('sz_g2d_draw_sprite_health', { SPRITE: 'nave' }))
  if (reached('meta'))
    drawings.push(
      p('sz_g2d_draw_score', undefined, { inputBlocks: { VALUE: variable('meta') } }),
      p('sz_g2d_draw_bar', undefined, {
        inputBlocks: { VALUE: variable('pontos'), MAX: variable('meta') },
      }),
    )
  if (reached('instrucoes'))
    drawings.push(
      p('sz_g2d_draw_label', undefined, {
        inputBlocks: {
          TEXT: p('sz_val_text', undefined, {
            fieldText: { TEXT: { nonBlank: true, containsAll: [['setas'], ['espaço']] } },
          }),
        },
      }),
    )
  checks.push(
    check(
      'desenho-preservado',
      'Continue desenhando a nave e tudo que já acrescentou ao seu jogo.',
      uses(
        p('sz_g2d_update_each_frame', undefined, { inputBlocksAll: { BODY: drawings } }),
        'loops',
      ),
      'Depois de Limpar a tela ficam os desenhos: nave, grupos, legenda e os indicadores que você já montou.',
    ),
  )

  if (reached('evento-tiro')) {
    const shotActions = [p('sz_g2d_play_fx', { FX: 'shoot' })]
    if (reached('grupo-tiros'))
      shotActions.push(
        p(
          'sz_g2d_spawn_image_in_group',
          { GROUP: 'tiros' },
          {
            inputs: {
              W: 10,
              H: 28,
              VX: 0,
              VY: reached('voo-tiros') ? -7 : 0,
              ...(!reached('origem-tiro') ? { X: 395, Y: 372 } : {}),
            },
            ...(reached('origem-tiro')
              ? {
                  inputBlocks: {
                    X: p(
                      'sz_math_arithmetic',
                      { OP: '-' },
                      {
                        inputBlocks: { A: p('sz_g2d_center_x', { SPRITE: 'nave' }) },
                        inputs: { B: 5 },
                      },
                    ),
                    Y: p(
                      'sz_math_arithmetic',
                      { OP: '-' },
                      {
                        inputBlocks: { A: p('sz_g2d_sprite_y', { SPRITE: 'nave' }) },
                        inputs: { B: 24 },
                      },
                    ),
                  },
                }
              : {}),
          },
        ),
      )
    checks.push(
      check(
        'evento-protegido',
        reached('voo-tiros')
          ? 'Em Espaço, crie um laser na nave, com vx 0 e vy -7, somente em jogando.'
          : reached('origem-tiro')
            ? 'Crie o laser lendo a posição atual da nave, dentro de Se jogando.'
            : reached('grupo-tiros')
              ? 'Crie um laser parado no grupo tiros ao apertar Espaço durante a partida.'
              : 'No evento de Espaço, toque o efeito de tiro somente em jogando.',
        uses(
          p('sz_g2d_on_key', { KEY: 'Space' }, { inputBlocks: { BODY: playing(shotActions) } }),
          'events',
        ),
        'Conserve o evento, sua guarda e o som. O laser mede 10 por 28; antes do voo, sua velocidade é zero.',
      ),
    )
  }

  const transport: Pattern[] = []
  if (reached('voo-tiros')) transport.push(p('sz_g2d_update_group', { GROUP: 'tiros' }))
  if (reached('asteroides')) transport.push(p('sz_g2d_update_group', { GROUP: 'asteroides' }))
  if (reached('limpeza-tiros')) transport.push(p('sz_g2d_prune_offscreen', { GROUP: 'tiros' }))
  if (reached('limpeza-asteroides'))
    transport.push(p('sz_g2d_prune_offscreen', { GROUP: 'asteroides' }))
  if (transport.length)
    checks.push(
      check(
        'transporte-e-limpeza',
        'Conserve o movimento e a retirada dos grupos que já construiu.',
        frame(transport),
        'Dentro de Se jogando, mova cada grupo e retire quem sai da tela depois do movimento.',
      ),
    )

  if (reached('relogio-asteroides')) {
    const asteroid = reached('asteroides')
      ? p(
          'sz_g2d_spawn_image_in_group',
          { GROUP: 'asteroides' },
          {
            inputs: { Y: -52, W: 48, H: 48, VX: 0, VY: 2 },
            inputBlocks: { X: p('sz_val_random', undefined, { inputs: { MIN: 24, MAX: 728 } }) },
          },
        )
      : undefined
    checks.push(
      check(
        'intervalo-asteroides',
        reached('asteroides')
          ? 'Crie os asteroides a cada 1,5 segundos, acima da tela e descendo com vy 2.'
          : 'Use A cada 1,5 segundos com a guarda Se jogando.',
        uses(
          p('sz_g2d_every_seconds', undefined, {
            inputs: { SECS: 1.5 },
            inputBlocks: { BODY: playing(asteroid) },
          }),
          'loops',
        ),
        'O relógio fica fora de A cada quadro. O asteroide mede 48 por 48; x sorteia de 24 a 728 e y começa em -52.',
      ),
    )
  }

  if (reached('colisao-tiros')) {
    const hit = [remove('tiro', 'tiros'), remove('asteroide', 'asteroides')]
    if (reached('efeitos-acerto'))
      hit.push(
        p('sz_g2d_explode', { SPRITE: 'asteroide' }),
        p('sz_g2d_play_fx', { FX: 'explosion' }),
      )
    if (reached('pontos')) hit.push(p('sz_js_var_increment', { NAME: 'pontos', DELTA: 1 }))
    checks.push(
      check(
        'retirar-o-par',
        reached('pontos')
          ? 'No acerto, retire só o par, mantenha os efeitos e some um ponto.'
          : reached('efeitos-acerto')
            ? 'No acerto, retire só o par e mantenha explosão e som.'
            : 'No encontro de tiros e asteroides, retire somente os dois sprites do par.',
        frame(
          p(
            'sz_g2d_on_group_overlap',
            { A: 'tiros', B: 'asteroides', ANAME: 'tiro', BNAME: 'asteroide' },
            { inputBlocksAll: { BODY: hit } },
          ),
        ),
        'A consequência usa tiro e asteroide desse encontro. A soma só entra depois de você criar pontos.',
      ),
    )
  }
  if (reached('colisao-nave')) {
    const crash = [remove('atingiuNave', 'asteroides')]
    if (reached('dano'))
      crash.push(
        p('sz_g2d_damage_sprite', { SPRITE: 'nave' }, { inputs: { AMOUNT: 1, FRAMES: 60 } }),
      )
    checks.push(
      check(
        'dano-e-protecao',
        reached('dano')
          ? 'Retire a pedra da batida e tire uma vida, com proteção de 60 quadros.'
          : 'No encontro com a nave, retire só a pedra chamada atingiuNave.',
        frame(
          p(
            'sz_g2d_on_sprite_group_overlap',
            { GROUP: 'asteroides', SPRITE: 'nave', ANAME: 'atingiuNave' },
            { inputBlocksAll: { BODY: crash } },
          ),
        ),
        'A colisão da nave usa seu próprio asteroide. Dano e retirada ficam juntos no encontro, dentro de Se jogando.',
      ),
    )
  }
  if (reached('vitoria') && !reached('derrota'))
    checks.push(
      check(
        'condicao-vitoria',
        'Depois das colisões, use pontos maior ou igual a meta para selecionar vitoria.',
        frame(victory),
        'A condição usa a contagem pontos e a meta fixa, dentro de Se jogando.',
      ),
    )
  if (reached('derrota')) {
    checks.push(
      check(
        'resultado-na-partida',
        'Confira as vidas dentro de Se jogando, depois das colisões.',
        frame(
          p('sz_js_if_else', undefined, {
            inputBlocks: {
              COND: p('sz_g2d_health_depleted', { SPRITE: 'nave' }),
              THEN: p('sz_g2d_set_scene', { SCENE: 'derrota' }),
            },
          }),
        ),
        'A pergunta pelas vidas pertence ao então de Se jogando.',
      ),
    )
    checks.push(
      check(
        'resultado-unico',
        'Pergunte pelas vidas primeiro; no senão, confira a vitória.',
        uses(outcome, 'loops', 'sz_g2d_update_each_frame'),
        'A pergunta das vidas abraça a pergunta da vitória no seu senão; as duas não ficam soltas.',
      ),
    )
  }

  // As conquistas de execução continuam presentes depois da aula que as introduziu.
  if (reached('movimento')) {
    const bordered = reached('limite')
    checks.push(
      behavior(
        'voar-direita',
        bordered
          ? 'Faça a nave chegar à borda direita e permanecer dentro da tela.'
          : 'Faça a nave ir para a direita depois de começar.',
        [...begin, { action: 'press', key: 'ArrowRight', holdMs: bordered ? 3500 : 240 }],
        value('nave.x', bordered ? 'equals' : 'increased', bordered ? 744 : undefined),
      ),
    )
    checks.push(
      behavior(
        'voar-esquerda',
        bordered
          ? 'Faça a nave chegar à borda esquerda e permanecer dentro da tela.'
          : 'Faça a nave ir para a esquerda depois de começar.',
        [...begin, { action: 'press', key: 'ArrowLeft', holdMs: bordered ? 3500 : 240 }],
        value('nave.x', bordered ? 'equals' : 'decreased', bordered ? 0 : undefined),
      ),
    )
  }
  if (reached('grupo-tiros'))
    checks.push(
      behavior(
        'um-tiro-por-toque',
        'Crie um laser por toque em Espaço durante a partida.',
        [...begin, { action: 'press', key: 'Space', holdMs: 120 }],
        value('tiros.items.length', 'equals', 1),
      ),
    )
  if (reached('limpeza-tiros'))
    checks.push(
      behavior(
        'tiro-retirado',
        'Retire do grupo o laser que terminou de atravessar a tela.',
        [...begin, { action: 'press', key: 'Space', holdMs: 40 }, { action: 'wait', ms: 4000 }],
        value('tiros.items.length', 'equals', 0),
        [{ afterStep: 3, expect: value('tiros.items.length', 'equals', 1) }],
      ),
    )
  if (reached('asteroides'))
    checks.push(
      behavior(
        'pedra-criada',
        'Durante a partida, deixe o relógio criar um asteroide.',
        [...begin, { action: 'wait', ms: 1800 }],
        value('asteroides.items.length', 'equals', 1),
      ),
    )
  if (reached('evento-tiro')) {
    const checkpoints: Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints'] = []
    if (reached('grupo-tiros'))
      checkpoints.push({ afterStep: 2, expect: value('tiros.items.length', 'equals', 0) })
    checks.push(
      behavior(
        'abertura-protegida',
        'Antes de Enter, mantenha a nave parada e o disparo desativado.',
        [
          { action: 'press', key: 'ArrowRight', holdMs: 240 },
          { action: 'press', key: 'Space', holdMs: 120 },
        ],
        value('nave.x', 'equals', 372),
        checkpoints,
      ),
    )
  }
  if (reached('placar')) {
    const checkpoints: Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints'] = []
    if (reached('vidas')) checkpoints.push({ afterStep: 0, expect: value('nave.hp', 'equals', 3) })
    if (reached('meta')) checkpoints.push({ afterStep: 0, expect: value('meta', 'equals', 20) })
    checks.push(
      behavior(
        'valores-iniciais',
        reached('meta')
          ? 'Abra com zero pontos, três vidas e meta 20.'
          : reached('vidas')
            ? 'Abra com zero pontos e três vidas.'
            : 'Comece o placar em zero.',
        [{ action: 'wait', ms: 50 }],
        value('pontos', 'equals', 0),
        checkpoints,
      ),
    )
  }
  if (reached('asteroides'))
    checks.push(
      behavior(
        'abertura-sem-pedras',
        'Espere o início da partida para criar asteroides.',
        [{ action: 'wait', ms: 2200 }],
        value('asteroides.items.length', 'equals', 0),
      ),
    )
  return checks
}
