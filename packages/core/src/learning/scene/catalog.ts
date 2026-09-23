import { SCENE_IDS, type SceneGroup, type SceneId } from './actions'

/**
 * Os 45 modelos de cena: o catálogo ÚNICO do sistema.
 *
 * Antes o conteúdo de uma cena estava espalhado por três lugares — `LEARNING_SCENE_DEFINITIONS`
 * (a v1, com controles), `EXPLORATION_DEFINITIONS` (a v2/v3, com metas e dicas) e um segundo
 * catálogo escondido dentro de `experienceScript()`, que trazia os roteiros de demonstração.
 * Um modelo tinha, portanto, duas casas e nenhuma delas completa. Aqui ele tem uma só.
 *
 * O texto é conteúdo pedagógico da dona: foi transportado literalmente, não reescrito.
 */

/**
 * As cenas que mostram a COMPARAÇÃO guardada ("Guardar este jeito" e o destaque `compare` da etapa).
 *
 * ⚠️⚠️ A lista ÚNICA (full review de 16/09/2026). Player e admin tinham cada um a sua: o admin oferecia
 * "Comparação" em `gravity`, `impulse`, `hitbox` e `jump-sound`, e o player, desde o lote 5 do Raio-X, só
 * desenhava na `hitbox` (a `impulse` guarda as duas marcas no próprio palco, a `gravity` compara com o
 * pulo pontilhado, e a `jump-sound` ganhou palco próprio). O professor escolhia "Comparação" numa etapa da
 * `gravity` e a criança não via nada, sem aviso. ⚠️ O `isSceneScript` NÃO recusa `compare` fora daqui: um
 * bloco já gravado com ele viraria inválido e trancaria a seção por um destaque que não desenha nada.
 */
export const SCENE_COMPARISONS = ['hitbox'] as const satisfies readonly SceneId[]

/** A cena desenha a comparação guardada? Ver `SCENE_COMPARISONS`. */
export function sceneShowsComparison(scene: SceneId): boolean {
  return (SCENE_COMPARISONS as readonly SceneId[]).includes(scene)
}

/** Uma coisa que a criança precisa PERCEBER. O motor emite o id no instante em que acontece;
 *  a avaliação só conta quais apareceram. */
export interface SceneGoal {
  id: string
  label: string
  /**
   * ⚠️⚠️ Meta que só existe para um CASO do professor (`setup.goals`), e nunca entra na missão de
   * fábrica. `down` e `up` da `velocity` nasceram para o Dia 2 do Desafio; somadas às outras três,
   * a missão de fábrica passou a cobrar cinco metas que a instrução, as pistas e a demonstração
   * não pediam (a prévia do admin e toda experimentação sem caso). `sceneTargets` e `sceneGoals`
   * deixam estas de fora quando não há caso; `isSceneSetup` continua aceitando as cinco.
   */
  soNoCaso?: true
  /**
   * O que FAZER para a meta cair, sem a resposta ("Aumente só o y"). O `label` é a CONCLUSÃO
   * ("y maior leva para baixo") e só aparece depois que a meta cai.
   *
   * ⚠️ O "Ainda falta" do "Já descobri" mostrava o rótulo da meta que faltava, e em `up` o
   * rótulo é a própria descoberta ("Velocidade negativa levou para cima"): a criança lia o que o
   * palpite tinha perguntado antes de fazer o gesto. Com `pedido`, o avaliador diz o gesto.
   *
   * ⚠️⚠️ OBRIGATÓRIO desde o lote 2 do Raio-X (16/09/2026): meta nova sem pedido reprova no TS.
   * Três regras para escrever um (cobradas em `cast.test.ts` e `questions.test.ts`):
   *  - um gesto que a bancada de HOJE oferece, com o nome que o botão tem. ⚠️ O TEMPO é "deixe o
   *    tempo passar" (ou o ▶): nenhum botão se chama "avançar o relógio", e o botão de passo tem DOIS
   *    nomes desde o lote 4 ("Avançar 1 quadro" ou "Um passo", `sceneStepLabel`), então pedido nenhum
   *    o cita. Na `acceleration` o tempo é o botão "Passar 5 segundos", e o pedido usa esse nome;
   *  - nunca o resultado nem o resultado de OUTRA meta ("depois de o Dino sumir" entrega a
   *    previsão da `camera`): os pedidos podem ficar todos à vista antes de qualquer meta cair;
   *  - sobrevive ao elenco: sem pronome e sem particípio solto longe do nome.
   */
  pedido: string
}

/** Partes do palco que poderiam entregar a resposta antes de a criança apostar. */
export type ScenePredictionPreviewConceal = 'layers-order' | 'camera-colors'

/** A prévia é sempre o começo real da cena, com redactions declaradas quando necessárias. */
export interface ScenePredictionPreview {
  initial: true
  conceal: readonly ScenePredictionPreviewConceal[]
}

export interface SceneModel {
  id: SceneId
  group: SceneGroup
  /** O que a criança vai fazer, em uma frase. É o nome que o professor bate o olho e escolhe. */
  title: string
  instruction: string
  /** O que ela pode mexer. Hoje isto só aparecia DEPOIS da escolha, no resumo. */
  manipulates: string
  success: string
  /** A pergunta do "e se…", para quem terminar antes. */
  extra: string
  goals: readonly SceneGoal[]
  /** Escada de três degraus: observação → estratégia → passo literal. */
  hints: readonly [string, string, string]
  /** A cena que a criança vê antes de responder ao palpite. */
  predictionPreview: ScenePredictionPreview
  /**
   * ⚠️⚠️ A frase de sucesso de uma MISSÃO RESTRITA, pela lista de metas dela em ordem alfabética e
   * juntas por `+` (consertos do review da onda A do lote 5). O Dia 1 do Desafio cobra só `down`, e o
   * cartão afirmava "x maior vai para a direita… E o 0, 0 fica no canto de cima!", o que a criança não
   * viu. Sem entrada, vale `success`. Quem lê é `sceneSuccess` (evaluate).
   */
  successNoCaso?: Readonly<Record<string, string>>
}

const SCENE_MODEL_DEFINITIONS: Record<SceneId, Omit<SceneModel, 'predictionPreview'>> = {
  'once-vs-always': {
    id: 'once-vs-always',
    group: 'events',
    title: 'Uma vez, sempre, e na hora que acontecer',
    instruction:
      'Ponha as fichas nas áreas do projeto e avance passos. Compare os contadores de cada ficha. Volte ao começo antes de experimentar outro lugar.',
    manipulates: 'As fichas de ação, as áreas do projeto e o avanço dos passos',
    success: 'Ao iniciar é uma vez. Enquanto estiver rodando é sempre. Quando acontecer é na hora.',
    successNoCaso: {
      'always+once': 'Você viu a mesma ação uma vez no começo e repetida em cada passo.',
      'always+both+once': 'Você achou a diferença: arrumar é uma vez, o motor é sempre.',
      'key-fires+on-event': 'Quando acontecer espera a tecla e age na hora em que ela é apertada.',
      once: 'Em Ao iniciar, a ação acontece uma vez e a batida consegue tirar vidas.',
    },
    extra: 'E se você levar uma ficha para outra área e voltar ao começo?',
    goals: [
      {
        id: 'once',
        label: 'Em Ao iniciar, a ação aconteceu uma vez só',
        pedido: 'Ponha a ficha de arrumação em Ao iniciar e avance três passos.',
      },
      {
        id: 'always',
        label: 'Em Enquanto estiver rodando, a ação se repete a cada passo',
        pedido: 'Ponha a ficha de movimento em Enquanto estiver rodando e avance três passos.',
      },
      {
        id: 'both',
        label: 'Preparar uma vez e repetir sempre, juntos',
        pedido:
          'Deixe a preparação em Ao iniciar e o movimento em Enquanto estiver rodando; avance cinco passos.',
      },
      {
        id: 'on-event',
        label: 'Em Quando acontecer, a ação ficou esperando',
        pedido:
          'Ponha a ficha do evento em Quando acontecer e avance três passos sem apertar a tecla.',
        soNoCaso: true,
      },
      {
        id: 'key-fires',
        label: 'A tecla fez a ação acontecer na hora',
        pedido: 'Com a ficha do evento em Quando acontecer, aperte a tecla.',
        soNoCaso: true,
      },
      {
        id: 'flood',
        label: 'Em Enquanto estiver rodando, nasceu um tiro em cada passo',
        pedido: 'Ponha Criar um tiro em Enquanto estiver rodando e avance cinco passos.',
        soNoCaso: true,
      },
    ],
    hints: [
      'Olhe o número do passo e conte quantas vezes cada ação aconteceu.',
      'Ponha uma ação em Ao iniciar e avance mais de um passo. Ela acontece de novo?',
      'Agora arraste a mesma ação para Enquanto estiver rodando e avance de novo.',
    ],
  },
  'fixed-vs-read': {
    id: 'fixed-vs-read',
    group: 'motion',
    title: 'O número escrito e o número lido',
    instruction:
      'Atire com o número 400, mude a nave de lugar e atire de novo. Depois troque para a leitura do centro x e compare as marcas.',
    manipulates: 'O x da nave, a origem do x do tiro e as marcas da caixa',
    success: 'Número escrito é sempre o mesmo. Número lido é o de agora.',
    extra: 'E se a nave andar depois do disparo? O tiro que já saiu muda de caminho?',
    goals: [
      {
        id: 'same-spot',
        label: 'Com o número escrito, os dois tiros nasceram no mesmo lugar',
        pedido: 'Com o x em o número 400, atire, leve a nave para outro lugar e atire de novo.',
      },
      {
        id: 'follows',
        label: 'Com a leitura, o tiro nasceu onde a nave estava',
        pedido: 'Troque para o centro x da nave, leve a nave para outro lugar e atire.',
      },
      {
        id: 'box-marks',
        label: 'O tiro sai do meio da caixa e da borda de cima dela',
        pedido: 'Ligue as marcas da caixa da nave e atire com o centro x da nave.',
      },
    ],
    hints: [
      'Atire, depois arraste a nave para longe e atire de novo. Olhe as duas marquinhas.',
      'Troque de onde vem o x do tiro e repita: atire, arraste a nave, atire.',
      'Ligue as marcas da caixa e olhe por onde o tiro sai.',
    ],
  },
  'collision-pair': {
    id: 'collision-pair',
    group: 'collision',
    title: 'Quem some na trombada?',
    instruction:
      'Deixe a trombada acontecer com os grupos escolhidos. Volte ao começo, escolha os apelidos e compare os dois contadores.',
    manipulates: 'O alvo dos comandos para o tiro e a pedra e o avanço até a colisão',
    success: 'O apelido aponta para um. O grupo aponta para todos.',
    extra: 'E se só um dos dois comandos usar o apelido?',
    goals: [
      {
        id: 'whole-group',
        label: 'Escolhendo o grupo, sumiu todo mundo',
        pedido: 'Deixe os dois seletores no grupo inteiro e deixe a trombada acontecer.',
      },
      {
        id: 'just-the-pair',
        label: 'Escolhendo os apelidos, sumiram só os dois que se bateram',
        pedido:
          'Troque os dois seletores para os apelidos, volte ao começo e deixe a trombada acontecer.',
      },
      {
        id: 'others-stay',
        label: 'As outras pedras continuaram o caminho delas',
        pedido:
          'Com os apelidos escolhidos, deixe o tempo passar até as outras duas pedras saírem pela borda de baixo.',
      },
    ],
    hints: [
      'Olhe os dois contadores antes e depois da trombada.',
      'Só um tiro encostou numa pedra. Quantos sumiram?',
      'Troque o alvo dos dois comandos para os apelidos, tiro e asteroide, e faça de novo.',
    ],
  },
  invincibility: {
    id: 'invincibility',
    group: 'events',
    title: 'O respiro depois da batida',
    instruction:
      'Compare as três batidas com 0, 45 e 15 quadros de proteção. Volte ao começo entre os testes.',
    manipulates: 'A duração da proteção, o avanço de quadros e o retorno ao começo',
    success: 'A proteção não é um escudo para sempre: é um respiro com prazo.',
    extra: 'E se a proteção durasse 90 quadros?',
    goals: [
      {
        id: 'no-shield',
        label: 'Sem proteção, as três batidas tiraram as três vidas',
        pedido: 'Deixe a proteção em 0 e avance até passar a terceira pedra.',
      },
      {
        id: 'window',
        label: 'Com 45 quadros, só a primeira batida tirou vida',
        pedido: 'Ponha a proteção em 45, volte ao começo e avance até passar a terceira pedra.',
      },
      {
        id: 'expires',
        label: 'Com 15 quadros, a proteção acabou antes da terceira pedra',
        pedido: 'Ponha a proteção em 15, volte ao começo e avance até passar a terceira pedra.',
      },
    ],
    hints: [
      'Depois da primeira batida, olhe a faixa da proteção contando para trás.',
      'Compare quantas vidas sobraram com a proteção em 0 e com a proteção em 45.',
      'Ponha 15 e olhe em que quadro a proteção chega a zero. A pedra do quadro 30 chega antes ou depois disso?',
    ],
  },
  'number-line': {
    id: 'number-line',
    group: 'speed',
    title: 'A régua dos números negativos',
    instruction:
      'Ande pela régua com Somar -1 e troque o sinal da pergunta. Veja quando a resposta muda.',
    manipulates: 'O marcador de -12 a 0, o botão Somar -1 e o sinal da comparação',
    success:
      'Na régua, quem está mais à direita é o maior. E o sinal decide o que a pergunta responde.',
    extra: 'E se a velocidade for menor que -9? O que cada sinal responderia?',
    goals: [
      {
        id: 'colder',
        label: 'Somar -1 anda uma casa para a esquerda, e para a esquerda é mais rápido',
        pedido: 'Aperte Somar -1 três vezes e olhe onde o marcador para.',
      },
      {
        id: 'greater',
        label: '-5 é maior que -9, porque mora à direita dele na régua',
        pedido: 'Volte ao começo e troque o sinal para o biquinho que aponta para a direita.',
      },
      {
        id: 'stops',
        label: 'No -9 a pergunta diz não, e a base para ali',
        pedido: 'Com o biquinho escolhido, leve o marcador até o -9.',
      },
      {
        id: 'silent',
        label: 'Com o igual, a resposta é não em todo lugar menos num',
        pedido: 'Volte ao começo, ponha o sinal no igual e aperte Somar -1 quatro vezes.',
      },
    ],
    hints: [
      'A régua é parecida com um termômetro deitado. O -9 fica mais para a esquerda que o -5.',
      'Olhe a frase embaixo da régua. A resposta muda sozinha conforme o marcador anda.',
      'Deixe o marcador no -5 e troque o sinal para o biquinho que aponta para a direita. Depois leve o marcador até o -9 e olhe a resposta.',
    ],
  },
  'unique-names': {
    id: 'unique-names',
    group: 'world',
    title: 'Cada nome só pode ser de uma coisa',
    instruction:
      'Tire o bloco que cria nave, ponha de volta e experimente nomes para a folha. Observe os avisos e a prévia.',
    manipulates: 'O bloco que cria nave e o nome da folha de quadros',
    success: 'Cada nome é de uma coisa só, e é por isso que a folha ganhou nome próprio.',
    extra: 'E se você escolher nave2 em vez de folha-nave?',
    goals: [
      {
        id: 'missing',
        label: 'Sem o bloco que cria o nome, os outros acendem o aviso e a tela para de mudar',
        pedido: 'Tire o bloco de cima e olhe os três blocos e a tela.',
      },
      {
        id: 'clash',
        label: 'Dois blocos criando o mesmo nome: o Estúdio pede um nome diferente',
        pedido: 'Ponha o bloco de cima de volta e escolha nave também no bloco de baixo.',
      },
      {
        id: 'own-name',
        label: 'Com um nome só dela, a folha fica junto da nave sem briga',
        pedido: 'No bloco de baixo, troque nave por folha-nave.',
      },
    ],
    hints: [
      'Olhe os três blocos da direita. Eles procuram um nome. Quem cria esse nome?',
      'Ponha os dois blocos criando nave e leia o aviso que aparece.',
      'Dê um nome só dela ao bloco de baixo, com folha na frente.',
    ],
  },
  'motion-amount': {
    id: 'motion-amount',
    group: 'art',
    title: 'O tanto que muda',
    instruction:
      'Veja a Prévia dos dois quadros iguais. Mova só uma cratera e depois a pedra inteira para comparar.',
    manipulates: 'O tanto que a cratera e a pedra inteira mudam no segundo quadro',
    success:
      'O corpo fica parado e os detalhes andam um pouco. É esse o tanto que faz a pedra rolar.',
    extra: 'E se a cratera andar só uma casa? Você ainda vê rolagem?',
    goals: [
      {
        id: 'no-change',
        label: 'Os dois quadros iguais deixam a Prévia parada',
        pedido: 'Deixe os dois controles em 0 e olhe a Prévia.',
      },
      {
        id: 'local-move',
        label: 'A cratera andando um pouco já faz a pedra parecer que rola',
        pedido: 'Deixe o tanto da pedra inteira em 0 e ponha o da cratera entre 3 e 6.',
      },
      {
        id: 'too-much',
        label: 'Com a pedra inteira andando muito, o desenho pula em vez de rolar',
        pedido: 'Ponha o tanto que a pedra inteira anda em 10 ou mais.',
      },
    ],
    hints: [
      'Os dois quadros estão iguais. Olhe a Prévia e depois mexa em um controle só.',
      'Deixe a pedra inteira parada e mexa só na cratera. Comece em 3.',
      'Agora mexa no tanto que a pedra inteira anda e olhe a Prévia de novo.',
    ],
  },
  'two-clocks': {
    id: 'two-clocks',
    group: 'population',
    title: 'Dois relógios ao mesmo tempo',
    instruction:
      'Mude um relógio de cada vez: quando nasce uma pedra e quantos desenhos por segundo ela troca. Observe os números em cima de cada pedra.',
    manipulates: 'O intervalo de nascimento e a velocidade de animação de cada pedra',
    success:
      'São dois relógios: um faz nascer, o outro troca os desenhos. E cada pedra começa o giro dela quando nasce.',
    extra: 'E se nascer uma pedra a cada 80 quadros e ela trocar desenhos a 16 por segundo?',
    goals: [
      {
        id: 'more-rocks',
        label:
          'Mudando só o relógio de nascer, veio mais pedra, e cada uma continuou girando no mesmo ritmo',
        pedido: 'Deixe a animação em 8, ponha o relógio em 20 e deixe o tempo passar.',
      },
      {
        id: 'faster-spin',
        label:
          'Mudando só a animação, as pedras giraram mais rápido, e continuou nascendo na mesma hora',
        pedido: 'Deixe o relógio em 40, ponha a animação em 16 e deixe o tempo passar.',
      },
      {
        id: 'each-one',
        label: 'Cada pedra começou no quadro 0, na hora em que ela nasceu',
        pedido:
          'Deixe o tempo passar até nascerem três pedras e olhe o número em cima de cada uma na hora em que ela entra.',
      },
    ],
    hints: [
      'São dois números que andam sozinhos: quantas pedras já nasceram e qual desenho cada pedra está mostrando agora.',
      'Mexa num controle de cada vez. Primeiro no de nascer, depois no do giro.',
      'Deixe nascer três pedras e olhe o número em cima de cada uma no instante em que ela aparece.',
    ],
  },
  'copy-vs-original': {
    id: 'copy-vs-original',
    group: 'world',
    title: 'A cópia e o original',
    instruction:
      'Exporte o jogo da aula, importe o arquivo no Estúdio e pinte a nave de um lado só.',
    manipulates: 'Exportar, importar e a cor da nave em cada painel',
    success:
      'Exportar tira uma cópia, importar transforma a cópia num projeto seu, e daí em diante cada um segue o seu caminho.',
    extra: 'E se você pintar a nave na aula depois de exportar, antes de importar?',
    goals: [
      {
        id: 'exported',
        label: 'O arquivo saiu, e o jogo continuou na aula',
        pedido: 'Aperte Exportar e olhe o lado da aula.',
      },
      {
        id: 'imported',
        label: 'O mesmo jogo apareceu no Estúdio',
        pedido: 'Com o arquivo pronto, aperte Importar.',
      },
      {
        id: 'independent',
        label: 'Mudou a cor de um lado, e o outro ficou como estava',
        pedido: 'Com jogo nos dois lados, pinte a nave de um lado só.',
      },
    ],
    hints: [
      'Aperte Exportar e olhe o lado da aula antes de olhar o arquivo.',
      'Com o arquivo no meio, aperte Importar e compare as duas telas.',
      'Pinte a nave do lado do Estúdio e olhe a nave do lado da aula.',
    ],
  },
  'published-copy': {
    id: 'published-copy',
    group: 'world',
    title: 'A cópia que foi para o Mural',
    instruction:
      'Publique uma cópia, mude a cor no projeto e publique de novo. Compare os cartões do Mural.',
    manipulates: 'A cor da nave no projeto, Publicar e Abrir a versão do Mural',
    success:
      'São cópias: o projeto continua seu para mexer; cada publicação guarda a versão daquele momento.',
    extra: 'E se você publicar duas vezes sem mudar a cor?',
    goals: [
      {
        id: 'first-publish',
        label: 'Depois de publicar, as duas telas mostram a mesma nave',
        pedido: 'Aperte Publicar e olhe as duas telas.',
      },
      {
        id: 'only-project',
        label: 'Mudando a cor no projeto, só a tela da esquerda mudou',
        pedido: 'Depois de publicar, troque a cor da nave e olhe as duas telas.',
      },
      {
        id: 'republish',
        label: 'O Mural ganhou uma publicação nova com a cor nova',
        pedido: 'Com a cor trocada, aperte Publicar de novo.',
      },
    ],
    hints: [
      'A tela da direita está vazia. Aperte Publicar.',
      'Agora troque a cor da nave e compare as duas telas.',
      'Aperte Publicar de novo e olhe os dois cartões do Mural.',
    ],
  },
  'same-rules-new-skin': {
    id: 'same-rules-new-skin',
    group: 'world',
    title: 'As mesmas regras, outra história',
    instruction:
      'Jogue, troque o tema para carrinho e submarino e olhe as quatro regras. Depois desligue a regra de atirar e jogue de novo.',
    manipulates: 'O tema do mesmo jogo, a regra de atirar, as setas e a tecla de tiro',
    success: 'As regras são a mecânica. Os desenhos são o tema. Você escolhe o que troca.',
    extra: 'E se você trocar o tema e desligar o tiro ao mesmo tempo?',
    goals: [
      {
        id: 'skin-only',
        label: 'Trocou o tema e as quatro regras continuaram acesas',
        pedido: 'Troque o tema para carrinho e olhe a lista de regras.',
      },
      {
        id: 'three-skins',
        label: 'Três histórias diferentes, o mesmo jogo',
        pedido: 'Passe pelos três temas.',
      },
      {
        id: 'rule-off',
        label: 'Desligando a regra de atirar, a lista mudou e o jogo mudou junto',
        pedido: 'Desligue a regra de atirar e jogue um pouco.',
      },
    ],
    hints: [
      'Troque o tema e olhe a lista de regras do lado.',
      'Passe pelos três temas e veja se alguma regra apagou.',
      'Agora desligue a regra de atirar e jogue um pouco.',
    ],
  },
  coordinates: {
    id: 'coordinates',
    group: 'stage',
    title: 'O endereço na tela',
    instruction:
      'Mude o x e veja para que lado o Dino vai. Depois mude só o y. Por último, leve o Dino para x 0 e y 0.',
    // ⚠️ Sem "480 por 270" (lote 5): a tela é a do CASO, e o Desafio abre em 800 × 480.
    manipulates: 'O x e o y do Dino na tela do jogo',
    success: 'x maior vai para a direita. y maior vai para baixo. E o 0, 0 fica no canto de cima!',
    successNoCaso: { down: 'y maior leva o Dino para baixo. O 0 do y fica lá no alto!' },
    // ⚠️ A pergunta de antes ("E se os dois forem 0?") virou a meta `origin`.
    extra: 'E se o y for igual à altura da tela? O Dino ainda aparece?',
    goals: [
      { id: 'right', label: 'x maior leva para a direita', pedido: 'Aumente só o x.' },
      { id: 'down', label: 'y maior leva para baixo', pedido: 'Aumente só o y.' },
      // ⚠️⚠️ Era `same-x` ("mesmo x, altura diferente"), que caía junto com `down` (lote 5 do Raio-X).
      // Nenhum manifesto a cobrava em `setup.goals`.
      {
        id: 'origin',
        label: 'O 0, 0 fica no canto de cima, à esquerda',
        pedido: 'Leve o Dino para x 0 e y 0.',
      },
    ],
    hints: [
      'Mexa só no x e olhe para que lado o Dino foi.',
      // ⚠️ Sem "Repare que ele não sobe": era a resposta da previsão escrita na pista, e com um
      // pronome que o elenco não flexiona.
      'Agora deixe o x parado e aumente o y. Olhe para onde o Dino vai.',
      'Diminua o x até 0. Depois diminua o y até 0.',
    ],
  },
  'screen-reader': {
    id: 'screen-reader',
    group: 'stage',
    title: 'O que o leitor de tela lê',
    instruction: 'Ouça a tela com o campo vazio. Depois escreva a sua descrição e ouça de novo.',
    manipulates: 'A descrição do jogo e o botão de ouvir a tela',
    success: 'O programa não vê o desenho. Quem conta o jogo é a sua frase!',
    extra: 'E se a frase falasse só da tecla? Daria para saber o que fazer no jogo?',
    goals: [
      {
        id: 'heard-empty',
        label: 'Sem frase, a pessoa ouve só Imagem',
        pedido: 'Aperte Ouvir a tela com o campo vazio.',
      },
      {
        id: 'says-goal',
        label: 'A frase diz o que fazer',
        pedido: 'Escreva o que se faz no jogo e aperte Ouvir a tela de novo.',
      },
      {
        id: 'says-control',
        label: 'A frase diz como jogar',
        pedido: 'Escreva também qual tecla usar e aperte Ouvir a tela de novo.',
      },
      {
        id: 'says-all-controls',
        label: 'A frase conta os três jeitos de pular',
        pedido: 'Escreva também a seta para cima e o toque na tela, e aperte Ouvir a tela de novo.',
        soNoCaso: true,
      },
    ],
    hints: [
      'Aperte Ouvir a tela antes de escrever qualquer coisa.',
      // ⚠️ A pista 2 era "o programa não enxerga o desenho", a resposta da previsão da cena.
      'Escreva o que se faz no jogo. Por exemplo: pule, corra, desvie.',
      'Escreva também a tecla. Por exemplo: apertando espaço.',
    ],
  },
  'stage-size': {
    id: 'stage-size',
    group: 'stage',
    title: 'A tela e o limite dela',
    // ⚠️ A borda PRIMEIRO, e sem "veja onde a tela acaba" (review do lote 2): a previsão pergunta se
    // dá para ver onde a tela acaba sem a borda, e a instrução fica logo acima dela.
    instruction:
      'Ligue a borda e veja o que aparece. Depois mude a largura e a altura até chegar em 480 por 270.',
    // ⚠️ "borda", e não "moldura": é o nome do botão e do bloco do Estúdio (lote 5).
    manipulates: 'Largura e altura da tela, e a borda que mostra o limite',
    success: 'A tela tem um limite, e o limite é uma escolha sua!',
    extra: 'E se a tela ficar quadrada? O que muda para quem joga?',
    goals: [
      {
        id: 'border-on',
        label: 'A borda mostra onde a tela acaba',
        pedido: 'Ligue a borda da tela.',
      },
      {
        id: 'resized',
        label: 'A borda acompanha os números',
        // ⚠️ Com a borda à vista: sem ela a tela não se vê, e o número mudaria sem nada na tela mudar.
        // ⚠️⚠️ E o MOTOR confere (lote 5): sem a borda a meta não cai, e a bancada deixa os números
        // fechados até ela aparecer.
        pedido: 'Com a borda à vista, mude a largura ou a altura.',
      },
      {
        id: 'follows',
        label: 'A borda acompanha os números',
        pedido: 'Com a borda à vista, mude a largura ou a altura.',
        soNoCaso: true,
      },
      {
        id: 'target',
        label: 'Chegou na tela de 480 por 270',
        pedido: 'Deixe a tela em 480 por 270.',
      },
    ],
    hints: [
      // ⚠️ A pista 1 dizia "sem ela a cor do fundo cobre tudo", a resposta da previsão da cena.
      'Aperte o botão da borda.',
      'Com a borda à vista, diminua a largura e olhe a borda.',
      'Deixe 480 de largura e 270 de altura, o tamanho do Corre Dino.',
    ],
  },
  'draw-loop': {
    id: 'draw-loop',
    group: 'stage',
    title: 'Por que o desenho se repete',
    // ⚠️ Os nomes dos controles do lote 5: "Desenhar o Dino: só no começo / a cada quadro" e "Limpar a
    // tela antes" (o bloco do Estúdio se chama "Limpar a tela").
    instruction:
      'Aperte Avançar 1 quadro e olhe a tela e o x do Dino. Depois desenhe o Dino a cada quadro. Por último, ligue Limpar a tela antes.',
    manipulates: 'Quando desenhar o Dino, limpar a tela antes e o relógio',
    success: 'A cada quadro o jogo limpa a tela e desenha de novo. É assim que o Dino anda!',
    extra: 'E se limpar sem desenhar? O que sobra na tela?',
    goals: [
      {
        id: 'frozen',
        label: 'Sem desenhar de novo, a tela não muda',
        // ⚠️⚠️ "Com o Dino na tela" (review do lote 2): depois de limpar SEM desenhar a tela fica vazia,
        // e o pedido antigo ("com o desenho desligado, avance") repetia um gesto que não derrubava a
        // meta. Não mudar pede alguma coisa desenhada para ficar parada.
        // ⚠️ "Aperte Avançar 1 quadro", o botão que a instrução nomeia (consertos do review da onda A do
        // lote 5): nesta cena o passo tem sempre esse nome (`sceneStepLabel`), e "deixe o tempo passar"
        // mandava procurar outro botão.
        pedido:
          'Com o Dino na tela, desenhe só no começo, sem limpar a tela, e aperte Avançar 1 quadro.',
      },
      {
        id: 'trail',
        label: 'Sem limpar, os desenhos velhos ficam',
        pedido: 'Desenhe o Dino a cada quadro, sem limpar a tela, e deixe o tempo passar.',
      },
      {
        id: 'moving',
        label: 'Limpando e desenhando, o Dino anda',
        pedido: 'Desenhe o Dino a cada quadro, ligue Limpar a tela antes e deixe o tempo passar.',
      },
    ],
    hints: [
      'Aperte Avançar 1 quadro e compare a tela com o x do Dino na faixa.',
      'Escolha desenhar a cada quadro e avance dois quadros.',
      'Ligue Limpar a tela antes e avance de novo.',
    ],
  },
  /* ── O ateliê de O Jogo do Meu Jeito, redesenhado no lote 5 do Raio-X (16/09/2026) ──────────────
     ⚠️⚠️ As cinco abaixo e as duas do fim (`fill-stroke`, `shading`) são a PONTE para o Pinta: o nome
     de cada controle é o do botão da ferramenta (Prévia, Velocidade, Espelho lado a lado,
     Preenchimento, Contorno, Sem cor) e o desenho é o da aula (a nave 32 × 32 com fogo, a pedra do
     asteroide, a folha de 64 × 32). Proposta em `analise/g4-atelie.md`. */
  frames: {
    id: 'frames',
    group: 'art',
    title: 'Dois desenhos viram movimento',
    // ⚠️⚠️ O Dino que ANDAVA entre os quadros saiu (lote 5): a Aula 3 quer o corpo parado e só o
    // fogo mudando ("se a nave inteira mexeu, desfaça"), e a cena ensinava o contrário.
    instruction:
      'Olhe o quadro 1 e o quadro 2. Depois ligue a prévia rápida, pare, e experimente devagar.',
    manipulates: 'Qual quadro aparece, a prévia tocando e a velocidade dela',
    success:
      'Cada quadro continua sendo um desenho parado. É a troca rápida que faz o fogo pulsar!',
    extra: 'E se o quadro 2 voltar a ter um fogo maior? O que muda na prévia?',
    goals: [
      {
        id: 'two-drawings',
        label: 'Com a prévia parada, olhou o quadro 1 e o quadro 2',
        pedido: 'Com a prévia parada, passe do quadro 1 para o quadro 2.',
      },
      {
        id: 'movement',
        label: 'Rápido, viu o fogo pulsar',
        pedido: 'Ponha a velocidade em 8 e deixe a prévia tocar.',
      },
      // ⭐ Lote 5: parar a prévia rápida é ver que na tela há UM quadro de cada vez, a resposta da
      // previsão. Antes a demonstração acabava com o relógio parado e a faixa dizendo "andando".
      // ⚠️ Antes do "devagar" de propósito: é a meta que responde a previsão, e em último lugar o
      // palpite só voltaria junto com a conclusão (a régua do `pedidos-no-motor`).
      {
        id: 'paused-one',
        label: 'Parou a prévia rápida e viu um quadro só',
        pedido: 'Com a prévia rápida tocando, pare a prévia.',
      },
      {
        id: 'slow-shows-two',
        label: 'Devagar, viu um quadro e depois o outro',
        pedido: 'Ponha a velocidade em 2, ligue a prévia e espere.',
      },
      {
        id: 'same-frames',
        label: 'Com os dois quadros iguais, o fogo parou de pulsar',
        pedido: 'Deixe o quadro 2 igual ao quadro 1 e ligue a prévia rápida.',
      },
    ],
    hints: [
      'Com a prévia parada, aperte Quadro 1 e Quadro 2. Olhe o que muda de um para o outro.',
      'Ponha a velocidade em 8, espere o fogo pulsar e pare a prévia.',
      'Agora ponha a velocidade em 2 e ligue a prévia. Depois deixe os dois quadros iguais e experimente a prévia rápida.',
    ],
  },
  'onion-skin': {
    id: 'onion-skin',
    group: 'art',
    title: 'O fantasma do quadro de antes',
    // ⚠️⚠️ Lote 5: a mesma nave dos quadros, e o que muda é o FOGO. O Dino andava entre os quadros e a
    // régua "passo 52" dava a medida mesmo sem o fantasma.
    instruction:
      'No quadro 2, mude o fogo com o fantasma desligado. Depois ligue o fantasma e compare os dois fogos.',
    manipulates: 'O fantasma do quadro anterior e o tamanho do fogo do quadro 2',
    success:
      'O fantasma é uma guia, não um desenho: ele deixa você comparar os dois fogos sem decorar!',
    extra: 'E no quadro 1? Tente ligar o fantasma lá e veja o que aparece.',
    goals: [
      {
        id: 'blind-move',
        label: 'Mudou o fogo 2 sem ver o fogo 1',
        pedido: 'No quadro 2, com o fantasma desligado, mude o tamanho do fogo 2.',
      },
      {
        id: 'ghost-on',
        // ⚠️⚠️ "Tracejado", e não "clarinho por baixo" (consertos do review da onda B do lote 5, A2): o
        // fantasma é o contorno do fogo 1 POR CIMA do fogo 2, e a meta afirmava o que ninguém via.
        label: 'Viu o fogo 1 tracejado no quadro 2',
        pedido: 'Vá para o quadro 2 e ligue o fantasma.',
      },
      {
        id: 'even-step',
        label: 'Com o fantasma, deixou o fogo 2 maior e dentro do quadro',
        pedido:
          'No quadro 2, com o fantasma ligado, deixe o fogo 2 um pouco maior que o fogo 1, sem passar da borda.',
      },
    ],
    hints: [
      'Vá para o quadro 2 e mude o tamanho do fogo com o fantasma desligado.',
      'Agora ligue o fantasma. O fogo tracejado é o do quadro 1.',
      'Deixe o fogo 2 um pouco maior que o fogo tracejado, sem passar da borda do quadro.',
    ],
  },
  symmetry: {
    id: 'symmetry',
    group: 'art',
    // ⚠️ O título antigo ("Um traço, dois lados") respondia a previsão logo abaixo dele.
    title: 'O que o espelho faz com o seu traço?',
    // ⚠️⚠️ Lote 5: o Espelho lado a lado do Pinta reflete sempre no MEIO do desenho, e existe também o
    // de cima e de baixo. A cena mandava mover um eixo que a ferramenta não tem.
    // ⚠️⚠️ Os dois espelhos são DUAS chaves independentes, como no Pinta (consertos do review da onda B
    // do lote 5): a cena tinha uma escolha de três, e "E se os dois estivessem ligados?" não se tentava.
    instruction:
      'Pinte a asa com os espelhos desligados. Ligue o Espelho lado a lado e pinte de novo. Depois experimente o espelho de cima e de baixo e o Balde de tinta.',
    manipulates: 'Os dois espelhos do Pinta e os traços da nave na grade',
    success:
      'Com o espelho ligado, cada traço aparece também do outro lado do meio. Desligado, fica só onde você pintou!',
    extra: 'E se os dois espelhos estivessem ligados? Onde cairiam as cópias da asa?',
    goals: [
      {
        id: 'one-side',
        label: 'Pintou com o espelho desligado',
        pedido: 'Com os dois espelhos desligados, pinte a asa.',
      },
      {
        id: 'two-sides',
        label: 'Pintou com o Espelho lado a lado',
        // ⚠️ "Só" o lado a lado e a ASA: com os dois ligados nenhuma meta cai, e a cópia da cabine
        // encosta no traço (A3).
        pedido: 'Deixe ligado só o Espelho lado a lado e pinte a asa.',
      },
      {
        // ⚠️ O id ficou (manifestos e sessões): era "mudou o eixo", e virou o segundo espelho do Pinta.
        id: 'axis-decides',
        label: 'Pintou com o espelho de cima e de baixo',
        pedido: 'Deixe ligado só o espelho de cima e de baixo e pinte a asa.',
      },
      {
        id: 'fill-ignores-mirror',
        label: 'Com o espelho ligado, o Balde encheu um lado só',
        pedido: 'Deixe ligado o Espelho lado a lado e encha a asa com o Balde de tinta.',
      },
    ],
    hints: [
      'Pinte a asa e conte quantas asas apareceram.',
      'Ligue o Espelho lado a lado e pinte a asa de novo. Olhe a grade inteira.',
      'Desligue o Espelho lado a lado, ligue o de cima e de baixo e pinte a asa. Depois experimente o Balde com o Espelho lado a lado ligado.',
    ],
  },
  'pixel-vector': {
    id: 'pixel-vector',
    group: 'art',
    title: 'De perto, a borda conta',
    // ⚠️⚠️ Lote 5: UMA lupa para as duas pedras, que têm a MESMA silhueta (a de pixel é a curva da de
    // vetor rasterizada em 16 × 16). A de pixel era um oval de outra forma, e a pedra que não estava
    // sob a lupa ficava miúda ao lado da outra.
    instruction: 'Aproxime as duas pedras bem devagar. Olhe a borda de cada uma.',
    manipulates: 'O quanto a lupa aproxima as duas pedras',
    success:
      'De longe as duas parecem a mesma pedra. De perto, a de pixel mostra os quadradinhos e a de vetor continua lisa!',
    extra: 'Qual das duas você usaria numa nave bem pequena? E numa bem grande?',
    goals: [
      {
        id: 'stairs',
        label: 'Aproximou até as bordas ficarem diferentes',
        // ⚠️ 4, e não 3 (consertos do review da onda B do lote 5, M5): em 3 a pedra parecia peneira.
        pedido: 'Deixe Aproximar em 4 vezes ou mais.',
      },
      {
        // ⚠️ O id ficou: era "de perto, o vetor continua liso", e virou os pontos da Caneta à vista.
        id: 'smooth',
        label: 'Aproximou até ver os pontos do vetor',
        pedido: 'Deixe Aproximar em 6 vezes ou mais.',
      },
      {
        id: 'alike',
        label: 'Voltou para longe e comparou de novo',
        pedido: 'Depois de aproximar, volte Aproximar para 1 ou 2 vezes.',
      },
    ],
    hints: [
      'Aproxime devagar e pare quando uma borda mudar.',
      'Continue aproximando. Olhe o que aparece na borda da pedra de vetor.',
      'Volte Aproximar para 1 vez e compare as duas de longe.',
    ],
  },
  'sheet-vs-sprite': {
    id: 'sheet-vs-sprite',
    group: 'art',
    title: 'A folha e o tamanho no jogo',
    // ⚠️⚠️ Lote 5: a folha é a da nave (64 × 32, dois quadros de 32 × 32) e a escolha é a LARGURA do
    // recorte, a que a seção da Aula 6 promete. A folha era de 64 × 64 com quatro Dinos, e a única
    // meta fechava num toque no tamanho do jogo.
    instruction:
      'Mude a largura do recorte e olhe a nave no jogo. Depois mude o tamanho no jogo e olhe a folha.',
    manipulates: 'A largura do recorte na folha da nave, o quadro recortado e o tamanho no jogo',
    success:
      'O recorte precisa ter o tamanho de UM quadro da folha. O tamanho no jogo é outra escolha!',
    extra: 'E se a folha tivesse quatro quadros de 16 por 32? Que largura de recorte você usaria?',
    goals: [
      {
        id: 'squeezed',
        label: 'Viu o jogo mostrar a folha inteira',
        pedido: 'Escolha a largura 64 e olhe o jogo.',
      },
      {
        id: 'crop-half',
        label: 'Recortou 16 e olhou o jogo',
        pedido: 'Escolha a largura 16 e olhe o jogo.',
      },
      {
        id: 'crop-whole',
        label: 'Achou o recorte que mostra uma nave inteira',
        pedido: 'Escolha a largura 32 e olhe o jogo.',
      },
      // ⚠️ O id ficou (a Aula 6 o cobra no caso); só abre DEPOIS do recorte de uma nave inteira.
      {
        id: 'size-apart',
        label: 'Mudou o tamanho no jogo e conferiu a folha',
        // ⚠️ "Bem maior ou bem menor" (consertos do review da onda B do lote 5, B8): um toque no + só
        // chegava a 62, quase a nave de fábrica, e a meta caía com a mão ainda no botão.
        pedido: 'Com o recorte de 32, deixe a nave do jogo bem maior ou bem menor e olhe a folha.',
      },
    ],
    hints: [
      'Mude a largura do recorte e olhe o que aparece no jogo.',
      'Um quadro da folha tem 32 de largura. Que recorte mostra uma nave inteira?',
      'Com o recorte de 32, deixe a nave do jogo bem maior e compare a folha com antes.',
    ],
  },
  world: {
    id: 'world',
    group: 'world',
    title: 'Criar e mostrar são duas coisas diferentes',
    instruction:
      'Primeiro, crie o Dino nos bastidores. Depois, faça o Dino aparecer na tela do jogo.',
    manipulates: 'Criar o Dino nos bastidores e mostrar o Dino na tela',
    success: 'Quando aparece na tela do jogo, é o mesmo Dino que já existia nos bastidores.',
    extra: 'Quando você tirar o Dino da tela, o Dino deixa de existir?',
    goals: [
      {
        id: 'hidden',
        label: 'O Dino existe nos bastidores',
        pedido: 'Crie o Dino nos bastidores.',
      },
      {
        id: 'visible',
        label: 'O mesmo Dino aparece na tela',
        pedido: 'Mostre o Dino na tela do jogo.',
      },
    ],
    hints: [
      'Olhe a ficha dos bastidores e a tela do jogo.',
      'Primeiro, crie o Dino nos bastidores.',
      'Depois, mostre o Dino na tela do jogo.',
    ],
  },
  layers: {
    id: 'layers',
    group: 'world',
    title: 'Quem fica na frente?',
    // ⚠️ A instrução terminava com "A última desenhada fica na frente!": a regra que a cena existe
    // para a criança descobrir, escrita logo acima da previsão.
    instruction: 'O Dino está escondido. Mude a ordem de desenhar e faça o Dino aparecer.',
    // ⚠️ É a `<desc>` do palco (lote 5): "Ordem das peças Floresta e Dino" passava por um
    // `toLowerCase()` e o leitor de tela ouvia "ordem das peças chama e dino" com o elenco.
    manipulates: 'A ordem de desenhar do Dino e da floresta',
    success: 'Só a ordem mudou: quem é desenhado por último fica por cima, e ninguém foi apagado!',
    // ⚠️ "E se a floresta voltar para o último lugar?" virou a MISSÃO 2 (lote 5 do Raio-X).
    extra: 'E se fossem três peças? Quem ficaria por cima de todas?',
    // ⚠️⚠️ Três missões, nesta ordem (lote 5 do Raio-X): o Dino aparecer, esconder de novo SÓ com a
    // ordem (o que prova que ninguém foi apagado) e voltar o Dino para a frente, que é o arranjo do
    // jogo. Um toque fechava as duas primeiras (a ação observava os dois lados da troca).
    // ⚠️⚠️ `back-in-front` é META desde o full review de experiência (16/09/2026, M4): a arrumação final
    // era uma condição ESCONDIDA do avaliador (`settled`), e a faixa dizia "Descobertas 2 de 2 ✓✓" sobre
    // uma cena que não concluía, com uma frase explicando por que 2 de 2 não bastava. Acrescentada no
    // FIM, sem renomear nada (nenhum manifesto cita as metas da `layers` em `setup.goals`).
    // ⚠️ Com `pilha: 'camadas'` os pedidos são os de `LAYERS_CAMADAS` (pilha.ts): a lista do Pinta se lê
    // ao contrário.
    goals: [
      {
        id: 'front',
        label: 'O Dino apareceu na frente',
        pedido: 'Leve o Dino para o fim da ordem de desenhar.',
      },
      {
        id: 'covered',
        label: 'Escondeu de novo só trocando a ordem',
        pedido: 'Com o Dino no fim da ordem de desenhar, leve a floresta para o fim.',
      },
      {
        id: 'back-in-front',
        label: 'No jogo, quem é desenhado por último fica na frente',
        pedido: 'Leve o Dino de novo para o fim da ordem de desenhar.',
      },
    ],
    hints: [
      'Onde está o resto do Dino?',
      // ⚠️ "Quem está embaixo é desenhado por último" diz como a LISTA se lê (de cima para baixo, como
      // os blocos do Estúdio), e não quem fica por cima no desenho.
      'Olhe a lista A ordem de desenhar. Quem está embaixo é desenhado por último.',
      'Leve o Dino para o fim da lista.',
    ],
  },
  gravity: {
    id: 'gravity',
    group: 'motion',
    title: 'Faça o Dino voltar ao chão',
    // ⚠️ "No meio do pulo" (lote 5 do Raio-X): ligar a gravidade agora age no voo que já começou.
    instruction:
      'Aqui a gravidade está desligada. Faça o Dino pular e veja até onde vai. Depois, com o Dino no ar, ligue a gravidade.',
    manipulates: 'O Dino e a ligação da gravidade',
    success: 'A gravidade puxou para baixo, a subida virou descida e o Dino voltou ao chão!',
    extra: 'E se você desligar a gravidade no meio da queda?',
    goals: [
      {
        id: 'floating',
        label: 'Sem gravidade, não parou de subir',
        pedido: 'Com a gravidade desligada, faça o Dino pular e espere.',
      },
      {
        id: 'landed',
        label: 'Com gravidade, o pulo voltou ao chão',
        // ⚠️ "No ar" (lote 5): é o gesto que mostra a gravidade agindo. Ligar e pular de novo continua
        // valendo (o motor cobra só ter visto o pulo sem gravidade antes).
        pedido: 'Com o Dino no ar, ligue a gravidade e espere.',
      },
    ],
    hints: [
      // ⚠️ A pista 1 perguntava "voltando ou subindo?" com o Dino parado no chão (a situação vem na
      // frente dela). O gesto e o número que respondem, sem a resposta.
      'Toque no Dino e olhe o número da altura. O número para de crescer?',
      'Com o Dino no ar, ligue a gravidade e olhe o que muda.',
      // ⚠️ O pulo antes (consertos do review da onda A do lote 5): o fio fica fechado até o Dino passar do
      // meio da subida sem gravidade, e a pista 3 mandava ligar um fio fechado.
      'Pule e espere o número parar de crescer. Depois ligue Gravidade ao Dino com o Dino no ar.',
    ],
  },
  impulse: {
    id: 'impulse',
    group: 'motion',
    title: 'Escolha a altura do salto',
    // ⚠️ O 14 NA instrução (review do lote 2): a previsão pergunta pelo impulso 14, e a meta que a
    // responde é a do impulso mais forte. ⚠️ "As duas marcas" (lote 5): elas ficam no palco.
    instruction:
      'Faça o Dino pular com impulso 9. Depois leve o impulso até 14 e pule de novo. Compare as duas marcas.',
    manipulates: 'O impulso do salto e o Dino',
    success: 'Com a mesma gravidade, um impulso maior fez uma marca muito mais alta!',
    // ⚠️ O caso novo da proposta do g2, para quem terminar antes: aplicar, e não repetir.
    extra: 'Agora faça um salto que passe da marca azul e fique abaixo de 150.',
    goals: [
      {
        id: 'first-height',
        label: 'Um salto chegou ao chão',
        pedido: 'Faça o Dino pular e espere o salto terminar.',
      },
      {
        id: 'other-height',
        label: 'Outro impulso, marca bem diferente',
        // ⚠️ Os DOIS impulsos no pedido (lote 5): a meta compara a marca de agora com a de antes, e
        // "leve até 14 e pule de novo" não servia a quem já tinha pulado com 14.
        pedido: 'Pule com impulso 9 e depois com impulso 14.',
      },
      {
        id: 'compare',
        label: 'Outro impulso, marca bem diferente',
        pedido: 'Pule com impulso 9 e depois com impulso 14.',
        soNoCaso: true,
      },
    ],
    hints: [
      'A marca azul é o salto de antes.',
      'Mude só o impulso. A gravidade fica igual.',
      'Leve o impulso até 14 e toque no Dino.',
    ],
  },
  'jump-sound': {
    id: 'jump-sound',
    group: 'events',
    title: 'O som acompanha o pulo',
    instruction:
      'Aperte Espaço duas vezes no mesmo pulo. Depois pule tocando no Dino. Conte os sons.',
    manipulates: 'A peça Tocar efeito, o Dino e a tecla Espaço',
    success: 'Em Quando o Dino pular, o som toca uma vez em cada pulo, por tecla ou por toque!',
    extra:
      'E se alguém abrir o seu jogo no celular e pular tocando na tela? Qual dos dois eventos toca o som?',
    // ⚠️⚠️ A missão de fábrica são TRÊS metas (lote 5 do Raio-X): o som sem pulo, o pulo sem som (o
    // outro defeito que a aula conserta, e que acontecia calado) e um som em cada pulo pelos dois
    // jeitos. As três antigas de detalhe (`quiet-air`, `key-sound`, `tap-sound`) ficam para um caso
    // (`soNoCaso`): ids não mudam, e a `every-jump` cai quando as duas de tecla e toque caíram.
    goals: [
      {
        id: 'false-sound',
        label: 'Som sem pulo',
        pedido:
          'Com Tocar efeito em Quando apertar Espaço, aperte Espaço duas vezes no mesmo pulo.',
      },
      {
        id: 'silent-jump',
        label: 'Pulo sem som',
        pedido: 'Com Tocar efeito em Quando apertar Espaço, pule tocando no Dino.',
      },
      {
        id: 'quiet-air',
        label: 'Sem pulo novo, o som esperou',
        pedido: 'Com Tocar efeito em Quando o Dino pular, aperte Espaço duas vezes no mesmo pulo.',
        soNoCaso: true,
      },
      {
        id: 'key-sound',
        label: 'Com o som no pulo, a tecla fez pulo e som',
        pedido: 'Com Tocar efeito em Quando o Dino pular, pule pela tecla Espaço.',
        soNoCaso: true,
      },
      {
        id: 'tap-sound',
        label: 'Com o som no pulo, o toque fez pulo e som',
        pedido: 'Com Tocar efeito em Quando o Dino pular, pule tocando no Dino.',
        soNoCaso: true,
      },
      {
        id: 'every-jump',
        label: 'Um som em cada pulo, por tecla e por toque',
        pedido:
          'Leve Tocar efeito para Quando o Dino pular. Depois pule pela tecla Espaço e tocando no Dino.',
      },
    ],
    hints: [
      'Aperte Espaço duas vezes no mesmo pulo. Conte os ♪.',
      'Agora pule tocando no Dino. Tocou som?',
      'Leve Tocar efeito para Quando o Dino pular e teste os dois jeitos.',
    ],
  },
  spawn: {
    id: 'spawn',
    group: 'population',
    title: 'Abra espaço entre os cactos',
    // ⚠️ "▶ Tempo" (lote 5 do Raio-X): o relógio da cena é o ▶, e "o relógio" é onde a peça mora.
    // Eram dois relógios com o mesmo nome na mesma frase.
    instruction:
      'Aperte ▶ Tempo e veja os cactos nascerem. Depois leve Criar cacto para dentro do relógio e compare.',
    manipulates: 'A peça Criar cacto, o relógio e o intervalo',
    success: 'Com o relógio, nasce um cacto de cada vez e sobra espaço entre um cacto e outro!',
    extra: 'E se o relógio esperar um pouco mais entre dois cactos?',
    goals: [
      {
        id: 'every-frame',
        label: 'Viu a parede de cactos',
        pedido: 'Com Criar cacto em A cada quadro, deixe o tempo passar um segundo inteiro.',
      },
      {
        id: 'with-timer',
        label: 'Com o relógio, sobrou espaço entre os cactos',
        // ⚠️ "até nascerem dois", e não "dois segundos": com o intervalo de 2 s, dois segundos
        // davam UM nascimento, e a meta pede dois.
        pedido:
          'Leve Criar cacto para dentro do relógio e deixe o tempo passar até nascerem dois cactos.',
      },
      {
        id: 'same-fall',
        label: 'Com mais pedras nascendo, cada pedra desce na mesma velocidade',
        pedido: 'Troque o relógio de 40 para 20 e compare quanto cada pedra desceu em 60 quadros.',
        soNoCaso: true,
      },
    ],
    hints: [
      'Veja quantos cactos nascem enquanto o tempo passa.',
      'Compare o mesmo tempo com e sem o relógio.',
      'Leve Criar cacto para dentro do relógio e deixe o tempo passar até nascerem dois cactos.',
    ],
  },
  cleanup: {
    id: 'cleanup',
    group: 'population',
    // ⚠️ O título antigo ("Cuide dos cactos invisíveis") respondia a previsão ("some do jogo?").
    title: 'Para onde vai o cacto que sai da tela?',
    instruction:
      'Aperte ▶ Tempo e veja um cacto sair da tela. Olhe os bastidores. Depois ligue Tirar do grupo quem sair da tela e compare.',
    manipulates: 'A regra Tirar do grupo quem sair da tela e o tempo',
    success: 'Sair da tela não tira ninguém do grupo: quem tira é a regra!',
    extra: 'E se você desligar a regra e deixar outros cactos saírem?',
    goals: [
      {
        id: 'invisible-stored',
        label: 'Saiu da tela e ficou no grupo',
        pedido: 'Deixe o tempo passar até dois cactos saírem da tela.',
      },
      {
        id: 'rule-removes',
        label: 'A regra tirou do grupo quem saiu',
        // ⚠️ O nome da CHAVE da bancada (lote 5 do Raio-X), que é o do bloco do Estúdio. Eram cinco
        // nomes para uma regra: "limpeza", "Remover do grupo → Saída da tela", "Encaixe Remover",
        // "Retirar regra" e "remoção na saída".
        pedido: 'Ligue Tirar do grupo quem sair da tela e deixe o tempo passar até dois saírem.',
      },
    ],
    hints: [
      'Olhe a prateleira dos bastidores quando um cacto sai.',
      // ⚠️ "Sair da tela não é sair do grupo" era a conclusão (consertos do review da onda A do lote 5).
      'Conte os cactos da prateleira depois que um cacto sai.',
      'Ligue Tirar do grupo quem sair da tela e aperte ▶ Tempo de novo.',
    ],
  },
  'game-state': {
    id: 'game-state',
    group: 'events',
    // ⚠️ O título antigo ("O relógio espera você começar") puxava para a resposta ERRADA da previsão.
    title: 'O relógio no início',
    // ⚠️⚠️ A peça é Criar cacto, DENTRO do relógio (lote 5 do Raio-X): na cena o Relógio entrava no
    // Se, e no Estúdio, logo depois, é o Se que entra no relógio ("mova a criação do cacto para
    // dentro dele"). E "▶ Tempo" para o relógio da cena não ter o mesmo nome da peça.
    instruction:
      'Aperte ▶ Tempo no início. Nascem cactos? Depois leve Criar cacto para dentro de Se o estado do jogo é jogando e compare.',
    manipulates: 'A peça Criar cacto, a caixa Se o estado do jogo é jogando e o começo da partida',
    success: 'Dentro do Se, Criar cacto espera no início e volta a criar na partida!',
    extra: 'E se você voltar ao início depois de jogar?',
    goals: [
      {
        id: 'outside',
        label: 'Nasceram cactos antes de começar',
        pedido: 'No início, com Criar cacto fora do Se, deixe o tempo passar.',
      },
      {
        id: 'waiting',
        label: 'No início, nada nasceu por 2 segundos',
        pedido:
          'Leve Criar cacto para dentro de Se o estado do jogo é jogando e deixe o tempo passar 2 segundos no início.',
      },
      {
        id: 'playing',
        label: 'Jogando, voltou a nascer',
        pedido: 'Com Criar cacto dentro do Se, comece a partida e deixe o tempo passar.',
      },
    ],
    hints: [
      // ⚠️ "Por que há cactos antes de você começar?" respondia a previsão ("nascem cactos no
      // início?"), e a pista pode ser lida antes do palpite.
      'Aperte ▶ Tempo no início e conte os cactos que aparecem.',
      'O que fica dentro do Se só acontece durante a partida.',
      'Leve Criar cacto para dentro de Se o estado do jogo é jogando. Compare o início e a partida.',
    ],
  },
  controls: {
    id: 'controls',
    group: 'events',
    title: 'O convite para começar',
    // ⚠️ O convite diz os DOIS caminhos (lote 5 do Raio-X): a instrução e a pista 1 falavam de dois
    // caminhos, e o desenho dizia só "Toque para começar".
    instruction: 'A tela promete dois jeitos de começar. Teste os dois.',
    manipulates: 'A tela de início e a peça Começar',
    success: 'Agora os dois jeitos que o convite promete começam a partida!',
    extra:
      'E se o convite dissesse só “Toque para começar”? Quem usa Enter saberia que também pode jogar?',
    // ⚠️⚠️ Sem o fio (lote 5 do Raio-X): Começar é uma PEÇA que muda de evento, o gesto do Estúdio da
    // seção seguinte ("mova o mesmo Se para Quando apertar qualquer tecla ou tocar"). Ela fica à
    // vista desde a abertura, então nenhum pedido depende de outra meta.
    goals: [
      {
        id: 'missing-touch',
        label: 'É o mesmo que aconteceu no seu jogo: tocou e nada aconteceu',
        pedido: 'Com Começar em Quando apertar a tecla, toque na tela de início.',
      },
      {
        id: 'start-tap',
        label: 'Começou tocando',
        pedido:
          'Leve Começar para Quando apertar qualquer tecla ou tocar na tela, e toque na tela de início.',
      },
      {
        id: 'start-key',
        label: 'Começou com Enter',
        pedido: 'Na tela de início, aperte Enter.',
      },
    ],
    hints: [
      // ⚠️ O desenho só mostra o toque, e "Os dois funcionam?" já sugeria que não.
      'Toque na tela de início e olhe se ela muda.',
      'Olhe em que caixa está a peça Começar.',
      'Leve Começar para Quando apertar qualquer tecla ou tocar na tela. Teste os dois jeitos, voltando ao início.',
    ],
  },
  restart: {
    id: 'restart',
    group: 'events',
    title: 'Jogue outra vez',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X (16/09/2026): a pista tem VÁRIOS cactos, e o gesto é o do
    // jogo (tocar na tela). O que muda é o que o toque faz no FIM, e a pista mostra a diferença. A
    // cena antiga nunca mostrava o contraste do título ("Recomeçar é só trocar de tela?").
    instruction:
      'Jogue até bater. No fim, toque na tela. Depois troque o que o toque faz e jogue de novo.',
    manipulates: 'O toque na tela, o que o toque faz no fim e os cactos da pista',
    // ⚠️ Sem "pontos": esta cena não tem placar, e a Aula 9 vem antes de o placar existir.
    success: 'A pista começou limpa. Isso é jogar de novo de verdade!',
    extra: 'E se você trocar para Mudar o estado do jogo para inicio de novo? A pista fica como?',
    goals: [
      {
        id: 'ended',
        label: 'A batida levou para o fim',
        pedido: 'Toque na tela e deixe o tempo passar.',
      },
      {
        id: 'screen-only',
        label: 'Só trocar de tela deixou os cactos na pista',
        pedido:
          'No fim, com Mudar o estado do jogo para inicio escolhido, toque na tela duas vezes.',
      },
      {
        id: 'clean-track',
        label: 'Reiniciar começou com a pista limpa',
        // ⚠️ A comparação é obrigatória: o motor só dá esta meta depois de `screen-only`.
        pedido:
          'Depois de jogar de novo com Mudar o estado do jogo para inicio, escolha Reiniciar o jogo e, no fim, toque na tela duas vezes.',
      },
      {
        id: 'back-to-menu',
        label: 'Reiniciar levou para a abertura, e foi preciso outro Enter para jogar',
        pedido:
          'Escolha Reiniciar o jogo, aperte Enter no fim e depois aperte Enter de novo para jogar.',
        soNoCaso: true,
      },
    ],
    hints: [
      'Olhe a pista depois de voltar para o início. Quantos cactos ficaram?',
      'Troque o que o toque faz no fim e compare as duas pistas.',
      // ⚠️ A comparação na ordem (consertos do review da onda A do lote 5): a pista 3 mandava direto ao
      // Reiniciar, o atalho que não conta sem ter visto a pista herdada.
      'Primeiro jogue com Mudar o estado do jogo para inicio e olhe a pista. Depois escolha Reiniciar o jogo e compare.',
    ],
  },
  hitbox: {
    id: 'hitbox',
    group: 'collision',
    title: 'Onde a batida acontece?',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: a cena abre com a área GRANDE (100%), como o jogo da Aula
    // 10 antes do conserto, e o gesto é DIMINUIR até 80%. A cena antiga aumentava a área, na direção
    // contrária à da aula, e em largura absoluta, enquanto o Estúdio fala em porcentagem.
    // ⚠️⚠️ Sem "olhe o espaço entre os desenhos" (consertos do review da onda A do lote 5): a instrução
    // fica logo acima da previsão ("antes ou só quando os desenhos se encostarem?") e dizia que haveria
    // espaço entre eles no BATEU. Olhar o vão fica para a pista, depois do BATEU.
    instruction:
      'Traga o cacto um toque de cada vez até aparecer BATEU. Depois deixe o cacto no lugar e mude só o tamanho da área do Dino, para baixo e para cima.',
    manipulates: 'A Distância do cacto e o Tamanho da área do Dino',
    success:
      'O Dino ficou do mesmo tamanho o tempo todo. Quem mandou na batida foi a área, e o tamanho dela é escolha sua.',
    extra: 'Com a área em 80%, traga o cacto de novo. Quando aparece BATEU agora?',
    goals: [
      {
        id: 'contact',
        label: 'BATEU com os desenhos ainda longe',
        // ⚠️⚠️ Um toque de cada vez (review do lote 2): de 10 em 10 a batida aparece em 50, com um vão
        // de 10 entre os desenhos. Trazer o cacto até em cima do Dino não mostra vão nenhum.
        pedido: 'Aproxime o cacto do Dino com a Distância do cacto, um toque de cada vez.',
      },
      {
        id: 'early-hit',
        label: 'BATEU com os desenhos ainda longe',
        pedido: 'Com a área em 100%, aproxime o cacto com a Distância do cacto até aparecer BATEU.',
        soNoCaso: true,
      },
      {
        id: 'area-contrast',
        label: 'Área menor, mesmo lugar: a batida sumiu',
        // ⚠️ "Sem mexer na Distância", e não "parado", que não concorda com a pedra.
        pedido: 'Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino.',
      },
      {
        id: 'fair-hit',
        label: 'Área menor, mesmo lugar: a batida sumiu',
        pedido: 'Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino até 80%.',
        soNoCaso: true,
      },
      {
        id: 'too-small',
        label: 'Os desenhos se tocam, e o jogo disse que não bateu',
        pedido: 'Encoste o cacto no desenho do Dino e deixe o Tamanho da área do Dino em 40%.',
      },
    ],
    hints: [
      // ⚠️ "Olhe os dois desenhos", e não "olhe o espaço entre eles": era o que a criança ia ver.
      'Aproxime o cacto um toque de cada vez e olhe os dois desenhos quando aparecer BATEU.',
      'Deixe o cacto onde bateu. Mude só a área do Dino.',
      'Agora encoste o cacto no desenho do Dino e leve o Tamanho da área do Dino para 40%. Olhe se aparece BATEU.',
    ],
  },
  score: {
    id: 'score',
    group: 'events',
    // ⚠️ O título antigo ("Pontos só durante a partida") respondia a previsão.
    title: 'Quando o placar cresce?',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: a criança VÊ o erro primeiro (a peça solta soma até no
    // início) e só depois muda a peça de lugar. Antes dava para pôr a peça certa logo de cara e
    // conferir três telas já certas.
    // ⚠️ Sem "em qual o placar não devia crescer?" (consertos do review da onda A do lote 5): a
    // pergunta pressupunha que o placar cresce onde não devia, logo acima da previsão sobre isso.
    instruction:
      'Ponha Somar ponto em cada lugar e olhe o placar. Depois passe pelas três telas: início, jogando e fim.',
    manipulates: 'Peça Somar ponto, os relógios, o estado do jogo é jogando ? e a próxima tela',
    success: 'Onde a peça mora decide duas coisas: quantas vezes por segundo, e em quais telas.',
    extra: 'E se você voltar ao início? Veja se o placar continua parado.',
    goals: [
      {
        id: 'score-runaway',
        label: 'No quadro, o placar disparou: 60 por segundo',
        pedido:
          'Ponha Somar ponto dentro do A cada quadro do jogo e deixe passar um segundo inteiro.',
      },
      {
        id: 'score-idle-wrong',
        label: 'Solto, o placar cresceu no início',
        pedido: 'Com Somar ponto solto, deixe o tempo passar na tela de início.',
      },
      {
        id: 'score-start',
        label: 'Dentro do Se, o início esperou',
        // ⚠️ É COMPARAÇÃO: o motor só dá esta meta depois de a peça solta ter somado no início.
        // ⚠️ Mais curto (consertos do review da onda A do lote 5): o "Conferir" devolvia 25 palavras.
        pedido:
          'Com a peça solta, deixe o tempo passar no início. Depois leve Somar ponto para o bloco “o estado do jogo é jogando ?” e espere de novo.',
      },
      {
        id: 'score-waiting',
        label: 'Dentro do Se de jogando, o início esperou',
        pedido: 'Leve Somar ponto para dentro do Se e deixe o tempo passar na tela de início.',
        soNoCaso: true,
      },
      {
        id: 'score-playing',
        label: 'Pontos aumentam jogando',
        pedido:
          'Com Somar ponto dentro do Se, aperte Próxima tela até Jogando e deixe o tempo passar.',
      },
      {
        id: 'score-end',
        label: 'No fim, o placar parou no valor',
        // ⚠️⚠️ É COMPARAÇÃO desde os consertos do review da onda A do lote 5 (A6): dois toques em
        // "Próxima tela" levavam ao Fim com o placar em 0, e a meta afirmava que ele "parou".
        pedido:
          'Depois de ver os pontos crescerem jogando, aperte Próxima tela até Fim e deixe o tempo passar.',
      },
      {
        id: 'score-kept',
        label: 'No fim, o placar parou no valor',
        pedido:
          'Depois de ver os pontos crescerem jogando, aperte Próxima tela até Fim e deixe o tempo passar.',
        soNoCaso: true,
      },
    ],
    hints: [
      'Com a peça solta, o placar deve crescer antes de começar?',
      'Compare o placar das três telas na fileira embaixo do palco.',
      // ⚠️ O erro primeiro (consertos do review da onda A do lote 5): a pista 3 pulava a peça solta, que
      // é a meta obrigatória que abre a cena.
      'Compare Somar ponto em A cada quadro do jogo e A cada 1 segundos. Depois leve a peça para o estado do jogo é jogando ? e passe pelas três telas.',
    ],
  },
  lives: {
    id: 'lives',
    group: 'events',
    // ⚠️ O título antigo ("Ponto e vida mudam por motivos diferentes") era a explicação da cena.
    title: 'O que a batida muda?',
    // ⚠️⚠️ O PONTO primeiro (review do lote 2): ligando os dois fios e batendo três vezes, a partida
    // acabava com o placar em 0, e depois do fim o relógio não soma. A meta que responde a previsão
    // (`points-stay`, os pontos ficam na batida) ficava impossível para quem seguia a instrução.
    // ⚠️⚠️ Sem "fio" (full review de experiência, M8): a bancada virou a PEÇA QUE MUDA DE CAIXA, o gesto do
    // Estúdio que o Desafio usa um dia antes. Os pedidos dizem para que caixa levar cada peça.
    instruction:
      'Leve Somar ponto para Enquanto tem vida e deixe o tempo passar. Depois leve Perder uma vida para Quando bater e bata no cacto.',
    manipulates: 'A peça Somar ponto, a peça Perder uma vida e as batidas',
    success: 'Ponto e vida são duas contagens separadas: cada uma muda pelo seu próprio motivo!',
    extra: 'E se a batida tirasse ponto em vez de vida? O jogo ficaria justo?',
    goals: [
      {
        id: 'life-lost',
        label: 'A batida tirou uma vida',
        pedido: 'Leve Perder uma vida para Quando bater e bata no cacto.',
      },
      {
        id: 'points-stay',
        label: 'Os pontos ficaram, mesmo perdendo vida',
        pedido:
          'Leve Somar ponto para Enquanto tem vida e deixe o tempo passar. Depois bata no cacto com Perder uma vida em Quando bater.',
      },
      {
        id: 'over',
        label: 'Sem vidas, a partida acabou.',
        pedido: 'Com Perder uma vida em Quando bater, bata até não sobrar nenhuma vida.',
      },
    ],
    hints: [
      'Leve Somar ponto para Enquanto tem vida e deixe o tempo passar para o placar subir.',
      'Agora leve Perder uma vida para Quando bater e bata uma vez. Olhe as duas contagens.',
      'Bata as três vezes e veja o que acontece quando a última vida sai.',
    ],
    // ⚠️⚠️ Sem "fio" nas falas (lote 5 do Raio-X): na demonstração a bancada não aparece, e as
    // quatro legendas falavam de fios que a criança nunca via. O Desafio tem roteiro PRÓPRIO, com o
    // ponto pelo acerto do tiro (dia-4).
  },
  random: {
    id: 'random',
    group: 'speed',
    title: 'Cada cacto pode nascer diferente',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: sorteio DE VERDADE, um de cada vez. Eram quatro exemplos
    // fixos (500 e 560, −5 e −6), e a cena que pergunta se o lugar pode repetir nunca repetia.
    instruction:
      'Sorteie o lugar algumas vezes e olhe as marquinhas. Depois sorteie a velocidade e veja qual cacto chega mais longe.',
    manipulates: 'Sorteio do lugar e sorteio da velocidade, com as marquinhas e as raias',
    success: 'Cada sorteio saiu dentro dos limites que você deu, e às vezes repetiu!',
    extra: 'Sorteie a velocidade mais vezes. Algum cacto passa do de −6?',
    goals: [
      {
        id: 'positions',
        label: 'Saíram lugares diferentes',
        // ⚠️ "Até sair um lugar diferente" (consertos do review da onda A do lote 5): "três vezes", com
        // sete lugares, dava o MESMO lugar três vezes em 1 de cada 49, e a criança lia o pedido de novo.
        pedido: 'Aperte Sortear lugar até sair um lugar diferente.',
      },
      {
        id: 'repeat',
        label: 'Um lugar repetiu',
        // ⚠️ Oito vezes, e não "até repetir": são sete lugares, então oito sorteios repetem com
        // certeza, e o pedido não conta o resultado.
        pedido: 'Aperte Sortear lugar mais oito vezes.',
      },
      {
        id: 'above',
        label: 'A régua fica acima da tela: a pedra nasce do lado de fora e entra caindo',
        pedido: 'Deixe o tempo passar até a primeira pedra entrar na tela.',
        soNoCaso: true,
      },
      {
        id: 'velocities',
        label: 'O cacto −6 chegou mais longe que o −5',
        pedido: 'Aperte Sortear velocidade até sair um cacto −5 e um −6.',
      },
    ],
    hints: [
      'A régua mostra onde um cacto pode nascer, depois da borda da tela.',
      'Sorteie uma coisa por vez: primeiro o lugar, depois a velocidade.',
      'Aperte Sortear lugar muitas vezes. Depois aperte Sortear velocidade e compare as raias.',
    ],
  },
  acceleration: {
    id: 'acceleration',
    group: 'speed',
    title: 'Acelere com um limite',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: UM relógio só, o do Estúdio ("a cada 5 segundos"), e cada
    // passo faz nascer um cacto numa fileira com o número colado nele. Eram dois relógios (o ▶ movia
    // os cactos, "Avançar o relógio" mudava a base), e uma placa que PRENDIA a base em −9.
    instruction:
      'Aperte Passar 5 segundos várias vezes e olhe a velocidade de cada cacto novo. O que acontece quando a base chega em −9?',
    manipulates: 'O relógio de 5 segundos, a condição Se velocidade > −9 e a fileira de cactos',
    success:
      'A base parou em −9, e mesmo assim um cacto saiu com −10. O sorteio vem depois da base!',
    extra: 'Desligue a condição de novo. Até onde a base vai?',
    goals: [
      {
        id: 'base-limit',
        label: 'A base parou em −9',
        pedido: 'Com a condição ligada, aperte Passar 5 segundos cinco vezes.',
      },
      {
        id: 'variation-limit',
        label: 'Mesmo parada em −9, saiu um cacto −10',
        // O sorteio pode repetir: a criança continua até aparecer o caso procurado.
        pedido:
          'Com a base em −9 e a condição ligada, aperte Passar 5 segundos até nascer um cacto −10.',
      },
      {
        id: 'spawned-ten',
        label: 'Mesmo com a base parada em −9, nasceu um cacto −10',
        pedido:
          'Com a base no −9 e a condição ligada, aperte Passar 5 segundos até nascer um cacto −10.',
        soNoCaso: true,
      },
      {
        id: 'old-speed',
        label: 'Os cactos velhos não mudaram de número',
        pedido: 'Aperte Passar 5 segundos três vezes e olhe o número embaixo de cada cacto.',
      },
      {
        id: 'past-limit',
        label: 'Sem a condição, a base passou de −9',
        pedido: 'Desligue a condição e aperte Passar 5 segundos cinco vezes.',
      },
    ],
    hints: [
      'Olhe o número embaixo de cada cacto da fileira.',
      'Passe 5 segundos até a conta da base dizer não.',
      // ⚠️ Sem "até sair um −10" (consertos do review da onda A do lote 5): é a resposta da previsão.
      'Com a base parada em −9, passe mais 5 segundos algumas vezes e olhe o número de cada cacto novo.',
    ],
  },
  /* ── O núcleo do Iniciante 2D (15/09/2026) ─────────────────────────────────────────────── */
  velocity: {
    id: 'velocity',
    group: 'motion',
    // ⚠️ Sem adjetivo preso ao personagem: "andar" não é verbo de ligação, então a régua do
    // elenco não flexiona o que vem depois dele — uma turma de nave lia "a nave andar sozinho".
    title: 'O que move o Dino a cada quadro',
    // ⚠️ A missão de FÁBRICA é a do eixo do lado (`down`/`up` são metas só de caso), e a
    // instrução nomeia a velocidade: "a velocidade" sozinha não diz qual das duas da bancada.
    instruction:
      'Escolha uma velocidade para o lado e deixe o tempo passar. Depois experimente um número negativo.',
    manipulates: 'Velocidade do Dino nos dois eixos, e o relógio',
    success: 'A posição muda sozinha porque a velocidade é somada nela em cada quadro!',
    extra: 'E se a velocidade for zero enquanto o relógio continua andando?',
    goals: [
      {
        id: 'moves',
        label: 'A posição mudou sozinha, com o relógio',
        pedido: 'Escolha uma velocidade diferente de zero e deixe o tempo passar.',
      },
      {
        id: 'left',
        label: 'Velocidade negativa levou para a esquerda',
        pedido: 'Ponha um número negativo na velocidade para o lado e deixe o tempo passar.',
      },
      {
        id: 'stopped',
        label: 'Com velocidade zero, o Dino fica parado',
        // ⚠️ O pedido não pode contar o resultado: é exatamente o que a previsão antiga perguntava.
        // ⚠️ "Depois de ver o Dino andar": mexer no número sem o tempo passar não conta, e a meta é
        // uma comparação com o que andou.
        pedido:
          'Depois de ver o Dino andar, ponha as duas velocidades em zero e deixe o tempo passar.',
      },
      {
        id: 'still',
        label: 'Com velocidade zero, o personagem fica no lugar',
        pedido:
          'Depois de ver o personagem andar, ponha as duas velocidades em zero e deixe o tempo passar.',
        soNoCaso: true,
      },
      // ⚠️ As duas do eixo de CIMA E BAIXO nasceram para o Dia 2 do Desafio, onde o tiro sobe: o
      // caso cobrava `left`, e a instrução mandava mexer na velocidade para baixo. Cada uma só cai
      // com o personagem andando naquele sentido (ver o relógio da `velocity` no motor), e as
      // duas são SÓ DE CASO: a missão de fábrica continua sendo a do lado.
      // ⚠️⚠️ `up` ANTES de `down` (review do lote 2): no Dia 2 a previsão pergunta pelo −9 e é
      // respondida por `up`. Em último lugar ela só voltava junto com a conclusão. E os dois pedidos
      // não supõem ordem ("Agora troque… de novo" dizia que o positivo vinha antes).
      {
        id: 'up',
        label: 'Velocidade negativa levou para cima',
        soNoCaso: true,
        pedido: 'Ponha a velocidade para baixo num número negativo e deixe o tempo passar.',
      },
      {
        id: 'down',
        label: 'Velocidade positiva levou para baixo',
        soNoCaso: true,
        pedido: 'Ponha a velocidade para baixo num número positivo e deixe o tempo passar.',
      },
    ],
    hints: [
      // ⚠️ Os DOIS números: a pista é a do modelo, e um caso que cobra o eixo de cima e baixo sem
      // escrever pistas próprias mandaria a criança olhar o x com a nave descendo.
      'Escolha uma velocidade. Depois deixe o tempo passar e olhe o número de x na faixa.',
      'A velocidade não move nada sozinha: quem move é o relógio, um quadro de cada vez.',
      'Ponha a velocidade para o lado em −5 e deixe o tempo passar.',
    ],
  },
  'hold-vs-press': {
    id: 'hold-vs-press',
    group: 'events',
    title: 'Apertar uma vez, ou segurar',
    // ⭐⭐ Lote 5 do Raio-X (G5): UMA tecla, ligada às duas raquetes. Eram dois botões ("Apertar uma
    // vez" e "Segurar a tecla"), e a criança saía achando que eram duas teclas.
    instruction: 'Toque a tecla bem rápido. Depois segure a tecla e conte até três.',
    manipulates: 'A tecla, que as duas raquetes escutam',
    success: 'Apertar acontece uma vez. Estar apertada vale enquanto você segura!',
    extra: 'E se você segurar por mais tempo ainda?',
    goals: [
      {
        id: 'one-step',
        label: 'Toque rápido: a de cima deu um passo',
        pedido: 'Toque a tecla bem rápido e solte.',
      },
      {
        id: 'while-held',
        label: 'Segurando, a de baixo não parou de andar',
        // ⚠️ "Conte até três": a meta pede três quadros com a tecla segurada (0,75 s).
        pedido: 'Segure a tecla e conte até três.',
      },
      {
        id: 'apart',
        // ⚠️⚠️ Mudou de sentido (lote 5): era "no mesmo tempo, as duas em lugares diferentes", que pedia a
        // de baixo PASSAR a de cima e não caía com o rótulo verdadeiro na tela. Nenhum manifesto a cita.
        label: 'Segurando, a de cima deu um passo só',
        pedido: 'Segure a tecla, conte até três e solte.',
      },
    ],
    hints: [
      'Toque a tecla rápido e olhe as duas raquetes.',
      'Agora segure a tecla. A de cima anda de novo?',
      'Segure a tecla e conte até três antes de soltar.',
    ],
  },
  variable: {
    id: 'variable',
    group: 'events',
    title: 'Guardar, mudar e mostrar',
    instruction: 'Guarde um número na caixa. Mude o número sem mostrar. Só depois ligue o mostrar.',
    manipulates: 'O número guardado, a soma e o mostrar na tela',
    success: 'São três coisas diferentes: guardar, mudar e mostrar!',
    extra: 'E se você mostrar primeiro e mudar depois?',
    goals: [
      { id: 'stored', label: 'A caixa guardou um número', pedido: 'Guarde um número na caixa.' },
      // ⚠️ Os nomes dos BLOCOS do desenho (consertos do review da onda A do lote 5): a bancada dizia
      // "Somar 1 ponto" e "Mostrar na tela" embaixo de "Somar em pontos" e "Mostrar placar".
      {
        id: 'changed-hidden',
        label: 'Mudou o valor sem estar na tela',
        pedido: 'Depois de guardar, aperte Somar 1 em pontos com Mostrar placar desligado.',
      },
      {
        id: 'shown',
        label: 'Mostrar não mudou o valor guardado',
        pedido: 'Depois de guardar, ligue Mostrar placar.',
      },
    ],
    hints: [
      // ⚠️ A pista 1 mandava somar ANTES de guardar, gesto que não conta. A 2 era a explicação.
      'Guarde um número na caixa. Depois some pontos e olhe: a tela mudou?',
      'Guarde um número e aperte Somar 1 em pontos. Olhe a caixa e a tela antes de ligar Mostrar placar.',
      'Guarde 0, some 1 três vezes com o mostrar desligado, e só então ligue o mostrar.',
    ],
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: os números têm a HISTÓRIA do jogo do Desafio ("Criar
    // variável pontos, valor 0", cada acerto soma 1, "Mostrar placar"), e os três blocos acendem no
    // palco. Era guardar 10 e somar 5, números sem história, com a caixa "Observe a montagem" vazia.
    // ⚠️ `scene` nas três partes: o gesto aparece no DESENHO (os blocos e os acertos), não na bancada.
  },
  'group-loop': {
    id: 'group-loop',
    group: 'population',
    // ⭐⭐ Lote 5 do Raio-X (G5): as distâncias ficam ESCONDIDAS até medir, e são parecidas (118, 112 e
    // 125). Antes elas estavam escritas embaixo dos cactos e cada cacto ficava a uma distância da torre
    // proporcional ao número: dava para escolher o mais perto sem medir nenhum.
    title: 'Qual deles está mais perto?',
    instruction:
      'Meça cada cacto e escolha o mais perto. Depois ligue o laço e deixe o tempo passar.',
    manipulates: 'Medir cada cacto, escolher um e o laço',
    success: 'Para achar o mais perto, é preciso medir todos. O laço mede todos, em todo quadro!',
    extra: 'E se dois cactos ficarem à mesma distância da torre?',
    goals: [
      {
        id: 'looked-all',
        label: 'Mediu os três antes de escolher',
        pedido: 'Aperte Medir em cada cacto do grupo.',
      },
      {
        id: 'nearest',
        label: 'Escolheu o mais perto depois de medir',
        // ⚠️ "cada cacto" e "o cacto": "os três" e "o de menor" não concordam com a pedra.
        pedido: 'Depois de medir cada cacto do grupo, escolha o cacto de menor distância.',
      },
      {
        id: 'auto',
        // ⚠️⚠️ Lote 5: cai quando o laço TROCA a escolha sozinho, e não no ato de ligar.
        label: 'Com o laço, a escolha mudou sozinha quando outro chegou mais perto',
        // ⚠️ "Por 3 segundos": o mais perto troca de dono a cada 2,5 s no máximo (`HUNT_SWING`).
        pedido: 'Ligue o laço e deixe o tempo passar por 3 segundos.',
      },
    ],
    hints: [
      'Nenhum cacto tem número ainda. Meça um.',
      'Só dá para saber o menor comparando os três números.',
      'Meça o 1º, o 2º e o 3º. Depois escolha o menor número.',
    ],
  },
  'enemy-type': {
    id: 'enemy-type',
    group: 'population',
    // ⚠️ "Uma ficha, muitos cactos" soprava a resposta, e com a pedra virava "muitos pedras".
    title: 'A ficha dos cactos',
    // ⭐⭐ Lote 5 do Raio-X (G5): os cactos ANDAM com a velocidade da ficha e têm os corações da vida em
    // cima. E a cópia ao nascer, que liga esta cena à `acceleration` do Corre Dino.
    instruction:
      'Faça nascer três cactos e olhe os cactos andarem. Depois mude a velocidade na ficha.',
    manipulates: 'A ficha (velocidade e vida), o nascimento de mais um e a cópia ao nascer',
    success: 'Quem lê a ficha muda junto com ela. Quem copiou ao nascer fica como era!',
    extra: 'E se você mudar a vida com a cópia ligada?',
    goals: [
      {
        id: 'many',
        label: 'Nasceram três cactos da mesma ficha',
        pedido: 'Aperte Fazer nascer mais um três vezes.',
      },
      {
        id: 'all-change',
        // ⚠️⚠️ Lote 5: cai no quadro DEPOIS da mudança, com dois cactos que já andavam na tela.
        label: 'Mudou a ficha e os cactos que já andavam mudaram juntos',
        pedido: 'Faça nascer mais de um cacto, mude a velocidade na ficha e deixe o tempo passar.',
      },
      {
        id: 'copied',
        label: 'Copiando ao nascer, só os novos mudaram',
        pedido:
          'Ligue Copiar a ficha ao nascer, mude a velocidade na ficha, faça nascer mais um cacto e deixe o tempo passar.',
      },
    ],
    hints: [
      'Você tem uma ficha com dois números. Faça nascer três cactos dela.',
      // ⚠️ A pista 2 era a explicação da cena.
      // ⚠️ "em cima" (consertos do review da onda B do lote 5): o número fica em cima de cada cacto.
      'Mude a velocidade na ficha e olhe o número em cima de cada cacto.',
      'Aperte Fazer nascer mais um três vezes e depois mude a velocidade para 7.',
    ],
  },
  camera: {
    id: 'camera',
    group: 'stage',
    // ⚠️ "A tela é uma janela" era a resposta do "Agora explique".
    title: 'Até onde o Dino pode ir?',
    // ⭐⭐ Lote 5 do Raio-X (G5): o mundo tem MARCOS (árvores, uma pedra e a bandeira no fim), e o Dino
    // anda com o gesto "Andar", em vez de teleportar pelo deslizante.
    instruction: 'Leve o Dino até a bandeira. Depois faça a câmera seguir o Dino e ande de novo.',
    manipulates: 'Andar com o Dino pelo mundo e a câmera que segue',
    success: 'A tela é uma janela: a câmera leva a janela junto com o Dino!',
    extra: 'E se o Dino voltar para o começo do mundo?',
    goals: [
      {
        id: 'lost',
        label: 'Sem a câmera, o Dino saiu da tela',
        pedido: 'Com a câmera parada, leve o Dino para depois de 480.',
      },
      {
        id: 'follows',
        label: 'Com a câmera seguindo, o Dino voltou para a tela',
        // ⚠️ Sem "depois de o Dino sumir": sumir é a resposta da previsão desta cena.
        pedido:
          'Leve o Dino para depois de 480 com a câmera parada e então faça a câmera seguir o Dino.',
      },
      {
        id: 'window',
        // ⚠️⚠️ Lote 5: cai quando a janela MUDA de lugar com a câmera seguindo.
        label: 'Com a câmera seguindo, o cenário passou e o Dino ficou na tela',
        pedido:
          'Com a câmera parada, leve o Dino para depois de 480. Depois faça a câmera seguir o Dino e ande mais um pouco.',
      },
    ],
    hints: [
      // ⚠️ As duas primeiras pistas eram a explicação ("a tela mostra só um pedaço") e a resposta da
      // previsão ("até sumir"), e podem ser lidas antes do palpite.
      'Olhe onde o Dino está no mundo e o pedaço que a tela mostra. Ande para a direita.',
      'Com a câmera parada, leve o Dino bem para a direita e olhe a tela do jogo.',
      'Leve o Dino para depois de 480 e depois faça a câmera seguir o Dino.',
    ],
  },
  contact: {
    id: 'contact',
    group: 'collision',
    // ⭐⭐ Lote 5 do Raio-X (G5): DUAS pistas com as duas regras ao mesmo tempo. Antes a criança trocava
    // a pergunta numa Escolha, a vida zerava, e o "3 perdidas" sumia no instante de comparar com o "1".
    title: 'Encostando, ou começou a encostar?',
    instruction: 'Encoste o cacto no Dino e espere. Depois afaste e encoste de novo.',
    manipulates: 'A distância dos cactos das duas pistas',
    success:
      '"Está encostando?" vale em todo quadro. "Começar a encostar" vale só no instante da batida!',
    extra: 'E se o cacto ficar encostado até acabarem os corações de cima?',
    goals: [
      {
        id: 'drain',
        label: '"Está encostando?" tirou um coração em todo quadro',
        pedido: 'Encoste o cacto no Dino e deixe o tempo passar.',
      },
      {
        id: 'once',
        label: '"Começar a encostar" tirou um coração só',
        pedido: 'Encoste o cacto no Dino, deixe o tempo passar e olhe a pista de baixo.',
      },
      {
        id: 'apart',
        label: 'Afastou, encostou de novo e perdeu mais um coração',
        // ⚠️⚠️ Termina no TEMPO (review do lote 2): a meta é conferida no passo do relógio.
        pedido:
          'Depois de encostar, afaste o cacto e deixe o tempo passar. Depois encoste de novo e deixe o tempo passar.',
      },
    ],
    hints: [
      'Encoste o cacto no Dino, deixe o tempo passar e olhe as duas pistas.',
      'Compare quantos corações saíram em cima e embaixo.',
      'Afaste o cacto, deixe o tempo passar e encoste de novo.',
    ],
  },
  cooldown: {
    id: 'cooldown',
    group: 'events',
    // ⚠️ "O tiro que espera a vez" respondia a previsão.
    title: 'A arma e a recarga',
    // ⭐⭐ Lote 5 do Raio-X (G5): os tiros VOAM, e o aperto que não virou tiro pisca e some.
    instruction:
      'Aperte Atirar bem rápido, várias vezes. Depois ponha uma recarga e aperte rápido de novo.',
    manipulates: 'O tiro e o tempo de recarga entre dois tiros',
    success: 'O relógio também serve para ESPERAR: durante a recarga, apertar não faz nada!',
    extra: 'E se a recarga for de 2 segundos inteiros?',
    goals: [
      {
        id: 'burst',
        // ⚠️⚠️ Lote 5: cai no TERCEIRO tiro sem recarga dentro de 1 s, e não quando o relógio anda.
        label: 'Sem recarga, os tiros saíram colados',
        pedido: 'Tire a recarga e aperte Atirar três vezes bem rápido.',
      },
      // ⚠️ `waiting` antes de `spaced` (review do lote 2): é a meta que responde a previsão.
      {
        id: 'waiting',
        label: 'Apertar durante a recarga não fez tiro nenhum',
        pedido: 'Ponha uma recarga e aperte Atirar duas vezes bem rápido.',
      },
      {
        id: 'spaced',
        label: 'Com recarga, apareceu um vão entre os tiros',
        // ⚠️⚠️ "até aparecer Pronto para atirar" (review do lote 2): a frase embaixo do palco é o sinal
        // que a criança consegue esperar.
        pedido:
          'Ponha uma recarga e aperte Atirar. Deixe o tempo passar até aparecer Pronto para atirar e aperte Atirar de novo.',
      },
    ],
    hints: [
      'Aperte Atirar várias vezes seguidas e olhe os tiros voando.',
      // ⚠️ A pista 2 era a explicação ("o pedido não vira tiro"), e pode ser lida antes do palpite.
      'Ponha uma recarga e aperte Atirar várias vezes. Olhe quantos tiros saem.',
      'Ponha a recarga em 1 segundo e aperte Atirar duas vezes seguidas.',
    ],
  },
  aim: {
    id: 'aim',
    group: 'motion',
    title: 'A seta que aponta',
    // ⭐⭐ Lote 5 do Raio-X (G5): o GESTO "Atirar", e o tiro que voa pela seta ou reto.
    instruction: 'Mude o alvo de lugar e atire. Depois ligue a mira e atire de novo.',
    manipulates: 'O lugar do alvo, a mira e o tiro',
    success: 'Apontar é achar a seta do Dino até o alvo. Com a mira, o tiro vai por ela!',
    extra: 'E se o alvo ficar atrás do Dino?',
    goals: [
      {
        id: 'arrow',
        label: 'A seta virou quando o alvo mudou de lugar',
        pedido: 'Mude o alvo de lugar e olhe a seta.',
      },
      {
        id: 'straight-miss',
        label: 'Sem a mira, o tiro foi reto e errou',
        // ⚠️ "acima ou abaixo do Dino": com o alvo na frente, reto e pela seta são o mesmo caminho.
        pedido:
          'Com a mira desligada e o alvo acima ou abaixo do Dino, aperte Atirar e olhe o tiro voar.',
      },
      {
        id: 'follows',
        // ⚠️⚠️ Lote 5: cai no ACERTO de um tiro que saiu com a mira ligada.
        label: 'Com a mira, o tiro foi pela seta e acertou',
        // ⚠️ "Olhe o tiro voar": Atirar solta o tempo, e a meta cai quando o tiro CHEGA no alvo.
        pedido: 'Ligue a mira, aperte Atirar e olhe o tiro voar.',
      },
    ],
    hints: [
      'Mude o alvo de lugar e olhe para onde a seta aponta.',
      // ⚠️ A pista 2 era a resposta da previsão.
      'Atire com a mira desligada, e depois com a mira ligada. Compare o caminho do tiro.',
      'Ligue a mira e aperte Atirar.',
    ],
  },
  diagonal: {
    id: 'diagonal',
    group: 'motion',
    // ⭐⭐ Lote 5 do Raio-X (G5): o Dino, o rastro e o círculo de referência. "Andar 1 segundo" é o
    // gesto (sem relógio): o caminho não depende mais de qual botão do tempo foi apertado.
    title: 'Duas setas ao mesmo tempo',
    instruction:
      'Ande 1 segundo só para a direita. Depois ande 1 segundo com direita e baixo juntas.',
    manipulates: 'As setas apertadas, andar 1 segundo e a correção da diagonal',
    success:
      'Na diagonal o Dino anda para o lado E para baixo, e o caminho fica mais comprido. A correção deixa igual ao reto!',
    extra: 'E se a correção ficar ligada andando reto?',
    goals: [
      {
        id: 'straight',
        label: 'Andando reto, o Dino parou no círculo',
        pedido: 'Aperte uma seta só e aperte Andar 1 segundo.',
      },
      {
        id: 'faster',
        // ⚠️⚠️ Lote 5: só cai com o fantasma de uma andada RETA no palco, para comparar.
        label: 'Na diagonal, o Dino passou do círculo',
        pedido:
          'Ande 1 segundo com uma seta só. Depois aperte duas setas juntas e ande 1 segundo de novo.',
      },
      {
        id: 'same',
        label: 'Com a correção, a diagonal parou no círculo',
        pedido: 'Ligue a correção da diagonal, aperte duas setas juntas e ande 1 segundo.',
      },
    ],
    hints: [
      'Aperte só a seta para a direita e ande 1 segundo. Olhe onde o Dino para.',
      'Agora aperte a seta para a direita e a seta para baixo. O Dino para em cima do círculo?',
      'Ligue a correção e ande de novo na diagonal.',
    ],
  },
  tilemap: {
    id: 'tilemap',
    group: 'world',
    title: 'O mapa escrito com letras',
    // ⭐⭐ Lote 5 do Raio-X (G5): as letras do TEXTO do palco são tocáveis, com uma paleta de três letras,
    // e o Dino cai até o primeiro bloco da coluna dele.
    instruction:
      'Escolha uma letra e toque numa casa do texto. Depois escreva ooo numa linha do meio.',
    manipulates: 'A letra escolhida e as casas do texto do mapa',
    // ⚠️ "O mapa é um dado": para quem tem 9 anos, "dado" é o de jogar.
    success: 'O mapa é um texto que o jogo lê: cada letra vira sempre a mesma peça!',
    extra: 'E se você apagar o chão embaixo do Dino?',
    goals: [
      {
        id: 'text-is-map',
        label: 'Trocou uma letra e o desenho mudou',
        pedido: 'Escolha uma letra e toque numa casa do texto que tem outra letra.',
      },
      {
        id: 'coin-row',
        label: 'Três o seguidos numa linha do meio viraram três moedas no ar',
        pedido: 'Escolha a letra o e escreva três o seguidos numa linha do meio.',
      },
      {
        id: 'same-letter',
        // ⚠️⚠️ Lote 5: a mesma PEÇA (# ou o) em duas LINHAS. Caía apagando duas casas com ".".
        label: 'Escreveu a mesma peça em duas linhas, e as duas ficaram iguais',
        pedido: 'Escreva numa outra linha uma peça que você já escreveu.',
      },
    ],
    hints: [
      'Escolha a letra # e toque numa casa vazia do texto.',
      'Cada linha do texto é uma linha do desenho. Olhe a mesma casa nos dois.',
      'Escolha a letra o e toque em três casas seguidas da linha 3.',
    ],
  },
  /* ── O motor, o 3D e o ateliê (15/09/2026) ─────────────────────────────────────────────── */
  pool: {
    id: 'pool',
    group: 'population',
    // ⚠️ "O contador que só sobe" respondia a previsão ("quantos o jogo fabricou?").
    title: 'Quantos cactos o jogo já fabricou?',
    // ⭐ Lote 5 do Raio-X: o número PINTADO em cada cacto é o que se compara (nº 4, nº 5, nº 6 contra
    // nº 3, nº 3, nº 3). A chave tem o nome do gesto, e não "o fio": não há fio nenhum na bancada.
    instruction:
      'Aperte ▶ e olhe o número pintado em cada cacto. Depois ligue Reciclar quem saiu e olhe de novo.',
    manipulates: 'O tempo e a chave Reciclar quem saiu',
    success: 'Reciclando, o jogo usa de novo o cacto que saiu. O número de fabricados parou!',
    extra: 'E se você desligar a reciclagem depois de um tempo?',
    goals: [
      {
        id: 'grows',
        label: 'A cada vez, um cacto novo: o número só subiu',
        pedido: 'Com Reciclar quem saiu desligado, deixe o tempo passar até fabricados chegar a 3.',
      },
      {
        id: 'recycled',
        label: 'O mesmo cacto saiu e entrou de novo',
        // ⚠️ Até o cacto da tela SAIR: é na saída que ele volta (o motor só dá a meta a um cacto que
        // já estava na tela, e não ao primeiro que entra).
        pedido:
          'Ligue Reciclar quem saiu e deixe o tempo passar até o cacto da tela chegar na saída.',
      },
      {
        id: 'steady',
        label: 'O número de fabricados parou',
        // ⚠️⚠️ "até fabricados chegar a 3" (review do lote 2): com "algumas vezes" a meta anterior
        // (`grows`) não caía, e mais tempo com a reciclagem ligada nunca a derrubava.
        // ⚠️ "Por 4 segundos", e não "mais um pouco" (review do lote 4).
        pedido:
          'Com Reciclar quem saiu desligado, deixe o tempo passar até fabricados chegar a 3. Depois ligue Reciclar quem saiu e deixe o tempo passar por 4 segundos.',
      },
    ],
    hints: [
      'São dois números: quantos estão na tela agora e quantos o jogo já fabricou.',
      // ⚠️ A pista 2 respondia a previsão, e pode ser lida antes do palpite.
      'Aperte ▶ e olhe o número pintado em cada cacto que entra.',
      'Deixe o tempo passar até fabricados chegar a 3. Depois ligue Reciclar quem saiu e olhe o número pintado no cacto.',
    ],
  },
  'entity-state': {
    id: 'entity-state',
    group: 'events',
    // ⚠️ "Cada um com o seu cérebro" respondia a previsão. ⚠️ Lote 5 do Raio-X: são as TORRES do Jogo 3D
    // Avançado (parado, mirar, atirar, recarregar), com uma pose que se vê de longe para cada estado.
    title: 'O que cada torre está fazendo?',
    instruction:
      'Ponha a 1ª torre para mirar e aperte ▶. Olhe as três. Depois mude só a 2ª. No fim, mude onde o estado mora.',
    manipulates: 'O estado de cada torre, onde o estado mora e o tempo',
    success: 'Cada torre guarda o seu estado, e é o estado que decide o que a torre faz agora!',
    extra: 'E se as três ficarem no mesmo estado?',
    goals: [
      {
        id: 'own',
        label: 'As três ficaram em estados diferentes',
        pedido: 'Com o estado morando em cada uma, ponha as três torres em estados diferentes.',
      },
      {
        id: 'acts',
        label: 'Com o relógio andando, cada torre fez o que o seu estado manda',
        pedido: 'Com pelo menos duas torres em estados diferentes, deixe o tempo passar.',
      },
      {
        id: 'independent',
        label: 'Mudou uma torre e as outras não mudaram',
        // ⚠️ DEPOIS do tempo passar: é quando o motor passa a contar a independência (antes dele
        // ninguém fez nada, e a meta caía no meio da montagem da primeira).
        pedido:
          'Com o estado morando em cada uma e duas torres em estados diferentes, deixe o tempo passar. Depois mude o estado de uma só.',
      },
      {
        // ⭐ Lote 5 do Raio-X: a crença errada ("o estado é do jogo"), testada de verdade.
        id: 'shared',
        label: 'Com o estado no jogo, as três mudaram juntas',
        pedido: 'Mude onde o estado mora para no jogo e troque o estado de uma torre.',
      },
    ],
    hints: [
      // ⚠️ Sem "As três torres começam paradas" (consertos do review da onda B do lote 5): a pista 1
      // vem colada na situação, e saía "A 1ª torre está atirando, a 2ª atirando… As três torres
      // começam paradas."
      'Escolha um estado para a 1ª torre e aperte ▶.',
      // ⚠️ A pista 2 era a explicação da cena, e pode ser lida antes do palpite.
      'Mude o estado de uma só e deixe o tempo passar. Olhe o que as outras duas fizeram.',
      'Deixe a 1ª mirando e a 2ª atirando, e deixe o tempo passar.',
    ],
  },
  'delta-time': {
    id: 'delta-time',
    group: 'motion',
    title: 'O mesmo jogo em dois computadores',
    // ⭐ Lote 5 do Raio-X: a corrida ACABA na chegada, e cada quadro desenhado deixa uma pegada.
    instruction:
      'Aperte ▶ e veja a corrida. Depois troque para "a cada segundo" e aperte ▶ de novo.',
    manipulates: 'Como o Dino anda (a cada quadro ou a cada segundo) e o tempo',
    success: 'Andando a cada segundo, o jogo fica igual em qualquer computador!',
    // ⚠️ "marcas", e não "pegadas" (consertos do review da onda B do lote 5): com o elenco de nave, a
    // pista e o "E se" falavam em pegadas de uma nave.
    extra: 'Andando a cada segundo, quem deixou mais marcas até a chegada?',
    goals: [
      {
        id: 'apart',
        label: 'A cada quadro, os dois computadores se separaram',
        // ⚠️ Quanto tempo (review do lote 2): "algumas vezes" com quatro passos não separava os dois.
        pedido: 'Com o Dino andando a cada quadro, deixe o tempo passar por dois segundos.',
      },
      {
        id: 'together',
        label: 'A cada segundo, os dois chegaram juntos',
        // ⚠️ Até a CHEGADA (lote 5): a meta diz "chegaram", e a corrida acaba lá.
        pedido:
          'Depois de ver os dois se separarem, troque para "a cada segundo" e deixe o tempo passar até a chegada.',
      },
    ],
    hints: [
      'São dois computadores com o mesmo jogo: um rápido e um devagar.',
      // ⚠️ A pista 2 era a resposta da previsão, e pode ser lida antes do palpite.
      'Aperte ▶ e compare as marcas de cada computador.',
      'Aperte ▶ com "a cada quadro". Depois troque e aperte ▶ de novo.',
    ],
  },
  'circle-collision': {
    id: 'circle-collision',
    group: 'collision',
    // ⚠️ "A conta que decide a batida" respondia a previsão (lote 5 do Raio-X).
    title: 'Quando dois círculos batem?',
    // ⚠️⚠️ "espere", e não "até os dois baterem e pare" (consertos do review da onda B do lote 5): o
    // pedido exigia reflexo, e quem demorava via a distância chegar a 0 com os dois fundidos num disco.
    // Hoje o relógio só aproxima ATÉ a batida (`engine.ts`) e o player para o ▶ ali.
    instruction:
      'Aperte ▶ e espere os dois baterem. Olhe a fila dos raios. Depois diminua um raio sem mexer na distância.',
    manipulates: 'A distância entre os centros, os dois raios e o relógio que aproxima',
    success: 'Distância contra a soma dos raios: é essa conta que o jogo faz!',
    extra: 'E se os dois raios ficarem bem grandes?',
    goals: [
      {
        id: 'touch',
        // ⚠️ "igual ou menor" (lote 5): a meta cai com a distância IGUAL à soma (60 contra 60), e
        // "menor" prometia o que a tela não mostrava.
        label: 'A distância ficou igual ou menor que a soma dos raios',
        pedido:
          'Aproxime os dois círculos: deixe o tempo passar ou diminua a distância entre os centros.',
      },
      {
        id: 'formula',
        // ⚠️ O gesto é sem relógio: mudar o raio troca o resultado NO MESMO LUGAR, e não "o instante".
        label: 'Com os círculos parados, mudar um raio trocou o resultado',
        // ⚠️⚠️ "só encostando" (review do lote 2): com os círculos já sobrepostos, diminuir um raio sem
        // mexer na distância não desfaz a batida, e o pedido proibia a saída.
        pedido: 'Com os dois só encostando, diminua um dos raios sem mexer na distância.',
      },
    ],
    hints: [
      // ⭐ Lote 5: a fila dos raios deitados embaixo da linha da distância é o desenho da conta.
      'Olhe a fila dos dois raios, embaixo da linha da distância.',
      // ⚠️ A pista 2 era a frase que saiu do rodapé por ser FALSA neste palco, e pode ser lida antes
      // do palpite.
      'Aperte ▶ e espere aparecer "bateu". Olhe onde a fila dos raios termina.',
      'Deixe os dois só encostarem e então diminua um raio, sem mexer na distância.',
    ],
  },
  'axis-z': {
    id: 'axis-z',
    group: 'stage',
    title: 'O eixo que faltava',
    // ⚠️⚠️ Lote 5 do Raio-X: o z primeiro, e depois o y. A sombra passou a pedir o cubo NO AR andando
    // pelo x ou pelo z, então o y já não fecha duas metas juntas (o motivo da ordem do review do lote 2).
    instruction: 'Mexa só no z e olhe a sombra. Depois aumente só o y, e mexa no z de novo.',
    manipulates: 'Os três eixos do espaço, um de cada vez',
    success: 'O z é a frente e o fundo. E no 3D, y maior é mais ALTO!',
    extra: 'E se o cubo voltar para o chão bem no fundo?',
    // ⚠️ `up` antes de `depth`: é a meta que responde a previsão, na ordem do "Conferir".
    goals: [
      { id: 'up', label: 'No 3D, o y maior é mais ALTO', pedido: 'Aumente só o y.' },
      { id: 'depth', label: 'O z leva para a frente e para o fundo', pedido: 'Mexa só no z.' },
      {
        id: 'shadow',
        label: 'No ar, a sombra andou pelo chão junto com o cubo',
        pedido: 'Levante o cubo com o y. Depois, com o cubo no ar, mexa só no x ou só no z.',
      },
    ],
    hints: [
      'Agora são três números. Mexa só no z e olhe o cubo e a sombra.',
      // ⚠️ A pista 2 era a resposta da previsão ("aqui ele cresce para cima").
      'No jogo 2D, aumentar o y descia. Veja o que acontece aqui.',
      'Aumente só o y. Depois, com o cubo no ar, mexa só no x.',
    ],
  },
  'camera-3d': {
    id: 'camera-3d',
    group: 'stage',
    // ⚠️⚠️ O título e a instrução diziam "até ver uma cor só" logo acima de "de frente, quantas cores
    // você vê?" (review do lote 2).
    title: 'Gire a câmera e conte as cores',
    instruction:
      'Mova a câmera em volta do cubo e conte as cores em cada lugar. Ache o lugar com menos cores, um com exatamente duas e um com três.',
    manipulates: 'A volta e a altura de onde a câmera olha',
    success: 'O cubo não mudou: o que você vê depende de onde a câmera está!',
    extra: 'E se a câmera ficar bem por baixo?',
    goals: [
      {
        id: 'one-face',
        label: 'Girou até ver uma cor só',
        pedido: 'Mova a câmera até ver uma cor só.',
      },
      {
        id: 'two-faces',
        label: 'Girou até ver exatamente duas cores',
        // ⚠️ "outro lugar": a cena ABRE mostrando duas cores, e o pedido parecia já cumprido.
        pedido: 'Leve a câmera para outro lugar com exatamente duas cores.',
      },
      {
        // ⭐ Lote 5 do Raio-X: no lugar de "voltou à vista de sempre", que era apertar um atalho.
        id: 'three-faces',
        label: 'Achou um lugar com três cores',
        pedido: 'Leve a câmera para um canto e mude a altura.',
      },
      {
        // ⚠️ Só num caso (lote 5): o botão continua na bancada como atalho, sem meta de fábrica.
        id: 'back',
        // ⚠️ "onde a câmera começou", e não "a vista de sempre" (consertos do review da onda B do lote 5):
        // a criança não conhece o canto do começo como "de sempre".
        label: 'Voltou para onde a câmera começou com um toque',
        soNoCaso: true,
        // ⚠️ "longe de onde começou": quem volta à mão para a volta 2 já está lá.
        pedido: 'Com a câmera longe de onde começou, aperte Voltar para onde a câmera começou.',
      },
    ],
    hints: [
      // ⭐ Lote 5: lados opostos têm a mesma cor, então contar as cores é contar os lados.
      'Lados opostos têm a mesma cor. Mova devagar e conte as cores.',
      // ⚠️ A pista 2 era a resposta da previsão, e pode ser lida antes do palpite.
      'Mude a volta de 1 em 1 e conte as cores em cada lugar. Depois mude a altura.',
      // ⚠️ A pista literal antiga ("baixe a altura e gire meia volta") levava a TRÊS cores. ⚠️ A volta
      // se conta de 1 a 8 desde o lote 5: a volta 1 é bem de frente.
      'Deixe a altura no meio e ponha a volta em 1.',
    ],
  },
  mesh: {
    id: 'mesh',
    group: 'art',
    // ⚠️ "Por baixo da roupa" (lote 5 do Raio-X): o Molda diz PELE ("pinte a pele direto no modelo").
    title: 'O que tem embaixo da pele?',
    // ⚠️⚠️ "A pele" (inteira, transparente, sem pele) no lugar de "Ver os pontos" (nada, metade, tudo)
    // (consertos do review da onda B do lote 5): o nome do controle e a instrução "Ponha Ver os pontos
    // na metade" respondiam a previsão ("do que um modelo 3D é feito?") antes do palpite. Os ids da ação
    // (`nada`, `metade`, `tudo`) não mudaram.
    instruction:
      'Deixe a pele transparente e olhe o que aparece embaixo. Depois volte a pele inteira e gire o modelo.',
    manipulates: 'A pele (inteira, transparente ou sem pele) e a volta do modelo',
    success: 'A forma é feita de pontos ligados. A cor é uma pele pintada por cima!',
    extra: 'E se você girar com os pontos à vista?',
    goals: [
      {
        id: 'points',
        label: 'Viu os pontos e as linhas que formam o modelo',
        pedido: 'Deixe a pele transparente.',
      },
      {
        id: 'skin',
        label: 'Viu a pele por cima dos mesmos pontos',
        // ⚠️ Dois gestos (lote 5): a pele POR CIMA é uma comparação com os pontos já vistos.
        pedido: 'Depois de deixar a pele transparente, volte a pele inteira e olhe o modelo.',
      },
    ],
    hints: [
      'O modelo parece liso. Deixe a pele transparente.',
      // ⚠️ A pista 2 era o rodapé que saiu por responder a previsão.
      'Compare o modelo com a pele inteira e com a pele transparente.',
      'Deixe a pele transparente, olhe, e volte a pele inteira.',
    ],
  },
  'pick-ray': {
    id: 'pick-ray',
    group: 'collision',
    // ⚠️ "A mira que para na primeira" respondia a previsão ("qual acende?").
    title: 'Qual caixa a mira acende?',
    // ⭐ Lote 5 do Raio-X: duas vistas da MESMA cena, a do jogador e a de lado.
    // ⚠️ Onde uma cobre a outra PRIMEIRO (lote 5): é a meta que responde a previsão, e a caixa sozinha
    // vem depois (a ordem do "Conferir" é a das metas, e o palpite volta antes da conclusão).
    instruction:
      'Mire onde uma caixa cobre a outra e olhe a vista de lado. Depois mire na caixa sozinha.',
    manipulates: 'Para onde a mira aponta',
    success: 'A mira é uma reta que sai do seu olho e para na primeira coisa!',
    extra: 'E se você mirar no vazio?',
    goals: [
      {
        id: 'first',
        label: 'Com duas no caminho, acendeu a mais perto',
        pedido: 'Aponte a mira onde uma caixa cobre a outra.',
      },
      {
        id: 'face',
        label: 'A caixa mirada acendeu',
        // ⚠️ SOZINHA (lote 5): onde uma cobre a outra a meta é a outra, e as duas não caem juntas.
        pedido: 'Aponte a mira para a caixa sozinha.',
      },
    ],
    hints: [
      'Aponte para uma caixa e veja qual delas acende.',
      // ⚠️ As pistas 2 e 3 eram a resposta da previsão, e podem ser lidas antes do palpite.
      'Use o botão Mirar onde uma cobre a outra e olhe a vista de lado.',
      'Aperte Mirar onde uma cobre a outra.',
    ],
  },
  'fill-stroke': {
    id: 'fill-stroke',
    group: 'art',
    title: 'A cor de dentro e a linha de fora',
    // ⚠️⚠️ Lote 5: Preenchimento, Contorno e Sem cor, os nomes do Pinta. A cena dizia "miolo" e
    // "contorno à vista", e a pedra era um pentágono sobre um fundo liso (Sem cor parecia branco).
    instruction:
      'Deixe o contorno em Sem cor e olhe a pedra. Depois deixe o preenchimento em Sem cor e olhe de novo.',
    manipulates: 'O preenchimento e o contorno da pedra',
    success:
      'Preenchimento e contorno são duas partes com cor própria. Cada uma pode ficar em Sem cor!',
    extra: 'E se as duas partes ficarem em Sem cor ao mesmo tempo?',
    goals: [
      {
        id: 'only-fill',
        label: 'Deixou o contorno em Sem cor',
        // ⚠️ Sem "e o preenchimento pintado": eram as palavras da resposta certa ("Sobra o preenchimento").
        pedido: 'Deixe só o contorno em Sem cor.',
      },
      {
        id: 'only-stroke',
        label: 'Deixou o preenchimento em Sem cor',
        pedido: 'Deixe só o preenchimento em Sem cor.',
      },
      {
        id: 'both',
        label: 'Voltou as duas partes com cor',
        pedido: 'Depois de deixar uma parte em Sem cor, volte as duas com cor.',
      },
    ],
    hints: [
      'A pedra tem duas partes: o preenchimento, por dentro, e o contorno, na borda.',
      // ⚠️ A pista 2 era a explicação da cena.
      'Deixe uma parte de cada vez em Sem cor e olhe o que sobra.',
      // ⚠️ Até a volta das duas cores (consertos do review da onda B do lote 5): a escada nunca falava
      // da última meta, `both`.
      'Deixe o contorno em Sem cor, depois o preenchimento, e no fim volte as duas com cor.',
    ],
  },
  shading: {
    id: 'shading',
    group: 'art',
    title: 'A luz dá volume',
    // ⚠️⚠️ Lote 5: três tons da família do azul em pixels (o tom da bola, um mais escuro e um mais
    // claro). A "sombra da mesma cor" era um crescente verde-oliva sobre a bola azul.
    instruction:
      'Ligue a sombra e a luz e olhe a bola. Desligue para comparar, e depois mude o sol de lado.',
    manipulates: 'Os tons de sombra e de luz e o lado do sol',
    success: 'Um azul mais escuro longe do sol e um mais claro perto dele deixam a bola redonda!',
    extra: 'E se você mudar o sol de lado com a sombra e a luz desligadas?',
    goals: [
      {
        id: 'volume',
        label: 'Ligou os tons e viu a bola redonda',
        pedido: 'Ligue a sombra e a luz.',
      },
      {
        id: 'flat',
        label: 'Tirou os tons e viu a bola chapada de novo',
        pedido: 'Ligue a sombra e a luz e depois desligue.',
      },
      {
        id: 'side',
        label: 'Mudou o sol de lado e viu a sombra trocar de lado',
        pedido: 'Com a sombra e a luz ligadas, mude o sol de lado.',
      },
    ],
    hints: [
      'A bola está pintada com um tom só. Ligue a sombra e a luz e compare.',
      // ⚠️ A pista 2 era a resposta do "Agora explique".
      'Com a sombra e a luz ligadas, mude o sol de lado. Olhe onde fica o azul mais escuro.',
      'Com a sombra e a luz ligadas, leve o sol para o outro lado.',
    ],
  },
}

const PREVIA_INICIAL: ScenePredictionPreview = { initial: true, conceal: [] }

/**
 * Uma entrada por cena, mesmo quando a prévia é a inicial sem redaction. Assim, qualquer cena
 * nova precisa decidir conscientemente o que mostra antes do palpite.
 */
const SCENE_PREDICTION_PREVIEWS: Record<SceneId, ScenePredictionPreview> = {
  'once-vs-always': PREVIA_INICIAL,
  'fixed-vs-read': PREVIA_INICIAL,
  'collision-pair': PREVIA_INICIAL,
  invincibility: PREVIA_INICIAL,
  'number-line': PREVIA_INICIAL,
  'unique-names': PREVIA_INICIAL,
  'motion-amount': PREVIA_INICIAL,
  'two-clocks': PREVIA_INICIAL,
  'copy-vs-original': PREVIA_INICIAL,
  'published-copy': PREVIA_INICIAL,
  'same-rules-new-skin': PREVIA_INICIAL,
  coordinates: PREVIA_INICIAL,
  'screen-reader': PREVIA_INICIAL,
  'stage-size': PREVIA_INICIAL,
  'draw-loop': PREVIA_INICIAL,
  frames: PREVIA_INICIAL,
  'onion-skin': PREVIA_INICIAL,
  symmetry: PREVIA_INICIAL,
  'pixel-vector': PREVIA_INICIAL,
  'sheet-vs-sprite': PREVIA_INICIAL,
  world: PREVIA_INICIAL,
  layers: { initial: true, conceal: ['layers-order'] },
  gravity: PREVIA_INICIAL,
  impulse: PREVIA_INICIAL,
  'jump-sound': PREVIA_INICIAL,
  spawn: PREVIA_INICIAL,
  cleanup: PREVIA_INICIAL,
  'game-state': PREVIA_INICIAL,
  controls: PREVIA_INICIAL,
  restart: PREVIA_INICIAL,
  hitbox: PREVIA_INICIAL,
  score: PREVIA_INICIAL,
  lives: PREVIA_INICIAL,
  random: PREVIA_INICIAL,
  acceleration: PREVIA_INICIAL,
  velocity: PREVIA_INICIAL,
  'hold-vs-press': PREVIA_INICIAL,
  variable: PREVIA_INICIAL,
  'group-loop': PREVIA_INICIAL,
  'enemy-type': PREVIA_INICIAL,
  camera: PREVIA_INICIAL,
  contact: PREVIA_INICIAL,
  cooldown: PREVIA_INICIAL,
  aim: PREVIA_INICIAL,
  diagonal: PREVIA_INICIAL,
  tilemap: PREVIA_INICIAL,
  pool: PREVIA_INICIAL,
  'entity-state': PREVIA_INICIAL,
  'delta-time': PREVIA_INICIAL,
  'circle-collision': PREVIA_INICIAL,
  'axis-z': PREVIA_INICIAL,
  'camera-3d': { initial: true, conceal: ['camera-colors'] },
  mesh: PREVIA_INICIAL,
  'pick-ray': PREVIA_INICIAL,
  'fill-stroke': PREVIA_INICIAL,
  shading: PREVIA_INICIAL,
}

export const SCENE_MODELS: Record<SceneId, SceneModel> = Object.fromEntries(
  SCENE_IDS.map((scene) => [
    scene,
    { ...SCENE_MODEL_DEFINITIONS[scene], predictionPreview: SCENE_PREDICTION_PREVIEWS[scene] },
  ]),
) as Record<SceneId, SceneModel>

export function sceneModel(scene: SceneId): SceneModel {
  return SCENE_MODELS[scene]
}

/** Os ids de meta de uma cena — o `waitFor` de um roteiro precisa ser um deles. */
export function sceneGoalIds(scene: SceneId): string[] {
  return SCENE_MODELS[scene].goals.map((g) => g.id)
}

/**
 * As metas da missão de FÁBRICA: todas, menos as que só existem para um caso (`soNoCaso`).
 *
 * ⚠️ É o que uma experimentação SEM `setup.goals` cobra. `sceneGoalIds` continua sendo a lista
 * inteira, porque é contra ela que o caso do professor e o `waitFor` do roteiro são conferidos.
 */
export function sceneDefaultGoalIds(scene: SceneId): string[] {
  return SCENE_MODELS[scene].goals.filter((g) => !g.soNoCaso).map((g) => g.id)
}
