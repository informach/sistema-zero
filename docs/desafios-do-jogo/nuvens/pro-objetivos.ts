import type { PublicoDoDesafio } from '../../../packages/arquipelago-contracts/src/desafios'
import type { FunctionCase } from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { NUVENS_PRO } from './pro-projetos'

const MODULO = 'src/regras.ts'
type Celula = 'flor' | 'arvore' | null
const jardim = (grade: Celula[][], moedas: number) => ({
  linhas: grade.length,
  colunas: grade[0]?.length ?? 0,
  grade,
  moedas,
})
const vazio = (moedas: number) =>
  jardim(
    [
      [null, null, null],
      [null, null, null],
    ],
    moedas,
  )
const _ocupado = jardim(
  [
    [null, 'flor', null],
    [null, null, null],
  ],
  10,
)
const plantado = jardim(
  [
    ['flor', null, 'arvore'],
    [null, 'flor', null],
  ],
  0,
)

const juntas = jardim(
  [
    ['flor', 'flor', null],
    [null, null, null],
  ],
  0,
)

const rotulos: Record<PublicoDoDesafio, Record<string, [string, string]>> = {
  kids: {
    vizinhas: [
      'vizinhas conta as plantas nas quatro células em volta, só dentro da grade.',
      'Olhe em cima, embaixo, à esquerda e à direita. Confira se cada uma está dentro da grade antes de olhar.',
    ],
    producao: [
      'colher soma a produção de cada planta, e a planta com vizinha rende 1 a mais.',
      'Percorra a grade e, para cada planta, use vizinhas para saber se ela tem companhia.',
    ],
    expandir: [
      'expandir acrescenta uma coluna vazia por 4 moedas; sem moedas, nada muda.',
      'Crie uma grade nova com uma célula vazia no fim de cada fileira.',
    ],
    tela: [
      'Na tela, a tecla E aumenta o jardim em uma coluna.',
      'O main.ts já chama expandir na tecla E. Ele depende das suas regras.',
    ],
    'por-tipo': [
      'Extra: plantasPorTipo conta quantas flores e quantas árvores o jardim tem.',
      'Comece com zero de cada e some ao passar por cada planta.',
    ],
  },
  adulto: {
    vizinhas: [
      'vizinhas(jardim, linha, coluna) conta plantas nas 4 vizinhas ortogonais dentro da grade.',
      'Valide limites antes de indexar.',
    ],
    producao: [
      'colher soma PRODUCAO por planta mais 1 para cada planta com vizinha.',
      'Reaproveite vizinhas no laço da grade.',
    ],
    expandir: [
      'expandir adiciona uma coluna vazia por CUSTO_DA_COLUNA, só com saldo, sem mutar o jardim.',
      'Retorne um novo objeto com uma cópia estendida da grade.',
    ],
    tela: [
      'A apresentação usa o modelo: a tecla E expande o jardim.',
      'main.ts já liga a tecla E a expandir().',
    ],
    'por-tipo': [
      'Extra: plantasPorTipo retorna a contagem por tipo de planta.',
      'Um objeto com flor e arvore, começando em zero.',
    ],
  },
}

const funcao = (name: string, cases: FunctionCase[]) =>
  ({ type: 'functionReturns', name, module: MODULO, cases }) as const

export function objetivosDasNuvensPro(publico: PublicoDoDesafio): SectionJavaScriptProjectCheck[] {
  const objetivo = (
    id: string,
    rule: SectionJavaScriptProjectCheck['rule'],
    optional = false,
  ): SectionJavaScriptProjectCheck => {
    const [label, hint] = rotulos[publico][id]!
    return {
      id,
      label,
      hint,
      ...(optional ? { optional: true as const } : {}),
      programmingLanguage: 'javascript',
      rule,
    }
  }
  return [
    objetivo(
      'vizinhas',
      funcao('vizinhas', [
        { args: [plantado, 0, 1], expected: 3 },
        { args: [plantado, 1, 2], expected: 2 },
        { args: [plantado, 1, 0], expected: 2 },
        { args: [plantado, 0, 0], expected: 0 },
      ]),
    ),
    objetivo(
      'producao',
      funcao('colher', [
        { args: [plantado], expected: { ...plantado, moedas: 4 } },
        { args: [juntas], expected: { ...juntas, moedas: 4 } },
      ]),
    ),
    objetivo(
      'expandir',
      funcao('expandir', [
        {
          args: [vazio(10)],
          expected: jardim(
            [
              [null, null, null, null],
              [null, null, null, null],
            ],
            6,
          ),
        },
        { args: [vazio(2)], expected: vazio(2) },
      ]),
    ),
    objetivo('tela', {
      type: 'behavior',
      steps: [
        { action: 'wait', ms: 300 },
        { action: 'press', key: 'e', holdMs: 30 },
      ],
      expect: {
        target: { kind: 'moduleValue', module: 'src/main.ts', path: 'jogo.jardim.colunas' },
        compare: 'equals',
        value: NUVENS_PRO.colunas + 1,
      },
    }),
    objetivo(
      'por-tipo',
      funcao('plantasPorTipo', [{ args: [plantado], expected: { flor: 2, arvore: 1 } }]),
      true,
    ),
  ]
}
