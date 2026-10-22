// Quiz Kids do Desafio, v5 (21/10/2026), aprovado no Canvas "Quiz do Desafio · Kids e adulto"
// (quadros PlanoKids, TelasKids e TelasMenor9). Formato em conversa, o mesmo motor do quiz da
// Comunidade: filho ou filha em duas cartas, a idade em três cartas e sete perguntas por ramo.
//
// A idade decide o caminho sem avisar ninguém: de 9 a 17 (ramo `9a17`), menor de 9 criando junto
// com um adulto (ramo `m9`, chaves com prefixo `m9_`) e 18 ou mais, que sai para o quiz adulto do
// Desafio (ramo `adulto`, sem perguntas).
//
// Regras da copy (decisão da dona): nenhuma tela antes do resultado cita o Desafio, A Chave do
// Farol, curso, aula, plataforma, preço ou prazo. Cada opção é uma frase que a família diria. O
// texto é escrito no masculino; `paraFeminino` troca para "ela" quando a entrada é "Na minha filha".
// Sem calculadora de horas: a régua do Desafio recusa conta de perda e tensão artificial.
import type { Opcao, SelecaoStep } from '../../../content/quiz-config'

const opcoes = (pares: ReadonlyArray<readonly [string, string]>): Opcao[] =>
  pares.map(([value, label]) => ({ value, label }))

const pergunta = (
  id: number,
  key: string,
  etapa: SelecaoStep['etapa'],
  rotuloCurto: string,
  titulo: string,
  pares: ReadonlyArray<readonly [string, string]>,
  extra: Partial<SelecaoStep> = {},
): SelecaoStep => ({
  id,
  key,
  lastStep: `desafio_v5_${key}`,
  eventName: `respondeu_desafio_v5_${key}`,
  tipo: 'selecao',
  etapa,
  rotuloCurto,
  titulo,
  opcoes: opcoes(pares),
  ...extra,
})

/** Os ramos (id → rótulo do /admin), na ordem do Performance. */
export const BRANCHES = {
  '9a17': 'De 9 a 17',
  m9: 'Menor de 9',
  adulto: '18 ou mais',
} as const
export type DesafioBranch = keyof typeof BRANCHES

// ---------------------------------------------------------------------------------------------
// Entrada: filho ou filha (cartas com desenho) e a idade (cartas; 18 ou mais é um link pequeno).
// ---------------------------------------------------------------------------------------------

export const GENERO_STEP = pergunta(
  1,
  'genero',
  'rotina',
  'Filho ou filha',
  'Em quem você está pensando?',
  [],
  {
    subtitulo: 'Uma criança de cada vez.',
    cartas: true,
    opcoes: [
      {
        value: 'filho',
        label: 'No meu filho',
        image: '/img/comunidade-dos-criadores/dede-fala.webp',
      },
      {
        value: 'filha',
        label: 'Na minha filha',
        image: '/img/comunidade-dos-criadores/debinha-fala.webp',
      },
    ],
  },
)

/** A idade: as três faixas viram cartas; `18_mais` é o link pequeno embaixo delas. */
export const IDADE_STEP = pergunta(
  2,
  'idade',
  'rotina',
  'Idade',
  'Quantos anos ele tem?',
  [
    ['menos_9', 'Menos de 9'],
    ['9_12', 'De 9 a 12'],
    ['13_17', 'De 13 a 17'],
    ['18_mais', 'Ele tem 18 anos ou mais'],
  ],
  { cartas: true },
)

// ---------------------------------------------------------------------------------------------
// Ramo de 9 a 17: sete perguntas na voz dos pais.
// ---------------------------------------------------------------------------------------------

/** As perguntas que somam pontos no ramo de 9 a 17 (o valor é a letra do perfil). */
export const PERGUNTAS_DE_PERFIL = ['cena', 'cena_desejada', 'sintese'] as const

const ramo917 = { ramo: '9a17' } as const

export const QUESTIONS_9A17: SelecaoStep[] = [
  // S. A rotina, sem julgar: a primeira linha da carta. Não pontua.
  pergunta(
    3,
    'tempo_tela',
    'rotina',
    'Tempo em jogos e vídeos',
    'Num dia normal, quanto tempo ele passa em jogos e vídeos?',
    [
      ['menos_1', 'Menos de 1 hora'],
      ['1_2', 'De 1 a 2 horas'],
      ['2_4', 'De 2 a 4 horas'],
      ['mais_4', 'Mais de 4 horas'],
    ],
    { ...ramo917, subtitulo: 'Celular, videogame e computador, tudo junto. Pode chutar.' },
  ),
  // S. O requisito real: só celular ou tablet vira condição não atendida.
  pergunta(
    4,
    'computador',
    'rotina',
    'Computador',
    'Ele tem um computador com mouse e teclado para usar?',
    [
      ['so_dele', 'Tem, só dele'],
      ['dividido', 'Tem, mas é dividido em casa'],
      ['celular_tablet', 'Só celular ou tablet'],
      ['verificar', 'Ainda vou ver'],
    ],
    ramo917,
  ),
  // P. A cena de casa (3 pontos): a mais concreta.
  pergunta(
    5,
    'cena',
    'casa',
    'Cena de casa',
    'Qual destas frases parece mais com a sua casa?',
    [
      ['A', 'Ele vive no jogo e no vídeo, e não faz nada com isso'],
      ['B', 'Ele inventa jogo o tempo todo, mas fica só na conversa'],
      ['C', 'Ele desenha personagem o tempo todo, e fica no papel'],
      ['D', 'Ele quer saber como os jogos são feitos, e eu não sei explicar'],
      ['nenhum', 'Nenhuma dessas'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['nenhum'] },
  ),
  // I. Uma cena que a família já viu, no lugar da calculadora. Escolhe o porquê. Não pontua.
  pergunta(
    6,
    'trava',
    'casa',
    'Quando não dá certo',
    'Quando ele tenta uma coisa nova no computador e não dá certo, o que costuma acontecer?',
    [
      ['desiste', 'Ele desiste e volta para o jogo'],
      ['chama', 'Ele me chama, e eu não sei ajudar'],
      ['copia', 'Ele procura um vídeo e copia sem entender'],
      ['insiste', 'Ele tenta de outro jeito até dar certo'],
      ['nao_vi', 'Ainda não vi isso acontecer'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['nao_vi'] },
  ),
  // N. A cena daqui a um mês, o tempo do acesso (2 pontos). Sem opção neutra.
  pergunta(
    7,
    'cena_desejada',
    'desejo',
    'Cena desejada',
    'Daqui a um mês, qual cena você gostaria de ver?',
    [
      ['A', 'Ele me chamando: olha o que eu fiz'],
      ['B', 'Um amigo jogando um jogo que ele fez'],
      ['C', 'Ele escolhendo o personagem e o cenário do próprio jogo'],
      ['D', 'Ele me explicando como o jogo funciona por dentro'],
    ],
    { ...ramo917, shuffle: true },
  ),
  // N. A objeção principal. Professor ao vivo é a única que a oferta não atende.
  pergunta(
    8,
    'garantia',
    'desejo',
    'O que precisa estar garantido',
    'Para dar certo aí em casa, o que precisa estar garantido?',
    [
      ['sozinho', 'Ele conseguir fazer sozinho'],
      ['ajuda', 'Ter ajuda quando ele travar'],
      ['acompanhar', 'Eu conseguir acompanhar de longe'],
      ['tempo_tela', 'Caber no tempo de tela que a gente combinou'],
      ['orcamento', 'Caber no orçamento'],
      ['ao_vivo', 'Ter professor ao vivo'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['ao_vivo'] },
  ),
  // D. A família escolhe o próprio diagnóstico (3 pontos e o desempate).
  pergunta(
    9,
    'sintese',
    'desejo',
    'Frase-síntese',
    'Juntando tudo, o que você quer para ele?',
    [
      ['A', 'Que o tempo de tela sirva para alguma coisa'],
      ['B', 'Que as ideias de jogo dele saiam do papel'],
      ['C', 'Que os personagens dele ganhem vida na tela'],
      ['D', 'Que ele entenda como a tecnologia funciona por dentro'],
      ['conhecer', 'Ainda estou conhecendo'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['conhecer'] },
  ),
]

// ---------------------------------------------------------------------------------------------
// Ramo menor de 9: sete perguntas para quem cria junto.
// ---------------------------------------------------------------------------------------------

/** As perguntas que somam pontos no ramo menor de 9. */
export const PERGUNTAS_DE_PERFIL_M9 = ['m9_cena', 'm9_cena_desejada', 'm9_sintese'] as const

const ramoM9 = { ramo: 'm9' } as const

export const QUESTIONS_M9: SelecaoStep[] = [
  // S. A leitura define o papel do adulto na sessão. Não pontua.
  pergunta(
    10,
    'm9_leitura',
    'rotina',
    'Leitura',
    'Ele já lê?',
    [
      ['nao', 'Ainda não'],
      ['comecando', 'Está começando'],
      ['prefere', 'Lê, mas prefere que eu leia'],
      ['sozinho', 'Lê sozinho'],
    ],
    ramoM9,
  ),
  // S. O requisito real: nessa idade o aparelho mais comum é o tablet, que não serve para montar.
  pergunta(
    11,
    'm9_computador',
    'rotina',
    'Computador',
    'Vocês têm computador com mouse e teclado em casa?',
    [
      ['sim', 'Sim, podemos usar'],
      ['organizar', 'Sim, mas preciso organizar um horário'],
      ['celular_tablet', 'Só celular ou tablet'],
      ['verificar', 'Ainda vou ver'],
    ],
    ramoM9,
  ),
  // S. A oferta pede o adulto do lado: a carta não vende uma rotina que a família não tem.
  pergunta(
    12,
    'm9_tempo_juntos',
    'rotina',
    'Tempo juntos',
    'Numa semana normal, quantas vezes vocês conseguem sentar juntos no computador?',
    [
      ['uma', 'Uma vez, um pouquinho'],
      ['duas_tres', 'Duas ou três vezes'],
      ['mais', 'Mais do que isso'],
      ['nao_sei', 'Ainda não sei'],
    ],
    { ...ramoM9, subtitulo: 'Pode chutar.' },
  ),
  // P. A cena de casa (3 pontos). O irmão mais velho não pontua e ganha uma frase própria.
  pergunta(
    13,
    'm9_cena',
    'casa',
    'Cena de casa',
    'Qual destas frases parece mais com ele?',
    [
      ['A', 'Só fica no joguinho pronto do tablet'],
      ['B', 'Inventa brincadeira e personagem o tempo todo'],
      ['D', 'Quer saber como tudo funciona e apertar tudo'],
      ['irmao', 'Quer fazer o que o irmão mais velho faz'],
      ['nenhum', 'Nenhuma dessas'],
    ],
    { ...ramoM9, shuffle: true, fixedLast: ['nenhum'] },
  ),
  // N. A cena daqui a um mês (2 pontos; a dos avós soma para A). Sem opção neutra.
  pergunta(
    14,
    'm9_cena_desejada',
    'desejo',
    'Cena desejada',
    'Daqui a um mês, qual cena você gostaria de ver?',
    [
      ['A', 'Ele me chamando para ver o que a gente fez'],
      ['B', 'O personagem que ele escolheu andando na tela'],
      ['D', 'Ele me explicando o que cada bloco faz'],
      ['A2', 'Os avós jogando um jogo nosso'],
    ],
    { ...ramoM9, shuffle: true },
  ),
  // N. O medo do adulto que não programa, na voz dele.
  pergunta(
    15,
    'm9_garantia',
    'desejo',
    'O que precisa estar garantido',
    'Na hora de sentar junto, o que precisa estar garantido?',
    [
      ['nao_programar', 'Eu não precisar saber programar'],
      ['curtas', 'Sessões curtas, que caibam no dia'],
      ['ele_escolhe', 'Ele escolher, e eu só ajudar'],
      ['orcamento', 'Caber no orçamento'],
      ['ao_vivo', 'Ter professor ao vivo'],
    ],
    { ...ramoM9, shuffle: true, fixedLast: ['ao_vivo'] },
  ),
  // D. O diagnóstico escolhido pela família (3 pontos e o desempate).
  pergunta(
    16,
    'm9_sintese',
    'desejo',
    'Frase-síntese',
    'Juntando tudo, o que você quer para ele?',
    [
      ['A', 'Um tempo de tela que seja de nós dois'],
      ['B', 'Ver as ideias dele virando jogo'],
      ['D', 'Que ele entenda como as coisas funcionam'],
      ['conhecer', 'Ainda estou conhecendo'],
    ],
    { ...ramoM9, shuffle: true, fixedLast: ['conhecer'] },
  ),
]

/** Todas as perguntas, na ordem do /admin: a entrada e os dois ramos. */
export const DESAFIO_QUESTIONS: SelecaoStep[] = [
  GENERO_STEP,
  IDADE_STEP,
  ...QUESTIONS_9A17,
  ...QUESTIONS_M9,
]
