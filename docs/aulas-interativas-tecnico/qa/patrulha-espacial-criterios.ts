import type { ExecutionExpectation } from '../../../packages/core/src/learning/project-execution'
import type {
  ProjectBlockPattern,
  SectionProjectCheck,
  SectionStructureRule,
} from '../../../packages/core/src/learning/section-progression'
import { PATRULHA_ETAPAS, type PatrulhaEtapa } from './patrulha-espacial-projeto'

const check = (id: string, label: string, rule: SectionStructureRule): SectionProjectCheck => ({
  id,
  label,
  rule,
})
const variable = (NAME: string): ProjectBlockPattern => ({
  blockType: 'sz_val_variable',
  fields: { NAME },
})
const assign = (NAME: string, VALUE: string | boolean): ProjectBlockPattern => ({
  blockType: 'sz_js_var_assign',
  fields: { NAME },
  inputs: { VALUE },
})
const comparison = (
  left: ProjectBlockPattern,
  OP: string,
  RIGHT: string | number,
): ProjectBlockPattern => ({
  blockType: 'sz_val_compare',
  fields: { OP },
  inputs: { RIGHT },
  inputBlocks: { LEFT: left },
})
const playing = (body: ProjectBlockPattern[]): ProjectBlockPattern => ({
  blockType: 'sz_js_if_else',
  inputBlocks: { COND: comparison(variable('estado'), '===', 'jogando') },
  inputBlocksAll: { THEN: body },
})
const inLoop = (body: ProjectBlockPattern[]): SectionStructureRule => ({
  type: 'usesBlock',
  area: 'loops',
  blockType: 'sz_g3d_animate',
  fields: { WORLD: 'cena' },
  inputBlocks: { BODY: playing(body) },
})
const remove = (OBJ: string, GROUP: string): ProjectBlockPattern => ({
  blockType: 'sz_g3d_remove_from_group',
  fields: { OBJ, GROUP },
})
const scoreText: ProjectBlockPattern = {
  blockType: 'sz_g3d_hud_text',
  fields: { CORNER: 'top-right' },
  inputBlocks: {
    TEXT: {
      blockType: 'sz_math_arithmetic',
      fields: { OP: '+' },
      inputs: { B: ' / 20' },
      inputBlocks: {
        A: {
          blockType: 'sz_math_arithmetic',
          fields: { OP: '+' },
          inputs: { A: 'Acertos: ' },
          inputBlocks: { B: variable('pontos') },
        },
      },
    },
  },
}

function hit(body: ProjectBlockPattern[]): SectionStructureRule {
  // O motor limita os padrões a quatro níveis. O contexto do par e da guarda
  // é conferido separadamente; aqui todas as ações pertencem ao mesmo contato.
  return {
    type: 'usesBlock',
    area: 'loops',
    withinBlock: 'sz_g3d_for_each_in_group',
    blockType: 'sz_js_if_else',
    inputBlocks: { COND: { blockType: 'sz_g3d_collides', fields: { A: 'tiro', B: 'asteroide' } } },
    inputBlocksAll: { THEN: body },
  }
}

export function patrulhaChecks(etapa: string): SectionProjectCheck[] {
  const n = PATRULHA_ETAPAS.indexOf(etapa as PatrulhaEtapa)
  if (n < 0) throw new Error(`Etapa desconhecida dos critérios: ${etapa}`)
  if (n === 0) return []
  const tem = (feature: PatrulhaEtapa) => n >= PATRULHA_ETAPAS.indexOf(feature)
  const objetivos: SectionProjectCheck[] = []

  const spawnTiro: ProjectBlockPattern = {
    blockType: 'sz_g3d_spawn_copy',
    fields: { ORIGINAL: 'moldeTiro', GROUP: 'tiros' },
    inputs: { Y: 1, Z: -1.6, ...(!tem('origem') ? { X: 0 } : {}) },
    ...(tem('origem')
      ? { inputBlocks: { X: { blockType: 'sz_g3d_get_pos', fields: { OBJ: 'nave', AXIS: 'x' } } } }
      : {}),
  }
  objetivos.push(
    check(
      'disparo-protegido',
      tem('origem')
        ? 'Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.'
        : 'Crie uma cópia do moldeTiro ao apertar Espaço durante a partida.',
      {
        type: 'usesBlock',
        area: 'events',
        blockType: 'sz_g3d_on_key',
        fields: { KEY: 'Space' },
        inputBlocks: {
          BODY: playing([
            spawnTiro,
            { blockType: 'sz_g3d_play_note', inputs: { FREQ: 880, MS: 60 } },
          ]),
        },
      },
    ),
  )

  // O executor oficial lê paths escalares. Scripts fotografam todas as variáveis,
  // o que não é válido para cena/objetos Three.js com referências circulares.
  const valoresIniciais: { afterStep: number; expect: ExecutionExpectation }[] = [
    {
      afterStep: 0,
      expect: {
        target: { kind: 'value', path: 'velocidadeTiros' },
        compare: 'equals',
        value: tem('trajeto-tiro') ? -22 : 0,
      },
    },
    {
      afterStep: 0,
      expect: {
        target: { kind: 'value', path: 'velocidadeAsteroides' },
        compare: 'equals',
        value: tem('trajeto-asteroide') ? 7 : 0,
      },
    },
    {
      afterStep: 0,
      expect: { target: { kind: 'value', path: 'tiros.length' }, compare: 'equals', value: 0 },
    },
    {
      afterStep: 0,
      expect: { target: { kind: 'value', path: 'asteroides.length' }, compare: 'equals', value: 0 },
    },
  ]
  if (tem('contador'))
    valoresIniciais.push({
      afterStep: 0,
      expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 0 },
    })
  if (tem('vidas'))
    valoresIniciais.push({
      afterStep: 0,
      expect: { target: { kind: 'value', path: 'nave._szLife.hp' }, compare: 'equals', value: 3 },
    })
  if (tem('placar'))
    valoresIniciais.push({
      afterStep: 0,
      expect: { target: { kind: 'text' }, compare: 'contains', value: 'Acertos: 0 / 20' },
    })
  objetivos.push({
    id: 'valores-do-comeco',
    label: tem('vidas')
      ? 'Comece na abertura, com grupos vazios, zero pontos, três vidas e as velocidades da patrulha.'
      : tem('contador')
        ? 'Comece na abertura, com grupos vazios, contador zero e as velocidades já construídas.'
        : 'Conserve a abertura, os grupos vazios e as velocidades desta etapa.',
    rule: {
      type: 'behavior',
      steps: [],
      checkpoints: valoresIniciais,
      expect: { target: { kind: 'value', path: 'estado' }, compare: 'equals', value: 'inicio' },
    },
  })

  const limites: ProjectBlockPattern[] = []
  if (tem('limite-tiro'))
    limites.push({
      blockType: 'sz_g3d_prune_area',
      fields: { GROUP: 'tiros', AXIS: 'z' },
      inputs: { MIN: -36, MAX: 3 },
    })
  if (tem('limite-asteroide'))
    limites.push({
      blockType: 'sz_g3d_prune_area',
      fields: { GROUP: 'asteroides', AXIS: 'z' },
      inputs: { MIN: -36, MAX: 6 },
    })
  if (limites.length)
    objetivos.push(
      check(
        'limites-dos-grupos',
        tem('limite-asteroide')
          ? 'Retire tiros e asteroides quando saírem dos limites de profundidade.'
          : 'Retire os tiros que saírem do intervalo de Z −36 a 3.',
        inLoop(limites),
      ),
    )

  if (tem('relogio')) {
    const x: ProjectBlockPattern = {
      blockType: 'sz_math_arithmetic',
      fields: { OP: '-' },
      inputs: { B: 5.2 },
      inputBlocks: {
        A: {
          blockType: 'sz_math_arithmetic',
          fields: { OP: '*' },
          inputs: { B: 10.4 },
          inputBlocks: { A: { blockType: 'sz_val_random_float' } },
        },
      },
    }
    objetivos.push(
      check(
        'surgimento-protegido',
        tem('entrada')
          ? 'Crie asteroides a cada 1,5 segundo, na faixa fornecida e somente durante a partida.'
          : 'Crie um asteroide a cada 1,5 segundo enquanto estiver jogando.',
        {
          type: 'usesBlock',
          area: 'loops',
          blockType: 'sz_g3d_every_seconds',
          inputs: { SECS: 1.5 },
          inputBlocks: {
            BODY: playing([
              {
                blockType: 'sz_g3d_spawn_copy',
                fields: { ORIGINAL: 'moldeAsteroide', GROUP: 'asteroides' },
                inputs: { Y: 1, Z: -28, ...(!tem('entrada') ? { X: 0 } : {}) },
              },
            ]),
          },
        },
      ),
    )
    if (tem('entrada'))
      objetivos.push(
        check(
          'faixa-de-entrada',
          'Use a receita fornecida no X da cópia de asteroide, dentro do relógio.',
          {
            type: 'usesBlock',
            area: 'loops',
            withinBlock: 'sz_g3d_every_seconds',
            blockType: 'sz_g3d_spawn_copy',
            fields: { ORIGINAL: 'moldeAsteroide', GROUP: 'asteroides' },
            inputs: { Y: 1, Z: -28 },
            inputBlocks: { X: x },
          },
        ),
      )
  }

  if (tem('contato')) {
    const body: ProjectBlockPattern[] = [
      remove('asteroide', 'asteroides'),
      remove('tiro', 'tiros'),
      assign('alvoAtivo', false),
      { blockType: 'sz_g3d_play_effect', fields: { KIND: 'coin' } },
    ]
    if (tem('soma'))
      body.push({ blockType: 'sz_js_var_increment', fields: { NAME: 'pontos', DELTA: 1 } })
    if (tem('placar')) body.push(scoreText)
    objetivos.push(
      check(
        'par-e-alvo-ativo',
        'Confira o contato dentro do par de grupos e da pergunta alvoAtivo já preparada.',
        {
          type: 'usesBlock',
          area: 'loops',
          withinBlock: 'sz_g3d_animate',
          blockType: 'sz_g3d_for_each_in_group',
          fields: { GROUP: 'asteroides', ITEM: 'asteroide' },
          inputBlocks: {
            BODY: {
              blockType: 'sz_g3d_for_each_in_group',
              fields: { GROUP: 'tiros', ITEM: 'tiro' },
              inputBlocks: {
                BODY: {
                  blockType: 'sz_js_if_else',
                  inputBlocks: {
                    COND: variable('alvoAtivo'),
                    THEN: {
                      blockType: 'sz_js_if_else',
                      inputBlocks: {
                        COND: {
                          blockType: 'sz_g3d_collides',
                          fields: { A: 'tiro', B: 'asteroide' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ),
    )
    objetivos.push(
      check(
        'acerto-do-par',
        tem('placar')
          ? 'No acerto, retire o par, consuma o alvo e atualize pontos e placar uma única vez.'
          : tem('soma')
            ? 'Some um ponto no acerto que retira o tiro e consome o asteroide.'
            : 'Ao encostar, retire só o tiro e o asteroide envolvidos e marque o alvo como consumido.',
        hit(body),
      ),
    )
  }
  if (tem('contador'))
    objetivos.push(
      check('contador-inicial', 'Crie pontos com valor zero em Ao iniciar.', {
        type: 'usesBlock',
        area: 'start',
        blockType: 'sz_js_var_create',
        fields: { NAME: 'pontos' },
        inputs: { VALUE: 0 },
      }),
    )
  if (tem('placar'))
    objetivos.push(
      check('placar-inicial', 'Mostre Acertos: 0 / 20 em cima, à direita, no começo.', {
        type: 'usesBlock',
        area: 'start',
        blockType: 'sz_g3d_hud_text',
        fields: { CORNER: 'top-right' },
        inputs: { TEXT: 'Acertos: 0 / 20' },
      }),
    )
  if (tem('vidas'))
    objetivos.push(
      check('vida-inicial', 'Dê três vidas à nave em Ao iniciar.', {
        type: 'usesBlock',
        area: 'start',
        blockType: 'sz_g3d_set_life',
        fields: { OBJ: 'nave' },
        inputs: { VALUE: 3 },
      }),
    )
  if (tem('dano')) {
    const body: ProjectBlockPattern[] = [
      { blockType: 'sz_g3d_hurt', fields: { OBJ: 'nave' }, inputs: { VALUE: 1 } },
      { blockType: 'sz_g3d_play_effect', fields: { KIND: 'hit' } },
    ]
    if (tem('retirada-batida')) body.unshift(remove('asteroideQueBateu', 'asteroides'))
    objetivos.push(
      check(
        'batida-na-nave',
        tem('retirada-batida')
          ? 'Na batida durante a partida, retire o asteroide envolvido e tire uma vida da nave.'
          : 'Tire uma vida da nave quando ela encostar num asteroide durante a partida.',
        {
          type: 'usesBlock',
          area: 'events',
          blockType: 'sz_g3d_on_touch_group',
          fields: { OBJ: 'nave', GROUP: 'asteroides', ITEM: 'asteroideQueBateu' },
          inputBlocks: { BODY: playing(body) },
        },
      ),
    )
  }
  if (tem('derrota')) {
    const decision: ProjectBlockPattern = {
      blockType: 'sz_js_if_else',
      inputBlocks: {
        COND: comparison({ blockType: 'sz_g3d_life_of', fields: { OBJ: 'nave' } }, '<=', 0),
      },
      inputBlocksAll: {
        THEN: [
          assign('estado', 'derrota'),
          {
            blockType: 'sz_g3d_hud_text',
            fields: { CORNER: 'bottom-center' },
            inputs: { TEXT: '' },
          },
          { blockType: 'sz_g3d_end_game', fields: { RESULT: 'perdeu' } },
        ],
      },
    }
    if (tem('vitoria'))
      decision.inputBlocks!.ELSE = {
        blockType: 'sz_js_if_else',
        inputBlocks: { COND: comparison(variable('pontos'), '>=', 20) },
        inputBlocksAll: {
          THEN: [
            assign('estado', 'vitoria'),
            { blockType: 'sz_g3d_end_game', fields: { RESULT: 'ganhou' } },
            {
              blockType: 'sz_g3d_hud_text',
              fields: { CORNER: 'bottom-center' },
              inputs: { TEXT: '' },
            },
            { blockType: 'sz_g3d_play_effect', fields: { KIND: 'coin' } },
          ],
        },
      }
    const result = playing([decision])
    result.beforePattern = playing([{ blockType: 'sz_g3d_set_position', fields: { OBJ: 'nave' } }])
    objetivos.push(
      check(
        'decisao-do-resultado',
        tem('vitoria')
          ? 'Confira primeiro vida zero; senão, confira a meta e acione um único resultado.'
          : 'No começo do quadro, encerre com derrota quando a vida chegar a zero.',
        {
          type: 'usesBlock',
          area: 'loops',
          withinBlock: 'sz_g3d_animate',
          ...result,
        },
      ),
    )
  }

  // Cada conquista permanece nas partes seguintes. As ações abrem uma instância
  // nova e usam apenas teclado/espera e observações escalares do contrato oficial.
  objetivos.push({
    id: 'um-aperto-um-tiro',
    label: 'Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.',
    rule: {
      type: 'behavior',
      steps: [
        { action: 'press', key: 'Space' },
        { action: 'press', key: 'Enter' },
        { action: 'press', key: 'Space' },
        { action: 'press', key: 'Space' },
      ],
      checkpoints: [
        {
          afterStep: 1,
          expect: { target: { kind: 'value', path: 'tiros.length' }, compare: 'equals', value: 0 },
        },
        {
          afterStep: 3,
          expect: { target: { kind: 'value', path: 'tiros.length' }, compare: 'equals', value: 1 },
        },
      ],
      expect: { target: { kind: 'value', path: 'tiros.length' }, compare: 'equals', value: 2 },
    },
  })
  objetivos.push({
    id: 'pilotar-so-na-partida',
    label:
      'Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.',
    rule: {
      type: 'behavior',
      steps: [
        { action: 'press', key: 'ArrowRight', holdMs: 250 },
        { action: 'press', key: 'Enter' },
        { action: 'press', key: 'ArrowRight', holdMs: 750 },
        { action: 'press', key: 'ArrowLeft', holdMs: 1500 },
      ],
      checkpoints: [
        {
          afterStep: 1,
          expect: {
            target: { kind: 'value', path: 'nave.position.x' },
            compare: 'equals',
            value: 0,
          },
        },
        {
          afterStep: 3,
          expect: {
            target: { kind: 'value', path: 'nave.position.x' },
            compare: 'greaterThan',
            value: 0,
          },
        },
        {
          afterStep: 3,
          expect: {
            target: { kind: 'value', path: 'nave.position.x' },
            compare: 'atMost',
            value: 5.2,
          },
        },
        {
          afterStep: 4,
          expect: {
            target: { kind: 'value', path: 'nave.position.x' },
            compare: 'atLeast',
            value: -5.2,
          },
        },
        {
          afterStep: 4,
          expect: {
            target: { kind: 'value', path: 'nave.position.y' },
            compare: 'equals',
            value: 1,
          },
        },
        {
          afterStep: 4,
          expect: {
            target: { kind: 'value', path: 'nave.position.z' },
            compare: 'equals',
            value: 0,
          },
        },
      ],
      expect: { target: { kind: 'value', path: 'nave.position.x' }, compare: 'lessThan', value: 0 },
    },
  })
  if (tem('limite-tiro'))
    objetivos.push({
      id: 'tiro-sai-do-grupo',
      label: 'Confira que o tiro criado sai do grupo ao terminar seu caminho.',
      rule: {
        type: 'behavior',
        steps: [
          { action: 'press', key: 'Enter' },
          { action: 'press', key: 'Space' },
          { action: 'wait', ms: 2100 },
        ],
        checkpoints: [
          {
            afterStep: 2,
            expect: {
              target: { kind: 'value', path: 'tiros.length' },
              compare: 'equals',
              value: 1,
            },
          },
        ],
        expect: { target: { kind: 'value', path: 'tiros.length' }, compare: 'equals', value: 0 },
      },
    })
  if (tem('relogio'))
    objetivos.push({
      id: 'relogio-respeita-comeco',
      label: 'Espere na abertura sem asteroides; depois de Enter, confira o surgimento.',
      rule: {
        type: 'behavior',
        steps: [
          { action: 'wait', ms: 1700 },
          { action: 'press', key: 'Enter' },
          { action: 'wait', ms: 1700 },
        ],
        checkpoints: [
          {
            afterStep: 1,
            expect: {
              target: { kind: 'value', path: 'asteroides.length' },
              compare: 'equals',
              value: 0,
            },
          },
        ],
        expect: {
          target: { kind: 'value', path: 'asteroides.length' },
          compare: 'atLeast',
          value: 1,
        },
      },
    })
  if (etapa === 'completo')
    objetivos.push({
      id: 'avisos-da-partida',
      label:
        'Mostre os quatro avisos fornecidos: os dois da abertura e os dois de depois de Enter.',
      rule: {
        type: 'behavior',
        steps: [{ action: 'press', key: 'Enter' }],
        checkpoints: [
          {
            afterStep: 0,
            expect: {
              target: { kind: 'text' },
              compare: 'contains',
              value: 'PATRULHA ESPACIAL | Abra uma rota entre os asteroides',
            },
          },
          {
            afterStep: 0,
            expect: {
              target: { kind: 'text' },
              compare: 'contains',
              value: 'ENTER: começar | SETAS: mover | ESPAÇO: um tiro por aperto',
            },
          },
          {
            afterStep: 1,
            expect: {
              target: { kind: 'text' },
              compare: 'contains',
              value: 'Abra a rota: acerte 20 asteroides e proteja sua nave',
            },
          },
        ],
        expect: {
          target: { kind: 'text' },
          compare: 'contains',
          value: 'SETAS: mover | ESPAÇO: atirar | Asteroide que passa não tira vida',
        },
      },
    })

  return objetivos
}
