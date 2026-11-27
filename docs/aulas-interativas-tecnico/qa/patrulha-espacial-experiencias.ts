import { readFileSync } from 'node:fs'
import type { ConstrutorTrecho } from './construtor-base-tipos'
import { telaDaExperiencia } from './faisca-comum'
import { type FalaPatrulha, montarFalaPatrulha } from './patrulha-espacial-editorial'

/** São as bancadas reais da Ilha, retomadas explicitamente; não existe uma cena Patrulha. */
export function experienciaEixosPatrulha(): ConstrutorTrecho {
  const falas: FalaPatrulha[] = [
    [
      'conversa',
      'Na nave em duas dimensões, você usou os lugares da tela para mover e disparar. Agora nossa rota tem profundidade. Pense numa caixa: uma peça pode ficar mais para um lado, mais para o fundo ou mais alta.',
    ],
    [
      'descoberta',
      'Na Ilha do Farol, você já encontrou esse espaço em três dimensões. Vamos voltar à ilha por um instante e investigar uma coisa de cada vez: qual número muda o lado, qual muda a altura e qual muda a profundidade?',
    ],
    ['pergunta', 'Se eu mudar a altura da nave, o tiro ainda vai encontrar o asteroide?'],
    [
      'conversa',
      'Depende de onde o tiro e o asteroide estiverem. Na nossa patrulha, eles vão viajar na mesma altura. Primeiro, vamos descobrir como reconhecer cada direção. Isso você vai testar na experiência.',
    ],
    [
      'teste',
      'O Zappy vai te mostrando o que investigar na ilha. Você pode repetir e comparar o que acontece. Depois, vamos usar essa descoberta para escolher o lugar do laser na patrulha. Quando terminar, clique em Próxima parte.',
    ],
  ]
  return {
    key: 'tres-direcoes',
    title: 'Investigue as três direções',
    kind: 'experience',
    objective:
      'Relacionar x, y e z ao lado, à altura e à profundidade antes de posicionar o laser.',
    ponte:
      'Volte à Ilha para investigar as três direções. O Zappy te mostra o que testar; depois você vai levar essa descoberta para o laser da Patrulha. Quando terminar, clique em Próxima parte.',
    text: montarFalaPatrulha(falas),
    screen: `Na edição, mostrar uma caixa simples e três deslocamentos separados, sem números, botões nem resolução das descobertas. ${telaDaExperiencia('com a chave e o personagem da Ilha do Farol; não trocar a cena por uma nave')}`,
    kids: ['Se eu mudar a altura da nave, o tiro ainda vai encontrar o asteroide?'],
    experience: {
      kind: 'interactive',
      title: 'Três direções na Ilha',
      required: true,
      instructions:
        'Investigue uma direção de cada vez. Mude os lugares, observe a chave e compare o que acontece. Depois, leve a descoberta para a Patrulha Espacial.',
      hints: [
        'Observe o caminho da chave quando você muda apenas um número.',
        'Compare a mesma direção para um lado e para o lado contrário.',
        'Investigue x, y e z separadamente, aumentando e diminuindo cada um.',
      ],
      semPerguntaFinal: true,
      activity: {
        type: 'experimentation',
        scene: 'island-3d',
        setup: {
          goals: ['axis-x', 'axis-y', 'axis-z'],
          freeExploration: true,
          goalCopy: {
            'axis-x': {
              pedido: 'Investigue o x para os dois lados. O que muda no lugar da chave?',
            },
            'axis-y': {
              pedido: 'Investigue o y para os dois lados. O que muda no lugar da chave?',
            },
            'axis-z': {
              pedido: 'Investigue o z para os dois lados. O que muda no lugar da chave?',
            },
          },
        },
      },
    },
    steps: [
      'Investigue as três direções na Ilha com o Zappy.',
      'Compare cada mudança separadamente e pense em qual direção o laser da Patrulha vai viajar.',
    ],
    tests: [],
    blockLabels: [],
    blockTypes: [],
  }
}

export function experienciaContatoPatrulha(): ConstrutorTrecho {
  const falas: FalaPatrulha[] = [
    [
      'conversa',
      'Imagine olhar uma ponte de cima. Um carrinho na ponte pode parecer em cima de outro carrinho que está na rua lá embaixo. Mas existe um espaço entre eles. Eles não bateram.',
    ],
    [
      'descoberta',
      'No jogo em três dimensões, uma imagem também pode dar essa impressão. Para acertar um asteroide, o laser precisa encontrar o asteroide no espaço. Parecer que os desenhos se cruzaram na tela não basta.',
    ],
    ['pergunta', 'Então duas coisas podem parecer juntas e ainda estar separadas?'],
    [
      'conversa',
      'Podem! Vamos voltar à Ilha do Farol e observar a chave e o personagem de outro lugar. Isso você vai testar na experiência.',
    ],
    [
      'teste',
      'O Zappy vai te mostrando o que investigar. Compare a separação e o encontro de verdade. Depois, você vai usar essa diferença para programar o acerto do laser na patrulha. Quando terminar, clique em Próxima parte.',
    ],
  ]
  return {
    key: 'encontro-no-espaco',
    title: 'Parecer junto ou encostar?',
    kind: 'experience',
    objective: 'Distinguir sobreposição da imagem e contato real entre objetos em três dimensões.',
    ponte:
      'Observe o encontro da chave com o personagem na Ilha. Descubra quando eles só parecem juntos e quando realmente encostam. Depois você vai levar essa ideia para o laser e o asteroide.',
    text: montarFalaPatrulha(falas),
    screen: `Na edição, ilustrar os dois carrinhos em alturas diferentes, sem mostrar a solução da experiência. ${telaDaExperiencia('com a chave e o personagem da Ilha; a fala de Zappy continua sendo a investigação original do encontro da chave')}`,
    kids: ['Então duas coisas podem parecer juntas e ainda estar separadas?'],
    experience: {
      kind: 'interactive',
      title: 'O encontro de verdade',
      required: true,
      instructions:
        'Investigue a chave e o personagem na Ilha. Compare quando eles parecem juntos e quando encostam de verdade. Essa diferença também vale para o laser e o asteroide da Patrulha.',
      hints: [
        'Uma imagem pode esconder um espaço entre os objetos.',
        'Observe de outro lugar e compare a altura da chave com a do personagem.',
        'Depois de observar os objetos separados, aproxime a chave até acontecer o contato.',
      ],
      semPerguntaFinal: true,
      activity: {
        type: 'experimentation',
        scene: 'island-3d',
        setup: {
          goals: ['contact-apart', 'contact-touch'],
          freeExploration: true,
          goalCopy: {
            'contact-apart': {
              pedido: 'Investigue por que os objetos parecem juntos, mas não encostam.',
            },
            'contact-touch': {
              pedido: 'Descubra o que precisa mudar para o encontro realmente acontecer.',
            },
          },
        },
      },
    },
    steps: [
      'Investigue o encontro da chave e do personagem com o Zappy.',
      'Compare a altura e a separação dos objetos antes de concluir que encostaram.',
    ],
    tests: [],
    blockLabels: [],
    blockTypes: [],
  }
}

const bancadasDaNave = JSON.parse(
  readFileSync(new URL('./construtor-2d-experiencias.json', import.meta.url), 'utf8'),
)

/**
 * Uma bancada da Nave Contra Asteroides retomada na Patrulha: a regra é a mesma nas duas
 * dimensões (o relógio, a proteção depois da batida), e a investigação já existe e é validada.
 * Não existe uma cena da Patrulha; a fala deixa claro que é a bancada da nave.
 */
export function experienciaDaNavePatrulha(input: {
  key: string
  title: string
  bancada: 'intervalo' | 'protecao'
  falas: FalaPatrulha[]
  pergunta: string
  objective: string
  convite: string
}): ConstrutorTrecho {
  const falas: FalaPatrulha[] = [
    ...input.falas,
    ['pergunta', input.pergunta],
    [
      'conversa',
      'Pense na sua resposta antes de testar. Vamos voltar à bancada da Nave Contra Asteroides por um instante: a regra lá é a mesma daqui. Isso você vai testar na experiência.',
    ],
    [
      'teste',
      'O Zappy vai te mostrando o que investigar. Você pode repetir e comparar o que acontece. Depois, a gente leva a descoberta para a patrulha. Quando terminar, clique em Próxima parte.',
    ],
  ]
  return {
    key: input.key,
    title: input.title,
    kind: 'experience',
    objective: input.objective,
    ponte: `Sua vez! ${input.convite} O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.`,
    text: montarFalaPatrulha(falas),
    screen: `Na edição, ilustrar a ideia narrada sem mostrar a solução da experiência. ${telaDaExperiencia('com a bancada 2D da Nave Contra Asteroides; não trocar a cena por uma nave 3D')}`,
    kids: [input.pergunta],
    experience: {
      ...structuredClone(bancadasDaNave[input.bancada]),
      title: input.title,
      instructions: `${input.convite} O Zappy te mostra o que testar, e você pode repetir quando quiser.`,
    },
    steps: [input.convite, 'Observe as descobertas com o Zappy e compare o que acontece.'],
    tests: [],
    blockLabels: [],
    blockTypes: [],
  }
}

export function quizPatrulha(
  key: string,
  title: string,
  questions: {
    id: string
    prompt: string
    choices: string[]
    correct: number
    explanation: string
  }[],
  concluir = false,
): ConstrutorTrecho {
  return {
    key,
    title,
    kind: 'quiz',
    text: '',
    screen: '',
    objective: 'Explicar as regras usando os testes do próprio jogo.',
    ponte: `Pense nos testes que você acabou de fazer. Escolha uma resposta e leia a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em ${concluir ? 'Concluir aula' : 'Próxima parte'}.`,
    quiz: {
      kind: 'quiz',
      passingScore: 100,
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        choices: q.choices.map((label, i) => ({ id: `${q.id}-${i + 1}`, label })),
        correctChoiceIds: [`${q.id}-${q.correct + 1}`],
        explanation: q.explanation,
      })),
    },
    steps: [],
    tests: [],
    blockLabels: [],
    blockTypes: [],
  }
}
