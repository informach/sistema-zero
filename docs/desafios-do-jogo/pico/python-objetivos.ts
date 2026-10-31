import type { PublicoDoDesafio } from '../../../packages/arquipelago-contracts/src/desafios'
import type { FunctionCase } from '../../../packages/core/src/learning/project-execution'
import type { SectionPythonProjectCheck } from '../../../packages/core/src/learning/python-project-checks'
import { AMBIENTE_PYTHON_C02 } from '../ambiente-python'
import { FLOCOS_DA_FASE_1 } from './python-projetos'

const rotulos: Record<PublicoDoDesafio, Record<string, [string, string]>> = {
  kids: {
    contar: [
      'contar diz quantas vezes uma letra aparece nos dados da fase.',
      'Um laço pelas linhas e, dentro dele, outro pelas letras de cada linha.',
    ],
    'flocos-da-fase': [
      'O jogo mostra quantos flocos o primeiro trecho tem.',
      'O jogo chama contar(linhas, "*") ao montar cada trecho.',
    ],
    escorregar: [
      'No gelo, o Floco perde velocidade de 1 em 1 até parar; fora do gelo, ele para na hora.',
      'Teste os casos pequenos: indo para a direita, para a esquerda, parado e fora do gelo.',
    ],
    trecho: ['O trecho só termina quando todos os flocos foram pegos.', 'Compare pegos com total.'],
    melhor: [
      'Extra: melhor devolve o menor tempo da lista de tempos dos trechos.',
      'Comece com o primeiro tempo e troque quando achar um menor.',
    ],
  },
  adulto: {
    contar: [
      'contar(linhas, letra) devolve o número de ocorrências da letra.',
      'Dois laços aninhados resolvem.',
    ],
    'flocos-da-fase': [
      'montar usa contar para o total de flocos do trecho.',
      'O primeiro trecho tem o total calculado pelos dados.',
    ],
    escorregar: [
      'escorregar(vx, no_gelo) aplica o atrito do gelo, de 1 em 1, e para fora dele.',
      'Trate vx positivo, negativo, zero e no_gelo falso.',
    ],
    trecho: [
      'trecho_completo exige todos os flocos coletados.',
      'Retorne a comparação entre pegos e total.',
    ],
    melhor: [
      'Extra: melhor(tempos) devolve o menor valor da lista.',
      'Percorra a lista guardando o menor.',
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
      'contar',
      funcao('contar', [
        { args: [['..*..', '*....'], '*'], expected: 2 },
        { args: [['*#*', '#*#'], '#'], expected: 3 },
        { args: [['....'], '*'], expected: 0 },
      ]),
    ),
    objetivo('flocos-da-fase', {
      type: 'behavior',
      steps: [{ action: 'wait', ms: 500 }],
      expect: {
        target: { kind: 'value', path: 'total' },
        compare: 'equals',
        value: FLOCOS_DA_FASE_1,
      },
    }),
    objetivo(
      'escorregar',
      funcao('escorregar', [
        { args: [4, true], expected: 3 },
        { args: [-4, true], expected: -3 },
        { args: [0, true], expected: 0 },
        { args: [4, false], expected: 0 },
      ]),
    ),
    objetivo(
      'trecho',
      funcao('trecho_completo', [
        { args: [3, 3], expected: true },
        { args: [1, 3], expected: false },
        { args: [0, 2], expected: false },
      ]),
    ),
    objetivo(
      'melhor',
      funcao('melhor', [
        { args: [[30, 25, 40]], expected: 25 },
        { args: [[12]], expected: 12 },
      ]),
      true,
    ),
  ]
}
