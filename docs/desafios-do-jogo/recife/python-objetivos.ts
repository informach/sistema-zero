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
    plantar: [
      'Clicar na bolha planta a muda no coral de onde ela subiu.',
      'Confira coral: 1, 2 ou 3 diz qual conta de mudas ganha um.',
    ],
    'coral-certo': [
      'Cada coral conta as próprias mudas: a muda do coral 1 não vai para o coral 2.',
      'Use if, elif e elif, um para cada coral.',
    ],
    estoura: [
      'A bolha que ninguém clica em 2 segundos estoura e conta como perdida.',
      'Em update(dt), tire dt de vida; quando vida chegar a zero, some uma em perdidas.',
    ],
    fim: [
      'Com três bolhas perdidas, a maré vira e a rodada acaba.',
      'Quando perdidas chegar a 3, mude jogando para False em vez de sortear outra bolha.',
    ],
    recomecar: [
      'Extra: R recomeça a rodada, sem perdidas e com a bolha de volta na areia.',
      'Em on_key_down, confira key == keys.R e volte os valores do começo.',
    ],
  },
  adulto: {
    plantar: [
      'on_mouse_down planta a muda no coral de onde a bolha subiu.',
      'O estado coral (1 a 3) escolhe qual contador incrementar.',
    ],
    'coral-certo': [
      'Cada coral mantém o próprio contador de mudas.',
      'Uma cadeia if/elif por coral; nada de contar tudo num só.',
    ],
    estoura: [
      'update(dt) desconta a vida da bolha; ao zerar, conta uma perdida.',
      'Use o dt recebido por update e a constante VIDA.',
    ],
    fim: [
      'Na terceira perdida, a rodada termina (jogando = False).',
      'Termine a rodada no lugar de sortear a próxima bolha.',
    ],
    recomecar: [
      'Extra: R reinicia a rodada (contadores, perdidas, coral 0 e bolha em (280, 360)).',
      'on_key_down recebe key; compare com keys.R.',
    ],
  },
}

/**
 * Os objetivos rodam o programa no executor Python (clique, espera e tecla). Com a semente 7, a
 * bolha da areia leva ao coral 2, e a muda plantada nele leva ao coral 1.
 */
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
  const [coral1, coral2] = CLIQUES.corais as unknown as [
    readonly [number, number],
    readonly [number, number],
  ]
  return [
    objetivo('plantar', [clicar(CLIQUES.inicio), clicar(coral2)], {
      target: valor('mudas2'),
      compare: 'equals',
      value: 1,
    }),
    objetivo('coral-certo', [clicar(CLIQUES.inicio), clicar(coral2), clicar(coral1)], {
      target: valor('mudas1'),
      compare: 'equals',
      value: 1,
    }),
    objetivo('estoura', [clicar(CLIQUES.inicio), esperar(2600)], {
      target: valor('perdidas'),
      compare: 'equals',
      value: 1,
    }),
    objetivo('fim', [clicar(CLIQUES.inicio), esperar(7000)], {
      target: valor('jogando'),
      compare: 'equals',
      value: false,
    }),
    // Depois da maré virar, R e um clique na areia: a bolha sobe de novo, agora do coral 3 (a
    // próxima da semente). Sem recomeçar, a bolha fica no coral e o clique na areia erra.
    objetivo(
      'recomecar',
      [
        clicar(CLIQUES.inicio),
        esperar(7000),
        { action: 'press', key: 'r', holdMs: 80 },
        clicar(CLIQUES.inicio),
      ],
      { target: valor('coral'), compare: 'equals', value: 3 },
      true,
    ),
  ]
}
