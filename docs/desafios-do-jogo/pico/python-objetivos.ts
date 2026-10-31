import type { PublicoDoDesafio } from '../../../packages/arquipelago-contracts/src/desafios'
import type { FunctionCase } from '../../../packages/core/src/learning/project-execution'
import type { SectionPythonProjectCheck } from '../../../packages/core/src/learning/python-project-checks'
import { AMBIENTE_PYTHON_C02 } from '../ambiente-python'
import { PLATAFORMAS_DA_FASE_1 } from './python-projetos'

const rotulos: Record<PublicoDoDesafio, Record<string, [string, string]>> = {
  kids: {
    ler: [
      'ler_fase devolve a coluna e a linha de cada letra procurada.',
      'Percorra as linhas e, dentro de cada linha, as colunas. Guarde [coluna, linha] numa lista.',
    ],
    pousar: [
      'pousar faz o herói parar em cima da plataforma só quando ele cai e cruza o topo.',
      'Teste os casos pequenos: caindo e cruzando, caindo sem chegar, já abaixo do topo e subindo.',
    ],
    proxima: [
      'A saída leva para a próxima fase só com o cristal na mochila.',
      'Os dois precisam ser verdade ao mesmo tempo: tem_cristal e na_saida.',
    ],
    montada: [
      'A fase 1 é montada com todas as plataformas que os dados descrevem.',
      'O jogo chama ler_fase(linhas, "#") para criar uma plataforma em cada célula.',
    ],
    terceira: [
      'Extra: acrescente uma terceira fase à lista FASES.',
      'Uma fase nova é só mais uma lista de linhas, com J, C, S e plataformas que levem à saída.',
    ],
  },
  adulto: {
    ler: [
      'ler_fase(linhas, letra) devolve [coluna, linha] de cada ocorrência, em ordem de leitura.',
      'Dois laços com enumerate resolvem.',
    ],
    pousar: [
      'pousar resolve a colisão vertical: pousa só ao cair cruzando o topo.',
      'Considere pe_antes, pe_depois e o sinal de vy.',
    ],
    proxima: [
      'proxima_fase avança só com o cristal coletado e na saída.',
      'Retorne numero + 1 apenas com as duas condições.',
    ],
    montada: [
      'A fase 1 é construída a partir dos dados (todas as plataformas).',
      'montar() cria um Rect por célula "#" retornada por ler_fase.',
    ],
    terceira: [
      'Extra: inclua uma terceira fase em FASES.',
      'A fase é só dado: uma lista de strings.',
    ],
  },
}

const funcao = (name: string, cases: FunctionCase[]) =>
  ({ type: 'functionReturns', name, cases }) as const

export function objetivosDoPicoPython(publico: PublicoDoDesafio): SectionPythonProjectCheck[] {
  const objetivo = (
    id: string,
    rule: SectionPythonProjectCheck['rule'],
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
      rule,
    }
  }
  return [
    objetivo(
      'ler',
      funcao('ler_fase', [
        {
          args: [['##.', '..#'], '#'],
          expected: [
            [0, 0],
            [1, 0],
            [2, 1],
          ],
        },
        {
          args: [['..C', 'C..'], 'C'],
          expected: [
            [2, 0],
            [0, 1],
          ],
        },
        { args: [['....'], '#'], expected: [] },
      ]),
    ),
    objetivo(
      'pousar',
      funcao('pousar', [
        { args: [100, 112, 5, 110], expected: [110, 0] },
        { args: [100, 105, 5, 110], expected: [105, 5] },
        { args: [115, 120, 5, 110], expected: [120, 5] },
        { args: [112, 108, -4, 110], expected: [108, -4] },
      ]),
    ),
    objetivo(
      'proxima',
      funcao('proxima_fase', [
        { args: [0, true, true], expected: 1 },
        { args: [0, false, true], expected: 0 },
        { args: [1, true, false], expected: 1 },
      ]),
    ),
    objetivo('montada', {
      type: 'behavior',
      steps: [{ action: 'wait', ms: 500 }],
      expect: {
        target: { kind: 'value', path: 'total_de_plataformas' },
        compare: 'equals',
        value: PLATAFORMAS_DA_FASE_1,
      },
    }),
    objetivo(
      'terceira',
      {
        type: 'behavior',
        steps: [{ action: 'wait', ms: 300 }],
        expect: { target: { kind: 'value', path: 'total_de_fases' }, compare: 'atLeast', value: 3 },
      },
      true,
    ),
  ]
}
