import type {
  ExecutionExpectation,
  ExecutionStep,
  SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { Variacao } from './projetos'

export const clicar = (path: string, groupPath = 'ninhos'): ExecutionStep => ({
  action: 'clickTarget',
  target: { kind: 'sprite', path, groupPath },
})
export const onda = clicar('proxima', 'botoesOnda')
const wait = (ms = 1200): ExecutionStep => ({ action: 'wait', ms })
const val = (path: string, value: number | boolean): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
const cp = (afterStep: number, path: string, value: number | boolean) => ({
  afterStep,
  expect: val(path, value),
})
type Points = Extract<SectionExecutionRule, { type: 'behavior' }>['checkpoints']
const regra = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  path: string,
  value: number | boolean,
  checkpoints: Points = [],
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true as const } : {}),
  rule: { type: 'behavior', steps, expect: val(path, value), checkpoints },
})
const extra = regra(
  'enter',
  'Extra: Enter limpa as ondas e as contagens, como Recomeçar.',
  [onda, wait(), { action: 'press', key: 'Enter', holdMs: 30 }],
  'onda',
  0,
  [
    cp(2, 'onda', 1),
    cp(3, 'comCinza', 0),
    cp(3, 'protegidos', 0),
    cp(3, 'pontos', 0),
    cp(3, 'emOnda', false),
    cp(3, 'terminou', false),
  ],
  true,
)
export const objetivos: Record<Variacao, SectionJavaScriptProjectCheck[]> = {
  ninhos: [
    regra(
      'cobrir',
      'Tocar num ninho põe a cobertura só nele, sem somar pontos antes da onda.',
      [clicar('ninho1'), clicar('ninho1')],
      'ninho1.data.protegido',
      true,
      [cp(2, 'ninho2.data.protegido', false), cp(2, 'pontos', 0)],
    ),
    regra(
      'ondas',
      'Próxima onda começa uma passagem da cinza. Tocar de novo durante a passagem não começa outra.',
      [onda, onda, wait()],
      'onda',
      1,
      [cp(1, 'emOnda', true), cp(3, 'emOnda', false)],
    ),
    regra(
      'lista',
      'Cada onda conta todos os ninhos da lista uma vez, separando os protegidos dos que recebem cinza.',
      [clicar('ninho1'), clicar('ninho1'), onda, wait(), wait(300), onda, wait()],
      'comCinza',
      5,
      [
        cp(4, 'protegidos', 1),
        cp(4, 'comCinza', 2),
        cp(4, 'pontos', 1),
        cp(5, 'comCinza', 2),
        cp(7, 'protegidos', 1),
        cp(7, 'pontos', 1),
        cp(7, 'onda', 2),
      ],
    ),
    extra,
  ],
  ondas: [
    regra(
      'quatro-ondas',
      'A rodada permite quatro ondas e não começa uma quinta.',
      [onda, wait(), onda, wait(), onda, wait(), onda, wait(), onda, wait(100)],
      'onda',
      4,
      [
        cp(6, 'terminou', false),
        cp(8, 'terminou', true),
        cp(8, 'comCinza', 12),
        cp(10, 'emOnda', false),
      ],
    ),
    extra,
  ],
  pontos: [
    regra(
      'dois-pontos',
      'Cada proteção vale dois pontos. Ninho sem cobertura não soma pontos e a contagem não se repete.',
      [clicar('ninho1'), onda, wait(), wait(300), onda, wait()],
      'pontos',
      2,
      [
        cp(3, 'pontos', 2),
        cp(3, 'protegidos', 1),
        cp(3, 'comCinza', 2),
        cp(6, 'protegidos', 1),
        cp(6, 'comCinza', 5),
      ],
    ),
    extra,
  ],
  lista: [
    regra(
      'quarto-ninho',
      'A onda passa pelos quatro ninhos da lista, incluindo o novo, sem contar nenhum duas vezes.',
      [onda, wait(), wait(300), onda, wait()],
      'comCinza',
      8,
      [cp(2, 'comCinza', 4), cp(3, 'comCinza', 4), cp(5, 'protegidos', 0), cp(5, 'onda', 2)],
    ),
    extra,
  ],
}
