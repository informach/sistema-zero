// Quiz v6 (20/10/2026), proposta aprovada no Canvas de 19/10 (fonte:
// docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/quiz-dados.json, chave `kids`).
//
// A entrada pergunta filho ou filha em duas cartas e, na tela seguinte, a idade em três cartas. A
// idade decide o caminho sem avisar ninguém: de 9 a 17, as perguntas da v5 com as opções na voz dos
// pais (ramo `9a17`, mesmas chaves e letras da v5); com menos de 9, o ramo de criar junto (`m9`,
// chaves com prefixo `m9_`); 18 ou mais encerra com a saída para o quiz adulto (ramo `adulto`, sem
// perguntas).
//
// Regras da copy (decisão da dona): as perguntas falam só da criança e da casa. Nenhuma tela antes
// do resultado cita a Comunidade, aula, curso, plataforma ou preço. O texto é escrito no masculino;
// `paraFeminino` (genero.ts) troca para "ela" quando a entrada é "Na minha filha".
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
  lastStep: `comunidade_v6_${key}`,
  eventName: `respondeu_comunidade_v6_${key}`,
  tipo: 'selecao',
  etapa,
  rotuloCurto,
  titulo,
  opcoes: opcoes(pares),
  ...extra,
})

/** Os ramos da v6 (id → rótulo do /admin), na ordem do Performance. */
export const BRANCHES = {
  '9a17': '9 a 17 anos',
  m9: 'Menor de 9',
  adulto: '18 ou mais',
} as const
export type CommunityBranch = keyof typeof BRANCHES

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
    // Duas cartas grandes com desenho: filho e filha não diferem só por uma letra numa lista.
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
// Ramo 9 a 17: as perguntas da v5, na mesma ordem e com a mesma função, e as opções na voz dos pais.
// ---------------------------------------------------------------------------------------------

/** As perguntas que somam pontos no ramo 9 a 17 (o valor é a letra do perfil). */
export const PERGUNTAS_DE_PERFIL = ['cena', 'preocupacao', 'cena_desejada', 'sintese'] as const

const ramo917 = { ramo: '9a17' } as const

export const QUESTIONS_9A17: SelecaoStep[] = [
  // S2. Situação: o dado da calculadora (I6).
  pergunta(
    3,
    'tempo_tela',
    'rotina',
    'Tempo de tela',
    'Num dia comum, quanto tempo ele passa em jogos e vídeos?',
    [
      ['menos_1h', 'Menos de 1 hora'],
      ['1_2h', 'De 1 a 2 horas'],
      ['2_4h', 'De 2 a 4 horas'],
      ['mais_4h', 'Mais de 4 horas'],
    ],
    { ...ramo917, subtitulo: 'Some celular, computador, tablet e videogame. Vale uma estimativa.' },
  ),
  // S3. Situação: o computador (vira condição no resultado quando falta).
  pergunta(
    4,
    'computador',
    'rotina',
    'Computador',
    'Em casa, ele pode usar um computador?',
    [
      ['sim', 'Sim, ele pode usar'],
      ['organizar', 'Temos, mas preciso organizar os horários'],
      ['celular_tablet', 'Por enquanto, só celular ou tablet'],
      ['verificar', 'Ainda preciso ver'],
    ],
    { ...ramo917, subtitulo: 'Pode ser o da família.' },
  ),
  // P4. Problema: a cena de casa (3 pontos para o perfil).
  pergunta(
    5,
    'cena',
    'casa',
    'Cena de casa',
    'Qual destas frases parece mais com a sua casa?',
    [
      ['A', 'Ele vive no jogo e no vídeo, e não faz nada com isso'],
      ['B', 'Ele inventa jogo o tempo todo, mas fica só na conversa'],
      ['C', 'Ele desenha personagem o tempo todo, e fica no caderno'],
      ['D', 'Ele quer saber como os jogos são feitos, e eu não sei ensinar'],
      ['F', 'Na lição, ele copia o exemplo e trava quando a pergunta muda'],
      ['nenhum', 'Nenhuma dessas'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['nenhum'] },
  ),
  // P5. Problema: o que ele faz quando trava.
  pergunta(
    6,
    'quando_trava',
    'casa',
    'Quando trava',
    'Quando alguma coisa não dá certo num jogo ou num aplicativo, o que ele faz primeiro?',
    [
      ['larga', 'Larga e vai fazer outra coisa'],
      ['chama', 'Chama alguém para resolver'],
      ['tenta', 'Tenta de outro jeito até dar certo'],
      ['procura', 'Procura um vídeo ou um exemplo'],
      ['nao_reparou', 'Ainda não reparei'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['nao_reparou'] },
  ),
  // I6. Implicação: a calculadora. O título na tela é montado com a S2 (`stepOnScreen`, engine.ts).
  pergunta(
    7,
    'tempo_criacao',
    'casa',
    'Calculadora do tempo de tela',
    'Quanto do tempo em jogos e vídeos vira alguma coisa que ele mesmo fez?',
    [
      ['quase_nada', 'Quase nada'],
      ['um_pouco', 'Um pouco'],
      ['boa_parte', 'Boa parte'],
      ['nao_sei', 'Não sei dizer'],
    ],
    ramo917,
  ),
  // I7. Implicação: o que preocupa (2 pontos).
  pergunta(
    8,
    'preocupacao',
    'casa',
    'Preocupação',
    'Se nada mudar no próximo ano, o que mais preocupa?',
    [
      ['A', 'A tela continuar só para assistir e jogar'],
      ['B', 'A vontade de criar passar antes de ele fazer um jogo'],
      ['C', 'Os desenhos ficarem na gaveta'],
      ['D', 'A curiosidade dele passar em branco'],
      ['F', 'A dificuldade na escola virar desânimo'],
      ['nenhum', 'Nada, quero aproveitar o interesse dele'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['nenhum'] },
  ),
  // N8. Necessidade: a cena desejada (2 pontos). Sem opção neutra: sempre há um perfil.
  pergunta(
    9,
    'cena_desejada',
    'desejo',
    'Cena desejada',
    'Daqui a três meses, qual cena você gostaria de ver?',
    [
      ['A', 'Ele me chamando: olha o que eu fiz'],
      ['B', 'Um amigo jogando um jogo que ele inventou'],
      ['C', 'O personagem que ele desenhou se mexendo na tela'],
      ['D', 'Ele me explicando como um jogo funciona por dentro'],
      ['F', 'Ele explicando uma conta com as palavras dele'],
    ],
    { ...ramo917, shuffle: true },
  ),
  // N9. Necessidade: o que precisa estar garantido (a objeção; "ao vivo" vira condição).
  pergunta(
    10,
    'garantia',
    'desejo',
    'O que precisa estar garantido',
    'Para dar certo aí em casa, o que precisa estar garantido?',
    [
      ['sozinho', 'Ele conseguir sozinho, porque eu não entendo disso'],
      ['recorrer', 'Ter a quem recorrer quando travar'],
      ['acompanhar', 'Eu conseguir acompanhar'],
      ['tempo_tela', 'Caber no tempo de tela combinado'],
      ['orcamento', 'Caber no orçamento'],
      ['ao_vivo', 'Ter professor ao vivo'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['ao_vivo'] },
  ),
  // P10. Diagnóstico final (3 pontos; "ainda estou conhecendo" não soma).
  pergunta(
    11,
    'sintese',
    'desejo',
    'Frase-síntese',
    'Juntando tudo, o que você quer para ele?',
    [
      ['A', 'Que o tempo de tela sirva para alguma coisa'],
      ['B', 'Que as ideias de jogo dele saiam do papel'],
      ['C', 'Que os desenhos dele ganhem vida'],
      ['D', 'Que ele aprenda a programar de verdade'],
      ['F', 'Que ele entenda o que estuda e use na prática'],
      ['conhecer', 'Ainda estou conhecendo'],
    ],
    { ...ramo917, shuffle: true, fixedLast: ['conhecer'] },
  ),
  // Condicionais: só quando o perfil somado é B, C ou F. Evitam vender a quem precisa de
  // Roblox, de uma atividade só de desenho ou de reforço da série.
  pergunta(
    12,
    'ferramenta',
    'desejo',
    'Ferramenta (perfil B)',
    'Ele precisa criar jogos numa ferramenta específica?',
    [
      ['roblox', 'Precisa ser no Roblox'],
      ['minecraft', 'Precisa ser no Minecraft'],
      ['outra', 'Precisa ser em outra ferramenta específica'],
      ['pode_outra', 'Qualquer ferramenta serve, se ele gostar'],
      ['conversar', 'Ainda vou conversar com ele'],
    ],
    { ...ramo917, condicional: true },
  ),
  pergunta(
    13,
    'desenho',
    'desejo',
    'Desenhos (perfil C)',
    'Para os desenhos dele, o que faz mais sentido?',
    [
      ['movimento', 'Que os personagens façam coisas: andem, pulem, reajam'],
      ['so_desenho', 'Que ele desenhe melhor, com traço e técnica'],
      ['nao_sei', 'Ainda não sei'],
    ],
    { ...ramo917, condicional: true },
  ),
  pergunta(
    14,
    'escola',
    'desejo',
    'Escola (perfil F)',
    'Em que parte da escola ele mais trava?',
    [
      ['leitura', 'Entender o que o enunciado pede'],
      ['matematica', 'Entender as contas, e não só repetir o exemplo'],
      ['problemas', 'Começar e organizar uma tarefa de várias etapas'],
      ['ciencias', 'Entender por que as coisas acontecem, em ciências'],
      ['vai_bem', 'Ele vai bem; quero que use na prática o que aprende'],
      ['reforco', 'Ele precisa recuperar matéria atrasada da série'],
    ],
    { ...ramo917, condicional: true },
  ),
]

// ---------------------------------------------------------------------------------------------
// Ramo menor de 9: criar junto. Oito perguntas, na pele pastel; o adulto senta ao lado.
// ---------------------------------------------------------------------------------------------

/** As perguntas que somam pontos no ramo menor de 9. */
export const PERGUNTAS_DE_PERFIL_M9 = [
  'm9_cena',
  'm9_preocupacao',
  'm9_cena_desejada',
  'm9_sintese',
] as const

const ramoM9 = { ramo: 'm9' } as const

export const QUESTIONS_M9: SelecaoStep[] = [
  // S2. A leitura define o papel do adulto na sessão (não pontua).
  pergunta(
    15,
    'm9_leitura',
    'rotina',
    'Leitura',
    'Ele já lê?',
    [
      ['nao_le', 'Ainda não'],
      ['comecando', 'Está começando'],
      ['prefere', 'Lê, mas prefere que eu leia'],
      ['le_sozinho', 'Lê sozinho'],
    ],
    ramoM9,
  ),
  // S3. Computador: tablet não serve para criar, e é o aparelho mais comum nessa idade.
  pergunta(
    16,
    'm9_computador',
    'rotina',
    'Computador',
    'Vocês têm computador em casa?',
    [
      ['sim', 'Sim, podemos usar'],
      ['organizar', 'Sim, mas preciso organizar horário'],
      ['celular_tablet', 'Só celular ou tablet'],
      ['verificar', 'Ainda vou ver'],
    ],
    ramoM9,
  ),
  // S4. O tempo real a dois evita vender uma rotina que a família não tem (não pontua).
  pergunta(
    17,
    'm9_tempo_juntos',
    'rotina',
    'Tempo juntos',
    'Por semana, quanto tempo vocês conseguem sentar juntos no computador?',
    [
      ['uma_vez', 'Uns 20 minutos, uma vez'],
      ['duas_tres', 'Duas ou três vezes, de 20 a 30 minutos'],
      ['mais', 'Mais do que isso'],
      ['nao_sei', 'Ainda não sei'],
    ],
    { ...ramoM9, subtitulo: 'Chute.' },
  ),
  // P5. A cena de casa (3 pontos). O irmão não pontua e ganha uma frase própria.
  pergunta(
    18,
    'm9_cena',
    'casa',
    'Frase que parece com ele',
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
  // I6. O custo de não mudar (2 pontos).
  pergunta(
    19,
    'm9_preocupacao',
    'casa',
    'Preocupação',
    'Se nada mudar, o que mais preocupa?',
    [
      ['A', 'A tela continuar só para assistir e jogar'],
      ['B', 'As ideias dele ficarem só na brincadeira'],
      ['D', 'A curiosidade dele passar em branco'],
      ['nenhum', 'Nada, quero aproveitar a fase'],
    ],
    { ...ramoM9, shuffle: true, fixedLast: ['nenhum'] },
  ),
  // N7. A cena daqui a três meses (2 pontos; `A2`, os avós, soma para A).
  pergunta(
    20,
    'm9_cena_desejada',
    'desejo',
    'Cena desejada',
    'Daqui a três meses, qual cena você gostaria de ver?',
    [
      ['A', 'Ele me chamando para ver o que a gente fez'],
      ['B', 'O personagem dele aparecendo na tela'],
      ['D', 'Ele me explicando o que cada botão faz'],
      ['A2', 'Os avós jogando um jogo nosso'],
    ],
    { ...ramoM9, shuffle: true },
  ),
  // N8. A objeção principal: duas respostas pedem uma conversa honesta.
  pergunta(
    21,
    'm9_garantia',
    'desejo',
    'O que precisa estar garantido',
    'Para dar certo aí em casa, o que precisa estar garantido?',
    [
      ['conduzir', 'Eu conseguir conduzir sem saber programar'],
      ['curto', 'Caber em sessões curtas'],
      ['seguro', 'Ser um lugar seguro'],
      ['orcamento', 'Caber no orçamento'],
      ['sozinho', 'Ele conseguir sozinho, não tenho tempo'],
      ['ao_vivo', 'Ter professor ao vivo'],
    ],
    { ...ramoM9, shuffle: true, fixedLast: ['ao_vivo'] },
  ),
  // P9. A frase-síntese e o desempate (3 pontos; "ainda estou conhecendo" não soma).
  pergunta(
    22,
    'm9_sintese',
    'desejo',
    'Frase-síntese',
    'Juntando tudo, o que você quer?',
    [
      ['A', 'Um tempo de tela nosso, com alguma coisa feita no fim'],
      ['B', 'As ideias dele virando um jogo'],
      ['D', 'Ele entender, brincando, como as coisas funcionam'],
      ['conhecer', 'Ainda estou conhecendo'],
    ],
    { ...ramoM9, shuffle: true, fixedLast: ['conhecer'] },
  ),
]

export const COMMUNITY_QUESTIONS: SelecaoStep[] = [
  GENERO_STEP,
  IDADE_STEP,
  ...QUESTIONS_9A17,
  ...QUESTIONS_M9,
]

/**
 * O título da calculadora (I6) repete o tempo por dia da S2: entre as duas há três telas, e um
 * "Isso dá…" ficaria sem referência.
 */
export const CALCULADORA_POR_DIA: Record<string, string> = {
  menos_1h: 'Menos de 1 hora por dia dá até 365 horas',
  '1_2h': 'De 1 a 2 horas por dia dão entre 365 e 730 horas',
  '2_4h': 'De 2 a 4 horas por dia dão entre 730 e 1.460 horas',
  mais_4h: 'Mais de 4 horas por dia dão mais de 1.460 horas',
}

/** A calculadora (I6): horas por dia × 365, em faixa, para não inventar um número exato. */
export const HORAS_POR_ANO: Record<string, string> = {
  menos_1h: 'até 365 horas',
  '1_2h': 'entre 365 e 730 horas',
  '2_4h': 'entre 730 e 1.460 horas',
  mais_4h: 'mais de 1.460 horas',
}
