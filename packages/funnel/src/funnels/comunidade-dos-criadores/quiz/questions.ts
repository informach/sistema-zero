// Quiz v5 (16/10/2026), tráfego frio em SPIN. Proposta aprovada em
// docs/marketing/kids/comunidade-dos-criadores/quiz/revisao-copy-2026-10-16.md; espelho gerado em
// docs/marketing/kids/comunidade-dos-criadores/copy/quiz-comunidade.md.
//
// Regras da copy (decisão da dona): as perguntas falam só da criança e da casa. Nenhuma tela antes
// do resultado cita a Comunidade, aula, curso, plataforma ou preço, nem apresenta a criação de
// jogos como solução ("jogo" só aparece quando descreve a família). O texto é escrito no
// masculino; `paraFeminino` (genero.ts) troca para "ela" quando a P1 é "Filha".
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
  lastStep: `comunidade_v5_${key}`,
  eventName: `respondeu_comunidade_v5_${key}`,
  tipo: 'selecao',
  etapa,
  rotuloCurto,
  titulo,
  opcoes: opcoes(pares),
  ...extra,
})

/** Opções que somam pontos para um perfil (P4, I7, N8 e P10): o valor é a letra do perfil. */
export const PERGUNTAS_DE_PERFIL = ['cena', 'preocupacao', 'cena_desejada', 'sintese'] as const

export const COMMUNITY_QUESTIONS: SelecaoStep[] = [
  // P1. Segmentação, na própria tela de entrada: filho ou filha e a faixa de idade.
  pergunta(
    1,
    'crianca',
    'rotina',
    'Criança e idade',
    'Em quem você está pensando?',
    [
      ['filho_9_11', 'Filho de 9 a 11 anos'],
      ['filha_9_11', 'Filha de 9 a 11 anos'],
      ['filho_12_14', 'Filho de 12 a 14 anos'],
      ['filha_12_14', 'Filha de 12 a 14 anos'],
      ['menos_9', 'Menos de 9 anos'],
      ['15_mais', '15 anos ou mais'],
    ],
    { subtitulo: 'Responda pensando em uma criança de cada vez.' },
  ),
  // S2. Situação: o dado da calculadora (I6).
  pergunta(
    2,
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
    { subtitulo: 'Some celular, computador, tablet e videogame. Vale uma estimativa.' },
  ),
  // S3. Situação: o computador (vira condição no resultado quando falta).
  pergunta(
    3,
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
    { subtitulo: 'Pode ser o da família.' },
  ),
  // P4. Problema: a cena de casa (3 pontos para o perfil).
  pergunta(
    4,
    'cena',
    'casa',
    'Cena de casa',
    'Qual destas cenas mais acontece aí em casa?',
    [
      [
        'A',
        'Ele passa horas em jogos e vídeos, e no fim do dia não sobra nada que ele tenha feito',
      ],
      ['B', 'Ele inventa jogos e regras o tempo todo, mas as ideias ficam na conversa ou no papel'],
      ['C', 'Ele desenha personagens o tempo todo, e os desenhos ficam guardados no caderno'],
      [
        'D',
        'Ele quer saber como os jogos e os programas funcionam, e eu não sei por onde começar a ensinar',
      ],
      ['F', 'Na lição, ele repete o exemplo, mas trava quando a pergunta muda'],
      ['nenhum', 'Nenhuma dessas parece com a nossa casa'],
    ],
    { shuffle: true, fixedLast: ['nenhum'] },
  ),
  // P5. Problema: o que ele faz quando trava.
  pergunta(
    5,
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
    { shuffle: true, fixedLast: ['nao_reparou'] },
  ),
  // I6. Implicação: a calculadora. O título na tela é montado com a S2 (`stepOnScreen`, engine.ts).
  pergunta(
    6,
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
  ),
  // I7. Implicação: o que preocupa (2 pontos).
  pergunta(
    7,
    'preocupacao',
    'casa',
    'Preocupação',
    'Se nada mudar no próximo ano, o que mais preocupa você?',
    [
      ['A', 'Que a tela continue sendo só para assistir e jogar'],
      ['B', 'Que a vontade de criar jogos passe antes de ele fazer o primeiro'],
      ['C', 'Que os desenhos continuem guardados na gaveta'],
      ['D', 'Que a curiosidade dele sobre os programas passe antes de ele entender como funcionam'],
      ['F', 'Que a dificuldade na escola vire desânimo com os estudos'],
      ['nenhum', 'Nada me preocupa; quero aproveitar o interesse dele'],
    ],
    { shuffle: true, fixedLast: ['nenhum'] },
  ),
  // N8. Necessidade: visualização profunda (2 pontos). Sem opção neutra: sempre há um perfil.
  pergunta(
    8,
    'cena_desejada',
    'desejo',
    'Cena desejada',
    'Imagine que, daqui a três meses, alguma coisa mudou aí em casa. Qual cena você gostaria de ver primeiro?',
    [
      ['A', 'Ele me chamando para ver uma coisa que ele mesmo fez no computador'],
      ['B', 'Um amigo jogando um jogo que ele inventou'],
      ['C', 'O personagem que ele desenhou se mexendo na tela'],
      ['D', 'Ele me explicando como um programa funciona por dentro'],
      ['F', 'Ele explicando uma conta com as próprias palavras'],
    ],
    { shuffle: true },
  ),
  // N9. Necessidade: o que precisa estar garantido (a objeção; "ao vivo" vira condição).
  pergunta(
    9,
    'garantia',
    'desejo',
    'O que precisa estar garantido',
    'Para uma atividade nova dar certo aí em casa, o que precisa estar garantido?',
    [
      ['sozinho', 'Que ele consiga aprender sozinho, porque eu não entendo do assunto'],
      ['recorrer', 'Que ele tenha a quem recorrer quando travar'],
      ['acompanhar', 'Que eu consiga acompanhar o que ele aprende'],
      ['tempo_tela', 'Que caiba no tempo de tela que já combinamos'],
      ['orcamento', 'Que o valor caiba no orçamento da família'],
      ['ao_vivo', 'Que tenha um professor ao vivo acompanhando'],
    ],
    { shuffle: true, fixedLast: ['ao_vivo'] },
  ),
  // P10. Diagnóstico final (3 pontos; "ainda quero conhecer" não soma).
  pergunta(
    10,
    'sintese',
    'desejo',
    'Frase-síntese',
    'Juntando tudo o que você respondeu, qual destas frases mais parece com o que você quer para ele?',
    [
      ['A', 'Que o tempo de tela deixe alguma coisa feita por ele'],
      ['B', 'Que as ideias de jogo dele saiam do papel'],
      ['C', 'Que os personagens que ele desenha ganhem movimento e história'],
      ['D', 'Que ele entenda como os programas funcionam e aprenda a programar'],
      ['F', 'Que ele entenda o que estuda e use isso na prática'],
      ['conhecer', 'Ainda quero conhecer as possibilidades'],
    ],
    { shuffle: true, fixedLast: ['conhecer'] },
  ),
  // Condicionais: só quando o perfil somado é B, C ou F. Evitam vender a quem precisa de
  // Roblox, de uma atividade só de desenho ou de reforço da série.
  pergunta(
    11,
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
    { condicional: true },
  ),
  pergunta(
    12,
    'desenho',
    'desejo',
    'Desenhos (perfil C)',
    'Para os desenhos dele, o que faz mais sentido?',
    [
      ['movimento', 'Que os personagens façam coisas: andem, pulem, reajam'],
      ['so_desenho', 'Que ele desenhe melhor, com traço e técnica'],
      ['nao_sei', 'Ainda não sei'],
    ],
    { condicional: true },
  ),
  pergunta(
    13,
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
    { condicional: true },
  ),
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
