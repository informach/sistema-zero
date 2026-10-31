import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type {
  ProjectBlockPattern,
  SectionJavaScriptProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { EXTRA, PISTA, type Variacao } from './projetos'

/** Qualquer tecla começa a corrida (o evento é "qualquer tecla ou toque"). */
export const largada: ExecutionStep = { action: 'press', key: 'Enter', holdMs: 30 }
const pulo: ExecutionStep = { action: 'press', key: 'Space', holdMs: 30 }
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const val = (
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number,
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
/** `afterStep` conta os passos a partir de 1; o 0 é antes do primeiro. */
const point = (
  afterStep: number,
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number,
) => ({ afterStep, expect: val(path, compare, value) })
type Points = Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints']
const behavior = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints?: Points,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  rule: { type: 'behavior', steps, expect, ...(checkpoints ? { checkpoints } : {}) },
})
const estrutura = (
  id: string,
  label: string,
  rule: ProjectBlockPattern & { count?: number },
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true as const } : {}),
  rule: { type: 'usesBlock', ...rule } as SectionJavaScriptProjectCheck['rule'],
})
const numero = (min: number, max: number) => ({
  blockType: 'sz_val_number',
  fieldRanges: { NUM: { min, max } },
})
const jogando = { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'jogando' } }

/**
 * Sem pular, a primeira pedra alcança o entregador uns 2,5 s depois da largada (ela nasce a cada
 * 1,4 s e anda de 5 a 9 pontos por quadro). Correndo sem tombo, em 7,5 s seriam 7 metros.
 */
const tombo: ExecutionStep[] = [largada, wait(7500)]
const METROS_COM_TOMBO = 5

const EXTRAS: Record<(typeof EXTRA)[Variacao], SectionJavaScriptProjectCheck> = {
  somDoPulo: estrutura(
    'som-do-pulo',
    'Extra: um som toca a cada pulo do entregador.',
    {
      blockType: 'sz_g2d_on_jump',
      area: 'events',
      fields: { SPRITE: 'entregador' },
      inputBlocks: { BODY: { blockType: 'sz_g2d_play_fx' } },
    },
    true,
  ),
  efeitos: estrutura(
    'efeitos-da-batida',
    'Extra: na batida, a pedra explode e a tela treme antes do fim.',
    {
      blockType: 'sz_g2d_explode',
      area: 'loops',
      withinBlock: 'sz_g2d_on_sprite_group_overlap',
      fields: { SPRITE: 'pedra' },
      beforeBlock: 'sz_g2d_shake',
    },
    true,
  ),
  telaComMetros: estrutura(
    'metros-no-fim',
    'Extra: a tela de fim mostra quantos metros o entregador correu.',
    {
      blockType: 'sz_js_if_else',
      area: 'loops',
      withinBlock: 'sz_g2d_update_each_frame',
      inputBlocks: {
        ELSEIF_COND1: { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'fim' } },
        ELSEIF_THEN1: {
          blockType: 'sz_g2d_draw_score',
          inputBlocks: {
            VALUE: { blockType: 'sz_val_variable', fields: { NAME: 'metros' } },
          },
        },
      },
    },
    true,
  ),
}

const principais: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  pulo: [
    behavior(
      'cair',
      'Depois da largada, o entregador cai até o chão da rua.',
      [largada, wait(900)],
      val('entregador.y', 'atLeast', PISTA.chao - 3),
    ),
    behavior(
      'pular',
      'No chão, Espaço faz o entregador subir.',
      [largada, wait(500), pulo, wait(200)],
      val('entregador.y', 'lessThan', PISTA.chao - 30),
      [point(2, 'entregador.y', 'atLeast', PISTA.chao - 3)],
    ),
    estrutura('gravidade-antes', 'A cada quadro, a gravidade age antes do controle do pulo.', {
      blockType: 'sz_g2d_apply_gravity',
      area: 'loops',
      withinBlock: 'sz_g2d_update_each_frame',
      fields: { SPRITE: 'entregador' },
      beforeBlock: 'sz_g2d_control_dino',
    }),
  ],
  pedras: [
    behavior(
      'pedras-entram',
      'Depois da largada, pedras entram na rua de tempos em tempos.',
      [largada, wait(3000)],
      val('pedras.items.length', 'atLeast', 1),
    ),
    behavior(
      'pedra-alcanca',
      'Sem pular, uma pedra alcança o entregador e a corrida acaba.',
      tombo,
      val('metros', 'atMost', METROS_COM_TOMBO),
    ),
    estrutura('pedra-no-relogio', 'As pedras nascem no relógio da corrida, só durante a corrida.', {
      blockType: 'sz_g2d_every_seconds',
      area: 'loops',
      inputBlocks: {
        BODY: {
          blockType: 'sz_js_if_else',
          inputBlocks: {
            COND: jogando,
            THEN: {
              blockType: 'sz_g2d_spawn_obstacle',
              fields: { GROUP: 'pedras' },
            },
          },
        },
      },
    }),
  ],
  partida: [
    behavior(
      'comecar',
      'A corrida espera na tela de abertura e começa com uma tecla.',
      [wait(1500), largada, wait(2200)],
      val('metros', 'atLeast', 1),
      [point(1, 'metros', 'equals', 0)],
    ),
    behavior(
      'recomecar',
      'Depois do tombo, uma tecla traz a corrida de volta à abertura, com os metros em zero.',
      [...tombo, largada, wait(400)],
      val('metros', 'equals', 0),
      [point(2, 'metros', 'atLeast', 1)],
    ),
    estrutura('um-evento', 'A abertura começa a corrida, e o fim a recomeça, no mesmo evento.', {
      blockType: 'sz_g2d_on_any_input',
      area: 'events',
      inputBlocks: {
        BODY: {
          blockType: 'sz_js_if_else',
          inputBlocks: {
            COND: { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'inicio' } },
            THEN: { blockType: 'sz_g2d_set_scene', fields: { SCENE: 'jogando' } },
            ELSEIF_COND0: { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'fim' } },
            ELSEIF_THEN0: { blockType: 'sz_g2d_restart' },
          },
        },
      },
    }),
  ],
  batida: [
    behavior(
      'batida',
      'Encostar numa pedra encerra a corrida.',
      tombo,
      val('metros', 'atMost', METROS_COM_TOMBO),
    ),
    estrutura('fim-na-batida', 'A batida com uma pedra leva a corrida à tela de fim.', {
      blockType: 'sz_g2d_on_sprite_group_overlap',
      area: 'loops',
      fields: { SPRITE: 'entregador', GROUP: 'pedras' },
      inputBlocks: { BODY: { blockType: 'sz_g2d_set_scene', fields: { SCENE: 'fim' } } },
    }),
    estrutura('area-justa', 'A área da batida do entregador fica entre 50% e 95% do desenho.', {
      blockType: 'sz_g2d_set_hitbox_scale',
      area: 'start',
      fields: { SPRITE: 'entregador' },
      inputBlocks: { PERCENT: numero(50, 95) },
    }),
  ],
  sorteio: [
    estrutura('lugar-sorteado', 'Cada pedra entra num lugar sorteado, sempre à direita da tela.', {
      blockType: 'sz_g2d_spawn_obstacle',
      area: 'loops',
      withinBlock: 'sz_g2d_every_seconds',
      fields: { GROUP: 'pedras' },
      inputBlocks: {
        X: {
          blockType: 'sz_g2d_random_between',
          inputBlocks: { MIN: numero(480, 700), MAX: numero(480, 700) },
        },
      },
    }),
    estrutura(
      'tamanho-sorteado',
      'Cada pedra tem um tamanho sorteado entre 20 e 50, que o entregador consegue pular.',
      {
        blockType: 'sz_g2d_spawn_obstacle',
        area: 'loops',
        withinBlock: 'sz_g2d_every_seconds',
        fields: { GROUP: 'pedras' },
        inputBlocks: {
          SIZE: {
            blockType: 'sz_g2d_random_between',
            inputBlocks: { MIN: numero(20, 50), MAX: numero(20, 50) },
          },
        },
      },
    ),
  ],
  corrida: [
    behavior(
      'acelera',
      'Cada pedra nova deixa a próxima um pouco mais rápida.',
      [largada, wait(2600)],
      val('velocidade', 'atMost', PISTA.velocidade - 1),
    ),
    estrutura(
      'com-limite',
      'A velocidade só aumenta enquanto não passa do limite, entre -14 e -7.',
      {
        blockType: 'sz_g2d_every_seconds',
        area: 'loops',
        inputBlocks: {
          BODY: {
            blockType: 'sz_js_if_else',
            inputBlocks: {
              COND: jogando,
              THEN: {
                blockType: 'sz_js_if_else',
                inputBlocks: {
                  COND: {
                    blockType: 'sz_val_compare',
                    fields: { OP: '>' },
                    inputBlocks: {
                      LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'velocidade' } },
                      RIGHT: numero(-14, -7),
                    },
                  },
                  THEN: {
                    blockType: 'sz_js_var_increment',
                    fields: { NAME: 'velocidade', DELTA: -1 },
                  },
                },
              },
            },
          },
        },
      },
    ),
    estrutura('um-acelerador', 'Um único bloco muda a velocidade no projeto inteiro.', {
      blockType: 'sz_js_var_increment',
      fields: { NAME: 'velocidade' },
      count: 1,
    }),
  ],
  'pulo-alto': [
    behavior(
      'pulo-alto',
      'Com o pulo novo, o entregador sobe mais alto que as pedras grandes.',
      [largada, wait(500), pulo, wait(200)],
      val('entregador.y', 'lessThan', PISTA.chao - 81),
      [point(2, 'entregador.y', 'atLeast', PISTA.chao - 3)],
    ),
    estrutura('forca', 'A força do pulo fica entre 12 e 16.', {
      blockType: 'sz_g2d_control_dino',
      area: 'loops',
      fields: { SPRITE: 'entregador' },
      inputBlocks: { JUMP: numero(12, 16) },
    }),
  ],
  pombos: [
    estrutura('pombos', 'A rua sorteia o que aparece: pedras, vasos e pombos voando baixo.', {
      blockType: 'sz_g2d_spawn_obstacle',
      area: 'loops',
      withinBlock: 'sz_g2d_every_seconds',
      fields: { GROUP: 'pedras' },
      fieldOptions: { SHAPE: ['random'] },
    }),
  ],
  descricao: [
    estrutura('descricao', 'A descrição da corrida diz o objetivo e os três jeitos de pular.', {
      blockType: 'sz_g2d_set_stage_description',
      area: 'start',
      fieldText: {
        DESCRIPTION: {
          nonBlank: true,
          containsAll: [
            ['pular', 'pule', 'pulo', 'saltar', 'salte', 'salto', 'desvie', 'desviar'],
            ['pedra', 'pedras', 'obstáculo', 'obstáculos'],
            ['espaço', 'space'],
            ['cima', 'seta para cima', 'arrowup'],
            ['toque', 'tocar', 'tocando'],
          ],
        },
      },
    }),
  ],
}

export const objetivos = Object.fromEntries(
  (Object.keys(principais) as Variacao[]).map((v) => [v, [...principais[v], EXTRAS[EXTRA[v]]]]),
) as Record<Variacao, SectionJavaScriptProjectCheck[]>
