import type { PublicoDoDesafio } from '../../../packages/arquipelago-contracts/src/desafios'
import type { SectionPythonProjectCheck } from '../../../packages/core/src/learning/python-project-checks'
import { AMBIENTE_PYTHON_C02 } from '../ambiente-python'
import { CLIQUES } from './python-projetos'

type Comportamento = Extract<SectionPythonProjectCheck['rule'], { type: 'behavior' }>
/** Os passos que o executor Python aceita (sem alvo de sprite nem aproximação). */
type Passo = Comportamento['steps'][number]
const clicar = ([x, y]: readonly [number, number]): Passo => ({ action: 'click', x, y })
const esperar = (ms: number): Passo => ({ action: 'wait', ms })
const valor = (path: string) => ({ kind: 'value' as const, path })

const rotulos: Record<PublicoDoDesafio, Record<string, [string, string]>> = {
  kids: {
    acertar: [
      'Clicar na bolha planta a muda de coral e soma uma; clicar na água não soma.',
      'Use bolha.collidepoint(pos) para saber se o clique foi dentro da bolha.',
    ],
    sortear: [
      'Depois de plantar, a bolha seguinte sobe de um dos três corais.',
      'random.randint(1, 3) sorteia o número do coral; cada número muda bolha.topleft.',
    ],
    relogio: [
      'O relógio conta o tempo da rodada.',
      'Em update(dt), tire dt do tempo enquanto a rodada está valendo.',
    ],
    fim: [
      'Quando o tempo acaba, a rodada termina e os cliques não contam mais.',
      'Quando o tempo chegar a zero, mude jogando para False.',
    ],
    recomecar: [
      'Extra: R recomeça a rodada com a bolha de volta na areia.',
      'Em on_key_down, confira key == keys.R e volte os valores do começo.',
    ],
  },
  adulto: {
    acertar: [
      'on_mouse_down conta só os cliques dentro da bolha.',
      'Rect.collidepoint(pos) separa o acerto do clique na água.',
    ],
    sortear: [
      'Após o acerto, sortear_coral move a bolha para um dos três corais.',
      'Sorteie com random.randint(1, 3) e posicione bolha.topleft.',
    ],
    relogio: ['update(dt) desconta o tempo da rodada.', 'Use o dt recebido por update.'],
    fim: [
      'Com o tempo esgotado, a rodada termina e ignora novos cliques.',
      'jogando passa a False quando tempo chega a zero.',
    ],
    recomecar: [
      'Extra: R reinicia a rodada (contagem, tempo e posição da bolha).',
      'on_key_down recebe key; compare com keys.R.',
    ],
  },
}

/** Os objetivos rodam o programa no executor Python (clique, espera e tecla). */
export function objetivosDoRecifePython(publico: PublicoDoDesafio): SectionPythonProjectCheck[] {
  const objetivo = (
    id: string,
    steps: Passo[],
    expect: Comportamento['expect'],
    optional = false,
  ): SectionPythonProjectCheck => {
    const [label, hint] = rotulos[publico][id]!
    return {
      id,
      label,
      hint,
      ...(optional ? { optional: true as const } : {}),
      programmingLanguage: 'python',
      profileId: AMBIENTE_PYTHON_C02.profileId,
      rule: { type: 'behavior', steps, expect },
    }
  }
  return [
    objetivo('acertar', [clicar(CLIQUES.agua), clicar(CLIQUES.inicio)], {
      target: valor('plantadas'),
      compare: 'equals',
      value: 1,
    }),
    objetivo('sortear', [clicar(CLIQUES.inicio)], {
      target: valor('bolha.y'),
      compare: 'atMost',
      value: 120,
    }),
    objetivo('relogio', [esperar(1500)], { target: valor('tempo'), compare: 'decreased' }),
    objetivo('fim', [clicar(CLIQUES.inicio), esperar(9500), ...CLIQUES.corais.map(clicar)], {
      target: valor('plantadas'),
      compare: 'equals',
      value: 1,
    }),
    objetivo(
      'recomecar',
      [
        clicar(CLIQUES.inicio),
        esperar(300),
        { action: 'press', key: 'r', holdMs: 80 },
        clicar(CLIQUES.inicio),
      ],
      { target: valor('plantadas'), compare: 'equals', value: 1 },
      true,
    ),
  ]
}
