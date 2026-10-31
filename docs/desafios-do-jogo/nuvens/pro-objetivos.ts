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
const ocupado = jardim(
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

const rotulos: Record<PublicoDoDesafio, Record<string, [string, string]>> = {
  kids: {
    ocupacao: [
      'podeConstruir recusa célula fora da grade e célula já ocupada.',
      'Confira primeiro se linha e coluna estão dentro da grade, depois se a célula está vazia.',
    ],
    custo: [
      'construir só planta com moedas suficientes e desconta o custo.',
      'Sem moedas ou com a célula ocupada, devolva o mesmo jardim. Ao plantar, crie uma grade nova.',
    ],
    producao: [
      'colher soma a produção de cada planta às moedas.',
      'Percorra a grade e some PRODUCAO de cada planta encontrada.',
    ],
    guardar: [
      'Guardar e reabrir devolve o mesmo jardim, com a grade e as moedas.',
      'salvar transforma o jardim em texto com JSON.stringify; carregar faz o caminho de volta.',
    ],
    tela: [
      'Na tela, clicar numa célula vazia planta uma flor e gasta 3 moedas.',
      'O main.ts já chama construir no clique. Ele depende das suas regras.',
    ],
    remover: [
      'Extra: remover tira a planta e devolve metade do custo, arredondado para baixo.',
      'Célula vazia continua igual. Use Math.floor para a metade do custo.',
    ],
  },
  adulto: {
    ocupacao: [
      'podeConstruir rejeita coordenadas fora da grade e células ocupadas.',
      'Valide limites antes de indexar a grade.',
    ],
    custo: [
      'construir valida o saldo, desconta o custo e não altera o jardim recebido.',
      'Retorne um novo objeto com uma cópia da grade.',
    ],
    producao: ['colher acrescenta a produção de todas as plantas.', 'Use PRODUCAO por tipo.'],
    guardar: [
      'salvar e carregar fazem a ida e a volta sem perder grade nem saldo.',
      'Serialize os dados necessários para reconstruir o estado.',
    ],
    tela: [
      'A apresentação usa o modelo: o clique numa célula vazia planta e cobra.',
      'main.ts já liga o clique a construir().',
    ],
    remover: [
      'Extra: remover libera a célula e devolve metade do custo (arredondado para baixo).',
      'Célula vazia retorna o jardim sem mudança.',
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
      'ocupacao',
      funcao('podeConstruir', [
        { args: [vazio(10), 0, 1, 'flor'], expected: true },
        { args: [ocupado, 0, 1, 'flor'], expected: false },
        { args: [vazio(10), 2, 0, 'flor'], expected: false },
        { args: [vazio(10), 0, -1, 'flor'], expected: false },
      ]),
    ),
    objetivo(
      'custo',
      funcao('construir', [
        {
          args: [vazio(10), 0, 0, 'arvore'],
          expected: jardim(
            [
              ['arvore', null, null],
              [null, null, null],
            ],
            5,
          ),
        },
        { args: [vazio(2), 0, 0, 'flor'], expected: vazio(2) },
        { args: [ocupado, 0, 1, 'arvore'], expected: ocupado },
      ]),
    ),
    objetivo(
      'producao',
      funcao('colher', [
        {
          args: [plantado],
          expected: { ...plantado, moedas: 4 },
        },
      ]),
    ),
    objetivo(
      'guardar',
      funcao('reabrir', [
        { args: [plantado], expected: plantado },
        { args: [{ ...ocupado, moedas: 7 }], expected: { ...ocupado, moedas: 7 } },
      ]),
    ),
    objetivo('tela', {
      type: 'behavior',
      steps: [
        { action: 'wait', ms: 300 },
        { action: 'click', x: NUVENS_PRO.lado / 2, y: NUVENS_PRO.lado / 2 },
      ],
      expect: {
        target: { kind: 'moduleValue', module: 'src/main.ts', path: 'jogo.jardim.moedas' },
        compare: 'equals',
        value: NUVENS_PRO.moedas - 3,
      },
    }),
    objetivo(
      'remover',
      funcao('remover', [
        {
          args: [plantado, 0, 2],
          expected: jardim(
            [
              ['flor', null, null],
              [null, 'flor', null],
            ],
            2,
          ),
        },
        { args: [plantado, 1, 0], expected: plantado },
      ]),
      true,
    ),
  ]
}
