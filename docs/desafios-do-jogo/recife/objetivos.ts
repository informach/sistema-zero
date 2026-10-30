import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { Variacao } from './projetos'

/** Espaço solta a bolha (no toque, A), uma tecla da trilha (C01b). */
export const disparar: ExecutionStep = { action: 'press', key: 'Space', holdMs: 30 }
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const press = (key: 'ArrowRight' | 'ArrowLeft' | 'Enter', holdMs: number): ExecutionStep => ({
  action: 'press',
  key,
  holdMs,
})
const val = (
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean,
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const point = (
  afterStep: number,
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean,
) => ({ afterStep, expect: val(path, compare, value) })
type Points = Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints']
const behavior = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints: Points = [],
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true as const } : {}),
  rule: { type: 'behavior', steps, expect, checkpoints },
})
export const mirarNoAlvo: ExecutionStep = press('ArrowRight', 1900)
export const capturar: ExecutionStep[] = [mirarNoAlvo, disparar, wait(900)]
const extra = (pontos: number, novo = false) => {
  const steps: ExecutionStep[] = [
    ...capturar,
    ...(novo ? [press('ArrowLeft', 1300), disparar, wait(900)] : []),
    press('Enter', 30),
  ]
  const fim = steps.length
  return behavior(
    'recomecar-enter',
    'Extra: Enter recomeça a rodada, devolve a mira ao início e limpa as capturas e os pontos.',
    steps,
    val('pontos', 'equals', 0),
    [
      ...(novo
        ? [point(6, 'novoPreso', 'equals', true), point(6, 'pontos', 'equals', 2)]
        : [point(3, 'pontos', 'equals', pontos)]),
      point(fim, 'mira.x', 'equals', 72),
      point(fim, 'preso', 'equals', false),
      point(fim, 'novoPreso', 'equals', false),
      point(fim, 'emVoo', 'equals', false),
      point(fim, 'bolha.vy', 'equals', 0),
      point(fim, 'bolhaVisivel', 'equals', false),
    ],
    true,
  )
}

export const objetivos: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  mira: [
    behavior(
      'mirar',
      'As setas movem a mira para os dois lados, sem sair da tela nem subir.',
      [press('ArrowRight', 500), press('ArrowLeft', 1200)],
      val('mira.x', 'equals', 0),
      [
        point(1, 'mira.x', 'greaterThan', 100),
        point(1, 'mira.y', 'equals', 360),
        point(2, 'mira.y', 'equals', 360),
      ],
    ),
    behavior(
      'soltar',
      'Espaço lança a bolha da posição da mira para cima, sem lançar outra enquanto ela sobe.',
      [press('ArrowRight', 650), disparar, wait(150), disparar, wait(100)],
      val('emVoo', 'equals', true),
      [
        point(3, 'bolha.x', 'greaterThan', 150),
        point(3, 'bolha.y', 'lessThan', 320),
        // Do primeiro Espaço ao passo 5 passam uns 310 ms: a 5 px por passo (60 por segundo)
        // a bolha está perto de y 247. Uma bolha relançada pelo segundo Espaço fica perto de 300.
        point(5, 'bolha.y', 'lessThan', 270),
        point(5, 'bolha.vy', 'lessThan', 0),
        point(5, 'pontos', 'equals', 0),
      ],
    ),
    behavior(
      'prender',
      'Ao tocar o alvo, a bolha para e o alvo fica preso.',
      capturar,
      val('preso', 'equals', true),
      [
        point(3, 'emVoo', 'equals', false),
        point(3, 'bolha.vy', 'equals', 0),
        point(3, 'bolha.y', 'lessThan', 180),
      ],
    ),
    behavior(
      'contar',
      'Uma bolha que erra não conta pontos; prender o alvo conta uma vez só, mesmo tentando de novo.',
      [disparar, wait(1500), mirarNoAlvo, disparar, wait(900), wait(400), disparar, wait(900)],
      val('pontos', 'equals', 1),
      [
        point(2, 'pontos', 'equals', 0),
        point(5, 'pontos', 'equals', 1),
        point(6, 'pontos', 'equals', 1),
      ],
    ),
    extra(1),
  ],
  rapida: [
    behavior(
      'bolha-rapida',
      'A bolha sobe mais rápido e continua prendendo o alvo.',
      [disparar, wait(150), wait(1200), ...capturar],
      val('preso', 'equals', true),
      [
        point(2, 'bolha.y', 'lessThan', 310),
        point(2, 'bolha.vy', 'lessThan', -5),
        point(2, 'emVoo', 'equals', true),
        point(6, 'emVoo', 'equals', false),
      ],
    ),
    extra(1),
  ],
  pontos: [
    behavior(
      'dois-pontos',
      'Cada alvo preso vale dois pontos, sem repetir a contagem ao ficar encostado ou acertar o mesmo alvo de novo.',
      [...capturar, wait(400), disparar, wait(900)],
      val('pontos', 'equals', 2),
      [point(3, 'pontos', 'equals', 2), point(4, 'pontos', 'equals', 2)],
    ),
    extra(2),
  ],
  'alvo-novo': [
    behavior(
      'segundo-alvo',
      'O alvo novo também fica preso e vale um ponto, sem prender o outro alvo nem repetir a contagem.',
      [press('ArrowRight', 650), disparar, wait(900), wait(400), disparar, wait(900)],
      val('pontos', 'equals', 1),
      [
        point(3, 'novoPreso', 'equals', true),
        point(3, 'preso', 'equals', false),
        point(3, 'emVoo', 'equals', false),
        point(4, 'pontos', 'equals', 1),
      ],
    ),
    extra(1, true),
  ],
}
