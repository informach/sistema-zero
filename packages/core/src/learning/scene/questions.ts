import type { LearningPredictionContext } from '../prediction-context'
import { SCENE_IDS, type SceneId } from './actions'

/**
 * A PREVISÃO e a EXPLICAÇÃO de cada cena: o primeiro e o terceiro tempo do ciclo.
 *
 * ⚠️⚠️ Por que isto vive no MODELO, e não em cada bloco.
 *
 * Os dois padrões mais fortes do estudo do Brilliant são apostar antes de mexer e enunciar a
 * regra depois. Nós os construímos como campos OPCIONAIS do bloco (`prediction`, `checkpoint`) e
 * medimos o resultado: de 52 blocos de cena nos cursos, 7 tinham previsão e 8 tinham pergunta.
 * 13% e 15%. Um recurso que depende de alguém lembrar não é recurso, é intenção.
 *
 * A raiz não era a autoria, era o padrão: a pergunta certa para uma cena é uma propriedade DA
 * CENA, não do bloco. "O que acontece quando a velocidade é zero" é a mesma pergunta em toda
 * aula que usa `velocity`, vestida com outro elenco. Escrevendo uma vez aqui, todo bloco de toda
 * aula ganha as duas — inclusive os 52 que já existem, sem tocar em manifesto nenhum.
 *
 * O bloco continua podendo escrever as suas (`block.prediction` e `block.checkpoint` vencem):
 * o que muda é o PADRÃO. Quem não escreve nada recebe o ciclo inteiro em vez de metade dele.
 *
 * ⚠️ A previsão NÃO vale nota, e é deliberado: palpite errado é caminho de aprendizado, e
 * reprovar por ele ensina a criança a não arriscar. A explicação vale, e é o que dá a palavra
 * final sobre a conclusão do bloco.
 *
 * ⚠️ A opção errada é sempre uma crença ingênua PLAUSÍVEL, nunca um espantalho. Uma alternativa
 * obviamente boba transforma a pergunta em clique, que é o oposto do que ela existe para fazer.
 *
 * ⚠️ O texto passa pelo ELENCO (`castText`) como todo o resto do que a plataforma gera: quem
 * escrever aqui precisa escrever de um jeito que sobreviva à troca de personagem.
 *
 * ⚠️⚠️ Toda previsão do modelo diz QUAL META a responde (`revealOn`) e, em cada opção errada, o
 * que olhar (`shows`), desde o lote 2 do Raio-X (16/09/2026). O player congela o palpite no
 * primeiro gesto e o retoma quando essa meta cai. Duas regras que o teste cobra:
 *  - a meta tem de ser uma que a bancada de HOJE consegue fazer cair, e que de fato mostre a
 *    resposta (a `pixel-vector` revela em `smooth`, a pedra de vetor lisa, e não em `stairs`);
 *  - o `shows` conta, no PASSADO, o que a cena mostrou quando a meta caiu, nunca a regra escrita de
 *    novo. ⚠️ No passado (review do lote 2): a linha do palpite fica na tela depois do gesto, e um
 *    "Olhe a tela: o Dino saiu da janela" no presente passava a mentir quando a câmera ligava.
 *
 * ⚠️⚠️ Id de escolha que MUDA DE SENTIDO ganha id novo (review do lote 2). O palpite guardado e a
 * tentativa antiga mostram a frase pelo id: com o id velho, o relatório do professor mostraria
 * uma resposta que a criança nunca escolheu. Frase reescrita com o MESMO sentido fica com o id.
 */

/** Uma alternativa, no formato que o bloco de aula já usa. */
interface Escolha {
  id: string
  label: string
  /**
   * Só nas opções ERRADAS da previsão: o que a cena MOSTROU quando a criança escolheu esta ("Sem
   * gravidade, o Dino continuou subindo."). No passado, porque a linha fica na tela depois. Não é
   * bronca, é o caminho de volta.
   */
  shows?: string
}

export interface ScenePrediction {
  context: LearningPredictionContext
  prompt: string
  choices: Escolha[]
  /** O que acontece de verdade. Não reprova ninguém: serve ao relatório do professor. */
  correctChoiceId: string
  /**
   * A meta cuja queda RESPONDE o palpite. O player compara hipótese e observação nesse instante
   * ("Seu palpite: Nada. Ao testar: …"). Sem ela, o palpite é retomado quando a cena conclui.
   */
  revealOn?: string
}

export interface SceneExplanation {
  prompt: string
  choices: Escolha[]
  correctChoiceId: string
  /** O porquê, que a criança lê depois de acertar. */
  explanation: string
}

export interface SceneQuestions {
  prediction: ScenePrediction
  explain: SceneExplanation
}

interface ScenePredictionDefinition extends Omit<ScenePrediction, 'context'> {}

interface SceneQuestionDefinition extends Omit<SceneQuestions, 'prediction'> {
  prediction: ScenePredictionDefinition
}

/**
 * A apresentação do assunto vem antes da pergunta. Cada entrada foi escrita para nomear o que a
 * criança verá na prévia, sem responder à previsão antes de ela apostar.
 */
export const SCENE_PREDICTION_CONTEXTS: Record<SceneId, LearningPredictionContext> = {
  'once-vs-always': {
    label: 'As áreas do projeto',
    explanation:
      'Nesta experiência, vamos pôr ações em áreas diferentes e avançar quadros para ver quando cada uma age.',
  },
  'fixed-vs-read': {
    label: 'Um número escrito ou lido',
    explanation: 'Nesta experiência, você escolhe de onde vem o x de um tiro quando ele nasce.',
  },
  'collision-pair': {
    label: 'Um encontro entre dois grupos',
    explanation:
      'Nesta experiência, um tiro encontra uma pedra. Você escolhe quem cada comando tira depois da batida.',
  },
  invincibility: {
    label: 'Uma proteção que conta para trás',
    explanation:
      'Nesta experiência, três pedras vão encostar na nave em quadros diferentes. Você escolhe por quantos quadros uma batida protege da próxima.',
  },
  'number-line': {
    label: 'Uma régua dos valores abaixo de zero',
    explanation:
      'Nesta experiência, você move um marcador entre -12 e 0 e observa a resposta de uma comparação com -9.',
  },
  'unique-names': {
    label: 'Um nome para cada coisa',
    explanation:
      'Nesta experiência, os blocos procuram o nome nave. Você muda quem o cria e escolhe o nome da folha.',
  },
  'motion-amount': {
    label: 'A diferença entre dois quadros',
    explanation:
      'Nesta experiência, dois desenhos da pedra alternam na Prévia. Você escolhe o quanto uma cratera e o corpo mudam de lugar.',
  },
  'two-clocks': {
    label: 'Nascimento e giro',
    explanation:
      'Nesta experiência, um relógio cria pedras e outro troca o desenho de cada pedra. Você mexe em cada ritmo separadamente.',
  },
  'copy-vs-original': {
    label: 'Um arquivo entre dois jogos',
    explanation:
      'Nesta experiência, você exporta um jogo da aula e importa o arquivo no Estúdio. Depois pode mudar cada lado separadamente.',
  },
  'published-copy': {
    label: 'O projeto e o Mural',
    explanation:
      'Nesta experiência, Publicar cria uma cópia do jogo no Mural. O projeto continua com você para mudar.',
  },
  'same-rules-new-skin': {
    label: 'As regras e os desenhos do mesmo jogo',
    explanation:
      'Nesta experiência, você troca os desenhos de um jogo sem mudar suas regras. Depois desliga uma regra e joga de novo.',
  },
  coordinates: {
    label: 'Os números x e y',
    explanation:
      'Nesta experiência, vamos usar os números x e y para escolher onde o personagem aparece na tela do jogo.',
  },
  'screen-reader': {
    label: 'Ouvir a tela',
    explanation:
      'Nesta experiência, vamos usar o botão “Ouvir a tela”. Ele lê em voz alta o que aparece no jogo.',
  },
  'stage-size': {
    label: 'A borda da tela do jogo',
    explanation:
      'Nesta experiência, vamos olhar a tela do jogo e a borda que mostra onde ela termina.',
  },
  'draw-loop': {
    label: 'O desenho que se repete',
    explanation:
      'Nesta experiência, vamos observar o que acontece quando o jogo desenha de novo em cada quadro.',
  },
  frames: {
    label: 'Os quadros da animação',
    explanation:
      'Nesta experiência, vamos olhar os quadros de uma animação antes de deixar a prévia tocar.',
  },
  'onion-skin': {
    label: 'O fantasma da animação',
    explanation:
      'Nesta experiência, vamos usar o fantasma que deixa um quadro antigo aparecer junto do quadro atual.',
  },
  symmetry: {
    label: 'O espelho do desenho',
    explanation:
      'Nesta experiência, vamos usar um espelho para copiar um traço para o outro lado do desenho.',
  },
  'pixel-vector': {
    label: 'A lupa das pedras',
    explanation:
      'Nesta experiência, vamos aproximar duas pedras para comparar como cada uma fica de perto.',
  },
  'sheet-vs-sprite': {
    label: 'O recorte da folha de sprites',
    explanation:
      'Nesta experiência, vamos escolher um pedaço de uma folha de desenhos para colocar no jogo.',
  },
  world: {
    label: 'Bastidores e tela do jogo',
    explanation:
      'Nesta experiência, vamos comparar o que existe nos bastidores com o que já aparece na tela do jogo.',
  },
  layers: {
    label: 'A ordem dos desenhos',
    explanation:
      'Nesta experiência, vamos organizar a ordem em que os desenhos entram para ver o que fica na frente.',
  },
  gravity: {
    label: 'A gravidade do pulo',
    explanation: 'Nesta experiência, vamos observar como a gravidade muda o caminho de um pulo.',
  },
  impulse: {
    label: 'A força do pulo',
    explanation:
      'Nesta experiência, vamos comparar o que muda quando o pulo começa com mais ou menos força.',
  },
  'jump-sound': {
    label: 'O som do pulo',
    explanation:
      'Nesta experiência, vamos comparar o som que o jogo faz com o jeito usado para pular.',
  },
  spawn: {
    label: 'O nascimento dos obstáculos',
    explanation:
      'Nesta experiência, vamos observar de onde os obstáculos surgem enquanto o jogo está rodando.',
  },
  cleanup: {
    label: 'A limpeza dos obstáculos',
    explanation:
      'Nesta experiência, vamos observar o que o jogo faz com um obstáculo que já saiu da tela.',
  },
  'game-state': {
    label: 'O estado do jogo',
    explanation:
      'Nesta experiência, vamos usar o estado do jogo para decidir o que pode acontecer em cada momento.',
  },
  controls: {
    label: 'Os controles do jogo',
    explanation:
      'Nesta experiência, vamos ligar um controle do jogo e observar o que ele permite fazer.',
  },
  'touch-response': {
    label: 'O esconderijo e o toque',
    explanation:
      'Nesta experiência, um personagem está atrás do esconderijo. Você vai testar o que acontece ao tocá-lo.',
  },
  'found-counter': {
    label: 'A contagem dos achados',
    explanation:
      'Nesta experiência, você vai observar o número que o jogo guarda durante uma busca.',
  },
  'lighthouse-key': {
    label: 'A porta do farol',
    explanation: 'Nesta experiência, você vai testar a mesma porta em duas situações.',
  },
  restart: {
    label: 'O botão de recomeçar',
    explanation:
      'Nesta experiência, vamos observar o que o jogo guarda e o que ele reinicia quando a partida recomeça.',
  },
  hitbox: {
    label: 'A área de colisão',
    explanation:
      'Nesta experiência, vamos comparar a área que encosta com o desenho que aparece no jogo.',
  },
  score: {
    label: 'O placar',
    explanation: 'Nesta experiência, vamos observar quando o placar do jogo muda.',
  },
  lives: {
    label: 'As vidas do jogador',
    explanation:
      'Nesta experiência, vamos observar o que acontece com as vidas durante uma partida.',
  },
  random: {
    label: 'O sorteio do jogo',
    explanation:
      'Nesta experiência, vamos usar um sorteio para escolher entre vários lugares possíveis.',
  },
  acceleration: {
    label: 'A aceleração',
    explanation: 'Nesta experiência, vamos observar como a velocidade muda enquanto o tempo passa.',
  },
  velocity: {
    label: 'A velocidade',
    explanation:
      'Nesta experiência, vamos comparar para onde o personagem vai quando a velocidade muda.',
  },
  'hold-vs-press': {
    label: 'A tecla apertada e segurada',
    explanation:
      'Nesta experiência, vamos comparar apertar uma tecla uma vez com manter a mesma tecla segurada.',
  },
  variable: {
    label: 'A caixa que guarda um número',
    explanation:
      'Nesta experiência, vamos observar uma caixa que guarda um número e muda durante o jogo.',
  },
  'group-loop': {
    label: 'O grupo de inimigos',
    explanation:
      'Nesta experiência, vamos observar como o jogo passa por cada inimigo de um grupo.',
  },
  'enemy-type': {
    label: 'O tipo de inimigo',
    explanation:
      'Nesta experiência, vamos escolher um tipo de inimigo e observar o que os novos inimigos recebem.',
  },
  camera: {
    label: 'A câmera do jogo',
    explanation:
      'Nesta experiência, vamos observar como a câmera mostra só uma parte de um mundo maior.',
  },
  contact: {
    label: 'O contato entre objetos',
    explanation:
      'Nesta experiência, vamos observar o que o jogo percebe quando dois objetos encostam.',
  },
  cooldown: {
    label: 'O tempo de espera',
    explanation:
      'Nesta experiência, vamos observar o tempo que o jogo espera antes de deixar uma ação acontecer de novo.',
  },
  aim: {
    label: 'A mira',
    explanation:
      'Nesta experiência, vamos apontar uma mira para descobrir o que ela consegue alcançar.',
  },
  diagonal: {
    label: 'O movimento na diagonal',
    explanation:
      'Nesta experiência, vamos comparar um movimento reto com um movimento que vai para dois lados ao mesmo tempo.',
  },
  tilemap: {
    label: 'O mapa de quadradinhos',
    explanation:
      'Nesta experiência, vamos observar como letras em um mapa viram partes do cenário do jogo.',
  },
  pool: {
    label: 'A caixa de objetos prontos',
    explanation:
      'Nesta experiência, vamos observar como o jogo guarda e reaproveita objetos que não estão na tela.',
  },
  'entity-state': {
    label: 'O estado de um personagem',
    explanation:
      'Nesta experiência, vamos observar como um personagem muda de estado durante o jogo.',
  },
  'delta-time': {
    label: 'O tempo entre os quadros',
    explanation:
      'Nesta experiência, vamos comparar como dois computadores podem deixar o jogo andar no mesmo ritmo.',
  },
  'circle-collision': {
    label: 'Dois círculos que encostam',
    explanation:
      'Nesta experiência, vamos observar a distância entre dois círculos para descobrir quando eles encostam.',
  },
  'axis-z': {
    label: 'O eixo z',
    explanation:
      'Nesta experiência, vamos usar o eixo z para escolher se algo fica mais perto ou mais longe.',
  },
  'camera-3d': {
    label: 'A câmera em três dimensões',
    explanation:
      'Nesta experiência, vamos girar uma câmera para observar o mesmo objeto por lados diferentes.',
  },
  mesh: {
    label: 'A malha do objeto',
    explanation:
      'Nesta experiência, vamos observar os pontos e as linhas que formam um objeto em três dimensões.',
  },
  'pick-ray': {
    label: 'O raio da mira',
    explanation:
      'Nesta experiência, vamos apontar um raio para descobrir qual objeto ele alcança primeiro.',
  },
  'fill-stroke': {
    label: 'Preenchimento e contorno',
    explanation: 'Nesta experiência, vamos comparar o miolo e a borda de um mesmo desenho.',
  },
  shading: {
    label: 'Luz e sombra',
    explanation:
      'Nesta experiência, vamos observar como luz e sombra mudam a aparência de uma forma.',
  },
}

/**
 * ⚠️ `Record<SceneId, …>`: o TS reprova a cena nova que chegar sem as duas perguntas.
 *
 * ⚠️⚠️ A ORDEM das alternativas é conteúdo, e foi alternada à mão (lote 2 do Raio-X, 16/09/2026).
 * Antes a resposta certa era a PRIMEIRA em 80 das 84 perguntas, e o player não embaralha: a
 * criança aprendia depressa que "a primeira é a certa", e o palpite deixava de ser palpite. Hoje
 * a certa vem primeiro em cerca de metade.
 *
 * ⚠️⚠️ E sem VAIVÉM (review do lote 2): a primeira alternância trocava a certa de lado em 37 de 44
 * cenas vizinhas, com trechos de onze em alternância perfeita, que é tão adivinhável quanto "a
 * primeira é a certa". `questions-order.test.ts` reprova trecho de alternância maior que 4 e de
 * repetição maior que 3, na ordem do catálogo E na ordem real de cada curso. Mudou uma ordem aqui?
 * Rode aquele teste: ele diz em que trecho quebrou.
 */
const SCENE_QUESTION_DEFINITIONS: Record<SceneId, SceneQuestionDefinition> = {
  /* ── A tela e quem a lê ──────────────────────────────────────────────────────────────────── */
  'fixed-vs-read': {
    prediction: {
      prompt:
        'O x do tiro está com o número 400 escrito. Você leva a nave para a beirada da direita e atira. De onde sai o tiro?',
      choices: [
        {
          id: 'nave',
          label: 'De perto da nave',
          shows: 'As duas marquinhas caíram no mesmo lugar: x 400.',
        },
        { id: 'meio', label: 'Do meio da tela, onde está o 400' },
      ],
      correctChoiceId: 'meio',
      revealOn: 'same-spot',
    },
    explain: {
      prompt: 'A nave anda o tempo todo. O que faz o tiro novo nascer sempre nela?',
      choices: [
        { id: 'leitura', label: 'Ler o centro x da nave na hora do disparo' },
        { id: 'escrito', label: 'Escrever o número 400 no x do tiro' },
      ],
      correctChoiceId: 'leitura',
      explanation:
        'O número escrito fica igual. O bloco de leitura pergunta onde a nave está na hora do disparo. O tiro que já saiu segue o caminho dele.',
    },
  },
  'collision-pair': {
    prediction: {
      prompt:
        'Três tiros e três pedras estão no jogo. Um tiro encosta numa pedra, e o comando manda tirar o grupo asteroides. O que some?',
      choices: [
        {
          id: 'uma',
          label: 'Só a pedra que foi atingida',
          shows: 'O contador de pedras foi de 3 para 0.',
        },
        { id: 'todas', label: 'Todas as pedras do jogo' },
      ],
      correctChoiceId: 'todas',
      revealOn: 'whole-group',
    },
    explain: {
      prompt: 'Dentro dessa colisão, quem é asteroide?',
      choices: [
        { id: 'uma', label: 'A pedra que participou daquele encontro' },
        { id: 'todas', label: 'Todas as pedras do grupo ao mesmo tempo' },
      ],
      correctChoiceId: 'uma',
      explanation:
        'O bloco dá um apelido para cada um dos dois que se encostaram. O apelido vale só dentro daquela trombada, e as outras pedras continuam no jogo.',
    },
  },
  invincibility: {
    prediction: {
      prompt:
        'Imagine a nave com três vidas e três pedras diferentes a caminho, com 45 quadros de proteção. Quantas vidas sobram?',
      choices: [
        {
          id: 'nenhuma',
          label: 'Nenhuma',
          shows: 'As três pedras bateram. Só a primeira tirou vida; restaram dois corações.',
        },
        { id: 'duas', label: 'Duas' },
      ],
      correctChoiceId: 'duas',
      revealOn: 'window',
    },
    explain: {
      prompt: 'Por que só a primeira batida tirou vida quando a proteção estava em 45?',
      choices: [
        { id: 'janela', label: 'Os danos seguintes foram ignorados enquanto a proteção contava' },
        { id: 'infinitas', label: 'A nave ficou com vidas infinitas até o fim da partida' },
      ],
      correctChoiceId: 'janela',
      explanation:
        'A proteção é uma janela de tempo. Enquanto conta, dano novo não entra. Quando chega a zero, a próxima batida volta a tirar vida.',
    },
  },
  'number-line': {
    prediction: {
      prompt: 'Na régua, qual dos dois é o maior: -5 ou -9?',
      choices: [
        { id: 'menos-cinco', label: '-5, porque está mais à direita' },
        {
          id: 'menos-nove',
          label: '-9, porque 9 é maior que 5',
          shows: 'Na régua, o -9 mora à esquerda do -5. Quem está mais à direita é o maior.',
        },
      ],
      correctChoiceId: 'menos-cinco',
      revealOn: 'greater',
    },
    explain: {
      prompt: 'Se o sinal ficar no igual, o que acontece com uma base que começa em -5?',
      choices: [
        { id: 'para', label: 'Ela para no -9, igual.' },
        { id: 'nao-muda', label: 'Ela nunca muda, porque -5 não é igual a -9' },
      ],
      correctChoiceId: 'nao-muda',
      explanation:
        'Com o igual, a pergunta só diz sim no -9 exato. A base começa no -5, então a resposta é não já na primeira vez e ela fica parada.',
    },
  },
  'unique-names': {
    prediction: {
      prompt: 'Os dois blocos vão criar o nome nave. O que acontece?',
      choices: [
        {
          id: 'substitui',
          label: 'O segundo substitui o primeiro',
          shows: 'O nome “nave” já foi criado neste trecho; escolha um nome diferente.',
        },
        { id: 'aviso', label: 'O Estúdio pede um nome diferente' },
      ],
      correctChoiceId: 'aviso',
      revealOn: 'clash',
    },
    explain: {
      prompt: 'No seu jogo, o sprite já se chama nave. Que nome dar para a folha de quadros dele?',
      choices: [
        { id: 'folha', label: 'folha-nave, um nome só dela' },
        { id: 'nave', label: 'nave, porque é o desenho da nave' },
      ],
      correctChoiceId: 'folha',
      explanation:
        'Quando dois blocos criam o mesmo nome no mesmo trecho, o Estúdio para e pede um nome diferente. Por isso a folha recebe o nome dela e a nave continua com o nome dela.',
    },
  },
  'motion-amount': {
    prediction: {
      prompt: 'Os dois quadros são iguais. O que a Prévia mostra?',
      choices: [
        {
          id: 'gira',
          label: 'Uma pedra girando',
          shows: 'Trocar depressa dois desenhos iguais não faz movimento nenhum.',
        },
        { id: 'parada', label: 'Uma pedra parada' },
      ],
      correctChoiceId: 'parada',
      revealOn: 'no-change',
    },
    explain: {
      prompt: 'Você quer que a sua pedra pareça rolando. O que muda no segundo quadro?',
      choices: [
        { id: 'detalhe', label: 'Uma cratera e uma ponta do fogo, um pouquinho' },
        { id: 'corpo', label: 'A pedra inteira, para um canto bem diferente' },
      ],
      correctChoiceId: 'detalhe',
      explanation:
        'O olho lê rolagem quando o corpo fica no lugar e os detalhes andam um pouco. Quando o corpo inteiro muda de lugar, o olho lê um pulo.',
    },
  },
  'two-clocks': {
    prediction: {
      prompt: 'Se as pedras nascerem mais juntas, o giro de cada uma fica mais rápido?',
      choices: [
        {
          id: 'sim',
          label: 'Fica, porque é o mesmo relógio',
          shows:
            'Nasceram mais pedras, mas o número de desenhos por segundo de cada uma ficou em 8.',
        },
        { id: 'nao', label: 'Não, o giro continua igual' },
      ],
      correctChoiceId: 'nao',
      revealOn: 'more-rocks',
    },
    explain: {
      prompt: 'Onde encaixar o bloco que manda a pedra girar?',
      choices: [
        { id: 'depois', label: 'Logo depois do bloco que cria a pedra, dentro do mesmo relógio' },
        { id: 'inicio', label: 'Uma vez só, no Ao iniciar' },
      ],
      correctChoiceId: 'depois',
      explanation:
        'A pedra só existe depois de nascer. O bloco de animar precisa estar logo depois do de criar, dentro do mesmo relógio, para alcançar cada pedra nova.',
    },
  },
  'copy-vs-original': {
    prediction: {
      prompt:
        'Você exporta o jogo que está na aula do Desafio. O que acontece com o jogo que estava lá?',
      choices: [
        { id: 'continua', label: 'Ele continua na aula, inteiro' },
        {
          id: 'sai',
          label: 'Ele sai da aula e vai para dentro do arquivo',
          shows: 'O jogo continuou na aula. O arquivo levou uma cópia.',
        },
      ],
      correctChoiceId: 'continua',
      revealOn: 'exported',
    },
    explain: {
      prompt: 'Você pintou a nave de outra cor no projeto do Estúdio. E a nave do jogo da aula?',
      choices: [
        { id: 'junto', label: 'Muda junto, porque é o mesmo jogo' },
        { id: 'antes', label: 'Continua com a cor de antes' },
      ],
      correctChoiceId: 'antes',
      explanation:
        'O arquivo levou uma cópia. Depois de importar, são dois jogos separados: cada um guarda o que você fizer nele.',
    },
  },
  'published-copy': {
    prediction: {
      prompt:
        'Depois de publicar, você troca a cor da nave no seu projeto. O que acontece com a do Mural?',
      choices: [
        {
          id: 'junto',
          label: 'Ela troca de cor junto',
          shows: 'A do Mural é uma cópia. Ela ficou como estava quando você publicou.',
        },
        { id: 'antes', label: 'Ela continua com a cor de antes' },
      ],
      correctChoiceId: 'antes',
      revealOn: 'only-project',
    },
    explain: {
      prompt:
        'Uma semana depois de publicar, você melhora o seu jogo. Como o Mural passa a mostrar a versão nova?',
      choices: [
        { id: 'de-novo', label: 'Publicando de novo' },
        { id: 'sozinho', label: 'Sozinho, assim que você salva' },
      ],
      correctChoiceId: 'de-novo',
      explanation:
        'Publicar tira uma cópia do jogo naquele momento. Para mostrar a versão nova, você publica de novo: o Mural ganha outro cartão, e a publicação anterior continua lá.',
    },
  },
  'same-rules-new-skin': {
    prediction: {
      prompt: 'Trocando a nave por um carrinho, o que muda no jogo?',
      choices: [
        { id: 'desenho', label: 'O desenho, e as regras continuam' },
        {
          id: 'regras',
          label: 'As regras também, porque é outro jogo',
          shows: 'Nenhuma regra apagou. O que mudou foram os desenhos.',
        },
      ],
      correctChoiceId: 'desenho',
      revealOn: 'skin-only',
    },
    explain: {
      prompt: 'Um criador trocou a nave por um carrinho e tirou o tiro. O que ele mudou?',
      choices: [
        { id: 'tema', label: 'Só o tema, porque ele só trocou desenho' },
        { id: 'ambos', label: 'O tema e também a mecânica, porque uma regra saiu' },
      ],
      correctChoiceId: 'ambos',
      explanation:
        'Trocar desenho muda o tema. Tirar, pôr ou mudar uma regra muda a mecânica. Dá para fazer uma sem a outra, e dá para fazer as duas.',
    },
  },
  'once-vs-always': {
    prediction: {
      prompt: 'Uma ficha em Ao iniciar age quantas vezes quando o jogo começa?',
      choices: [
        { id: 'uma', label: 'Uma vez, no começo.' },
        {
          id: 'sempre',
          label: 'Uma vez em cada passo.',
          shows: 'Depois de três passos, o contador da ficha em Ao iniciar marcou 1.',
        },
      ],
      correctChoiceId: 'uma',
      revealOn: 'once',
    },
    explain: {
      prompt: 'Uma ação prepara o jogo; outra continua enquanto ele funciona. Onde vai cada uma?',
      choices: [
        { id: 'juntas', label: 'As duas em Enquanto estiver rodando.' },
        { id: 'separadas', label: 'Preparar em Ao iniciar; repetir no motor.' },
      ],
      correctChoiceId: 'separadas',
      explanation:
        'Ao iniciar acontece uma vez. Enquanto estiver rodando continua agindo a cada passo do jogo.',
    },
  },
  coordinates: {
    prediction: {
      prompt: 'Se você AUMENTAR o y, para onde o Dino vai?',
      choices: [
        { id: 'cima', label: 'Para cima', shows: 'Aumentando o y, o Dino desceu.' },
        { id: 'baixo', label: 'Para baixo' },
      ],
      correctChoiceId: 'baixo',
      revealOn: 'down',
    },
    explain: {
      // ⚠️ Aplicar num caso novo, que é o que o pulo da Aula 3 vai pedir. A pergunta antiga ("o
      // que é o endereço?") tinha como errada "um número só", que ninguém escolhe.
      prompt: 'Você quer o Dino mais perto da beirada de baixo da tela. O que faz com o y?',
      choices: [
        { id: 'diminui', label: 'Diminuo o y.' },
        { id: 'aumenta', label: 'Aumento o y.' },
      ],
      correctChoiceId: 'aumenta',
      explanation:
        'Na tela, o y começa em 0 lá no alto. Quanto maior o y, mais embaixo o Dino fica.',
    },
  },
  'screen-reader': {
    prediction: {
      // ⚠️ "Quem não enxerga consegue saber como se joga?" já dizia a resposta na pergunta, e a
      // errada ("o desenho conta sozinho") era espantalho. A crença de verdade é achar que o
      // computador descreve o desenho.
      prompt:
        'Quando você apertar “Ouvir a tela” sem escrever uma descrição do jogo, o que o leitor de tela vai dizer?',
      choices: [
        {
          id: 'dino',
          label: 'Um Dino correndo e pulando cactos.',
          // ⚠️ Com aspas: sem elas "Tela do jogo. Imagem." se lia como duas frases soltas.
          shows: 'O leitor de tela disse só "Tela do jogo. Imagem."',
        },
        { id: 'imagem', label: 'Só "Tela do jogo. Imagem."' },
      ],
      correctChoiceId: 'imagem',
      revealOn: 'heard-empty',
    },
    explain: {
      prompt: 'Qual frase ajuda mais quem não está vendo a tela?',
      choices: [
        { id: 'ajuda', label: 'Corra com o Dino e pule os cactos apertando espaço.' },
        { id: 'vaga', label: 'Um jogo muito legal com o Dino.' },
      ],
      correctChoiceId: 'ajuda',
      explanation:
        'A frase que serve diz o que fazer no jogo e como jogar. Sem ela, quem usa o leitor de tela ouve só que ali tem uma imagem.',
    },
  },
  'stage-size': {
    prediction: {
      prompt: 'Sem a borda, dá para ver onde a tela do jogo acaba?',
      choices: [
        { id: 'nao', label: 'Não dá, a tela some no fundo.' },
        {
          id: 'da',
          label: 'Dá, a tela aparece sozinha.',
          shows: 'Sem a borda, a tela sumia no fundo, e só apareceu quando a borda ligou.',
        },
      ],
      correctChoiceId: 'nao',
      revealOn: 'border-on',
    },
    explain: {
      prompt: 'Quem decide o tamanho da tela do jogo?',
      choices: [
        { id: 'monitor', label: 'O tamanho do monitor de quem joga.' },
        { id: 'escolha', label: 'Você, com dois números: largura e altura.' },
      ],
      correctChoiceId: 'escolha',
      explanation:
        'A tela do jogo é uma medida que você escolhe. A borda só mostra esse limite. Ela não cria o limite.',
    },
  },
  'draw-loop': {
    prediction: {
      prompt: 'Se o jogo desenhar sem limpar antes, o que aparece?',
      choices: [
        {
          id: 'um',
          label: 'Um Dino só, andando',
          shows: 'Sem limpar, os desenhos de antes continuaram na tela.',
        },
        // ⚠️ "Um rastro de vários Dinos" saía "Um rastro de vários naves" com o elenco.
        { id: 'rastro', label: 'Um rastro de Dinos' },
      ],
      correctChoiceId: 'rastro',
      revealOn: 'trail',
    },
    explain: {
      prompt: 'O que faz o desenho parecer que se mexe?',
      choices: [
        { id: 'repetir', label: 'Desenhar de novo a cada quadro, limpando antes.' },
        { id: 'empurrar', label: 'Empurrar o desenho que já estava lá.' },
      ],
      correctChoiceId: 'repetir',
      explanation:
        'O jogo apaga e redesenha muitas vezes por segundo. Sem desenhar de novo, a tela não muda; sem limpar, sobra rastro.',
    },
  },

  /* ── Desenho e animação ──────────────────────────────────────────────────────────────────── */
  frames: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X: a pergunta é sobre o fogo que PULSA rápido, e a resposta aparece quando
      // a prévia rápida para. Ids novos: "Com a troca ligada" perguntava outra coisa.
      prompt: 'Quando o fogo pulsa rápido, o que está na tela?',
      choices: [
        {
          id: 'misturados',
          label: 'Os dois quadros misturados',
          shows: 'Quando a prévia rápida parou, ficou um quadro só na tela.',
        },
        { id: 'um-de-cada-vez', label: 'Um quadro de cada vez' },
      ],
      correctChoiceId: 'um-de-cada-vez',
      revealOn: 'paused-one',
    },
    explain: {
      prompt: 'Duplicar o quadro já basta para o fogo parecer pulsar?',
      choices: [
        { id: 'mudar', label: 'É preciso mudar o fogo num dos dois quadros.' },
        { id: 'iguais', label: 'Sim, dois desenhos iguais trocando depressa já pulsam.' },
      ],
      correctChoiceId: 'mudar',
      explanation:
        'Com dois quadros iguais, a prévia troca sem mudar a imagem. O fogo só pulsa quando os quadros mostram fogos diferentes.',
    },
  },
  'onion-skin': {
    prediction: {
      // ⚠️⚠️ Lote 5: o que muda entre os quadros é o FOGO. Ids novos: "o passo" era outra pergunta.
      prompt:
        'No quadro 2 só aparece o fogo novo. Dá para saber se ele ficou maior que o do quadro 1?',
      choices: [
        // ⚠️ Sem a justificativa (full review de experiência, B8): "o fogo 1 não está na tela" entregava a
        // certa pelo jeito de escrever. Mesmo sentido, mesmos ids.
        { id: 'nao-da', label: 'Não dá para saber' },
        {
          id: 'olhar',
          label: 'Dá, é só olhar o fogo 2',
          // ⚠️ "Tracejado" (consertos do review da onda B do lote 5, A2): o fantasma é o contorno do fogo
          // 1 por cima do fogo 2, e não um fogo clarinho por baixo.
          shows:
            'Com o fantasma ligado, o fogo 1 apareceu tracejado. Sem o fantasma, o fogo 1 não aparecia.',
        },
      ],
      correctChoiceId: 'nao-da',
      revealOn: 'ghost-on',
    },
    explain: {
      prompt: 'Para que serve o fantasma do quadro anterior?',
      choices: [
        { id: 'aparecer', label: 'Para aparecer no jogo junto com o desenho.' },
        { id: 'comparar', label: 'Para comparar sem precisar decorar.' },
      ],
      correctChoiceId: 'comparar',
      explanation:
        'O fantasma é uma guia de quem desenha, não parte do jogo. Ele deixa você ver o fogo de antes e o de agora juntos.',
    },
  },
  symmetry: {
    prediction: {
      // ⚠️⚠️ Lote 5: o espelho do Pinta, no meio. "Um, só que mais grosso" era o que o desenho
      // mostrava de verdade quando o traço encostava no eixo. Ids novos: a pergunta mudou.
      prompt:
        'Você pinta a asa do lado esquerdo com o Espelho lado a lado ligado. Onde aparece a outra asa?',
      choices: [
        {
          id: 'grudada',
          label: 'Grudada na primeira, deixando a asa mais grossa',
          shows: 'A outra asa apareceu do outro lado do meio, virada.',
        },
        { id: 'outro-lado', label: 'Do outro lado do meio, virada' },
      ],
      correctChoiceId: 'outro-lado',
      revealOn: 'two-sides',
    },
    explain: {
      prompt: 'Com o Espelho lado a lado ligado, o que aparece dos dois lados?',
      choices: [
        { id: 'tracos', label: 'O que você pinta com o Lápis, com a Linha e com a Borracha.' },
        { id: 'tudo', label: 'Tudo, inclusive o que você enche com o Balde de tinta.' },
      ],
      correctChoiceId: 'tracos',
      explanation:
        'O espelho copia os traços enquanto você pinta. O Balde preenche uma região só, mesmo com o espelho ligado.',
    },
  },
  'pixel-vector': {
    prediction: {
      // ⚠️ O erro típico é o de quem amplia foto: achar que TODA borda vira degrau de perto.
      // ⚠️ Lote 5: revela em `stairs`, com as duas pedras na MESMA lupa a partir de 3.
      prompt: 'Se você aproximar muito, o que acontece com as bordas?',
      choices: [
        { id: 'so-pixel', label: 'Só a de pixel vira degraus' },
        {
          id: 'as-duas',
          label: 'As duas viram degraus',
          shows: 'De perto, a borda da pedra de vetor continuou lisa.',
        },
      ],
      correctChoiceId: 'so-pixel',
      revealOn: 'stairs',
    },
    explain: {
      prompt: 'Qual é a diferença entre as duas pedras?',
      choices: [
        // ⚠️ "A cor e o tamanho" era espantalho: as duas pedras têm a mesma cor. Id novo: outro sentido.
        { id: 'menores', label: 'A de vetor é feita de quadradinhos bem menores.' },
        { id: 'como', label: 'Como cada uma é guardada: quadradinhos ou pontos e curvas.' },
      ],
      correctChoiceId: 'como',
      explanation:
        'Uma é feita de quadradinhos, e aproximar mostra os quadradinhos. A outra guarda os pontos e as curvas, e é refeita do tamanho que precisar.',
    },
  },
  'sheet-vs-sprite': {
    prediction: {
      // ⚠️⚠️ Lote 5: a demonstração da Aula 6 já respondia "a folha muda?" e a experimentação fazia a
      // mesma pergunta. A do modelo agora é a da largura do recorte. Ids novos.
      prompt: 'Os quadros da nave têm 32 de largura. Com um recorte de 16, o que aparece no jogo?',
      choices: [
        { id: 'metade', label: 'Metade da nave, esticada' },
        {
          id: 'inteira',
          label: 'A nave inteira, menor',
          shows: 'Com o recorte de 16, o jogo mostrou só metade da nave, esticada.',
        },
      ],
      correctChoiceId: 'metade',
      revealOn: 'crop-half',
    },
    explain: {
      prompt: 'Por que o recorte da folha da nave precisa ter 32 de largura?',
      choices: [
        { id: 'jogo', label: 'Porque a nave aparece com 32 no jogo.' },
        { id: 'quadro', label: 'Porque cada quadro da folha tem 32 de largura.' },
      ],
      correctChoiceId: 'quadro',
      explanation:
        'A folha tem dois quadros de 32 lado a lado. Um recorte de 32 pega um quadro inteiro; o tamanho no jogo é escolhido à parte.',
    },
  },

  /* ── O mundo do jogo ─────────────────────────────────────────────────────────────────────── */
  world: {
    prediction: {
      prompt:
        'Imagine: o Dino já está nos bastidores, mas ainda não apareceu na tela do jogo. Onde está o Dino?',
      choices: [
        { id: 'bastidores', label: 'Nos bastidores, sem aparecer na tela.' },
        {
          id: 'nenhum',
          label: 'Em lugar nenhum. O Dino só existe quando aparece na tela.',
          shows: 'A ficha do Dino ficou nos bastidores, com a tela vazia.',
        },
      ],
      correctChoiceId: 'bastidores',
      revealOn: 'hidden',
    },
    explain: {
      prompt: 'Por que o Dino pode existir nos bastidores sem aparecer na tela?',
      choices: [
        { id: 'duas', label: 'Criar o Dino e mostrar na tela são duas ações diferentes.' },
        { id: 'lento', label: 'O jogo ainda estava carregando o Dino.' },
      ],
      correctChoiceId: 'duas',
      explanation:
        'Criar prepara o Dino nos bastidores. Mostrar na tela é outra ação. Tirar da tela faz o Dino deixar de aparecer, sem apagar o que foi criado.',
    },
  },
  layers: {
    prediction: {
      // ⚠️ A seção é "Quem fica na frente?", e a previsão antiga perguntava se a peça de trás
      // EXISTE, com a ponta do Dino à vista embaixo. ⚠️ Sem particípio ("for desenhado"): o elenco
      // não flexiona o que vem depois de "for".
      prompt: 'Na ordem de desenhar, o Dino vem DEPOIS da floresta. Onde o Dino aparece?',
      choices: [
        {
          id: 'atras',
          label: 'Atrás da floresta',
          shows: 'O Dino ficou na frente da floresta.',
        },
        { id: 'frente', label: 'Na frente da floresta' },
      ],
      correctChoiceId: 'frente',
      revealOn: 'front',
    },
    explain: {
      prompt: 'Quem aparece por cima?',
      choices: [
        { id: 'primeiro', label: 'A peça desenhada primeiro.' },
        { id: 'ultimo', label: 'A peça desenhada por último.' },
      ],
      correctChoiceId: 'ultimo',
      explanation:
        'O jogo pinta uma peça de cada vez. A última pintura fica por cima das outras, como um adesivo colado depois.',
    },
  },
  gravity: {
    prediction: {
      prompt: 'A gravidade está desligada, e o Dino pula. O que acontece?',
      choices: [
        {
          id: 'volta',
          label: 'Sobe e volta ao chão',
          shows: 'Sem gravidade, o Dino continuou subindo e não voltou.',
        },
        { id: 'sobe', label: 'Sobe e não para mais' },
      ],
      correctChoiceId: 'sobe',
      revealOn: 'floating',
    },
    explain: {
      prompt: 'Por que o Dino voltou ao chão?',
      choices: [
        // ⚠️ "O chão atrai quem está no ar" era espantalho. O erro de verdade é achar que o pulo
        // perde a força sozinho, e a explicação antiga ("um empurrão que acaba") reforçava isso.
        { id: 'forca', label: 'O pulo perde a força sozinho.' },
        { id: 'gravidade', label: 'A gravidade puxa para baixo o tempo todo.' },
      ],
      correctChoiceId: 'gravidade',
      explanation:
        'O pulo dá ao Dino uma velocidade para cima. Sem gravidade ela nunca acaba, e o Dino sobe para sempre. A gravidade tira um pouco dessa velocidade a cada quadro, até a subida virar descida.',
    },
  },
  impulse: {
    prediction: {
      // ⚠️ "Um impulso maior leva mais alto?" ninguém erra. O erro típico é achar que a altura
      // cresce na MESMA proporção do número: com 9 o salto chega a 68, com 14 passa de 160.
      prompt:
        'Com impulso 9, o salto chega a 68 de altura. Com impulso 14, até onde o salto chega?',
      // ⚠️⚠️ Ids NOVOS (review do lote 2): `igual` já foi "Não, a altura é sempre a mesma", e o palpite
      // antigo apareceria ao professor com a frase de "Uns 100".
      choices: [
        { id: 'mais-150', label: 'Mais de 150, mais que o dobro' },
        {
          id: 'uns-100',
          label: 'Uns 100, um pouco mais alto',
          shows: 'Com impulso 14, o salto passou de 150 de altura.',
        },
      ],
      correctChoiceId: 'mais-150',
      revealOn: 'other-height',
    },
    explain: {
      prompt: 'Quem decide a altura do salto?',
      choices: [
        { id: 'impulso', label: 'A força do impulso, contra a mesma gravidade.' },
        { id: 'tempo', label: 'O tempo que você segura a tecla.' },
      ],
      correctChoiceId: 'impulso',
      explanation:
        'A gravidade não mudou. Um empurrão maior faz a subida durar mais, e por isso a altura cresce muito.',
    },
  },
  'jump-sound': {
    prediction: {
      // ⚠️ "O som DEVE tocar…?" pedia opinião, e o título da Aula 4 respondia.
      prompt:
        'O som ainda escuta a tecla Espaço. Com o Dino no ar, você aperta Espaço de novo. O que acontece?',
      choices: [
        {
          id: 'nada',
          label: 'Nada: sem pulo novo, sem som',
          // ⚠️ "pulo", a palavra da cena, e o que OLHAR (a coluna da linha do tempo), sem a conta "os sons
          // passaram dos saltos" nem a certa repetida (consertos do review da onda A do lote 5).
          shows: 'A linha do tempo ganhou um som sem pulo.',
        },
        { id: 'toca', label: 'Toca o som, e o Dino não pula de novo' },
      ],
      correctChoiceId: 'toca',
      revealOn: 'false-sound',
    },
    explain: {
      // ⚠️ Com o nome da caixa para onde a PEÇA foi (lote 5 do Raio-X): o fio "Som → Pulou" saiu.
      prompt: 'Por que Tocar efeito foi para Quando o Dino pular?',
      choices: [
        {
          id: 'acontece',
          label: 'Assim o som toca uma vez por pulo, venha da tecla ou do toque.',
        },
        { id: 'igual', label: 'Tanto faz: a tecla e o pulo tocam nas mesmas horas.' },
      ],
      correctChoiceId: 'acontece',
      explanation:
        'A tecla é o que você faz. O pulo é o que o Dino faz. Nem toda tecla vira pulo, e tocar na tela também faz pular. O som que escuta o pulo nunca erra.',
    },
  },
  spawn: {
    prediction: {
      // ⚠️ "a tela", e não "a pista": o Desafio e o Meu Jeito usam a cena no espaço.
      prompt: 'Criando um cacto em CADA quadro, como fica a tela?',
      choices: [
        { id: 'parede', label: 'Uma parede de cactos' },
        {
          id: 'espacada',
          label: 'Cactos bem espaçados',
          shows: 'Em um segundo nasceram cactos colados uns nos outros.',
        },
      ],
      correctChoiceId: 'parede',
      revealOn: 'every-frame',
    },
    explain: {
      prompt: 'O que abriu espaço entre os cactos?',
      choices: [
        { id: 'velocidade', label: 'Deixar os cactos mais rápidos.' },
        { id: 'intervalo', label: 'Esperar um tempo entre uma criação e a outra.' },
      ],
      correctChoiceId: 'intervalo',
      explanation:
        // ⚠️ "deles" não concorda com um obstáculo feminino.
        'A velocidade dos cactos não mudou. O que mudou foi o tempo entre um nascimento e o seguinte, e é isso que vira espaço.',
    },
  },
  cleanup: {
    prediction: {
      prompt: 'Um cacto sai pela esquerda da tela. E agora?',
      choices: [
        { id: 'fica', label: 'Continua no grupo, fora da vista' },
        {
          id: 'some',
          label: 'Some do jogo',
          // ⚠️ Os NÚMEROS, e não "saiu da tela e continua no grupo", que era a certa repetida.
          // ⚠️ A PRATELEIRA (consertos do review da onda A do lote 5): desde o redesenho a prova é o
          // desenho dos bastidores, e não os números da faixa.
          shows: 'Os cactos que saíram foram para a prateleira dos bastidores.',
        },
      ],
      correctChoiceId: 'fica',
      revealOn: 'invisible-stored',
    },
    explain: {
      prompt: 'Por que é preciso uma regra para retirar os cactos que saem?',
      choices: [
        {
          id: 'acumula',
          label: 'Porque sair da tela não apaga nada: eles se acumulam nos bastidores.',
        },
        { id: 'volta', label: 'Porque senão eles voltam pelo outro lado.' },
      ],
      correctChoiceId: 'acumula',
      explanation:
        'A tela é só a janela. Quem saiu dela continua no grupo, ocupando lugar, até alguém mandar retirar.',
    },
  },
  'game-state': {
    prediction: {
      // ⚠️ A pergunta antiga ("já DEVERIA estar contando?") pedia opinião, com a certa ao
      // contrário do que a cena mostra primeiro. Esta é a do professor da Aula 7: um fato.
      prompt: 'No início, antes de começar, nascem cactos?',
      // ⚠️⚠️ Ids NOVOS (review do lote 2): `espera` já foi a CERTA ("Não, deve esperar"), e hoje é a
      // errada. Com o id velho, um palpite guardado mudava de lado sem ninguém ver.
      choices: [
        {
          id: 'so-depois',
          label: 'Não, só depois de começar',
          shows: 'Os cactos nasceram no início, antes de começar.',
        },
        { id: 'ja-nascem', label: 'Sim, já nascem' },
      ],
      correctChoiceId: 'ja-nascem',
      revealOn: 'outside',
    },
    explain: {
      prompt: 'O que faz Criar cacto esperar no início?',
      choices: [
        { id: 'botao', label: 'O botão de começar, que liga o relógio.' },
        { id: 'condicao', label: 'Uma condição: só criar cactos enquanto estiver jogando.' },
      ],
      correctChoiceId: 'condicao',
      explanation:
        'O relógio está sempre lá. A condição é um guarda na porta: ela deixa passar só quando a partida está acontecendo.',
    },
  },
  controls: {
    prediction: {
      // ⚠️ A certa antiga ("alguém precisa ligar o toque") já trazia o conserto dentro dela.
      // ⚠️ "Você toca na tela" (lote 5 do Raio-X): a tela inteira é a área de toque, e o botão
      // "Toque para começar" deixou de existir.
      prompt: 'Você toca na tela de início. O que acontece?',
      choices: [
        { id: 'comeca', label: 'A partida começa', shows: 'A tela continuou no INÍCIO.' },
        { id: 'nada', label: 'Nada acontece' },
      ],
      correctChoiceId: 'nada',
      revealOn: 'missing-touch',
    },
    explain: {
      prompt: 'Por que tocar não começava a partida?',
      choices: [
        { id: 'texto', label: 'O convite estava escrito errado.' },
        { id: 'ligacao', label: 'Nada no jogo escutava o toque.' },
      ],
      correctChoiceId: 'ligacao',
      explanation:
        // ⚠️ Sem "o evento escuta" e "a promessa virou verdade" (full review de experiência, B11).
        'Escrever toque na tela não liga nada. O jogo só começa quando o toque está na caixa que chama Começar. Agora o convite e o jogo dizem a mesma coisa.',
    },
  },
  'touch-response': {
    prediction: {
      prompt: 'O que muda quando um toque ganha uma ação?',
      choices: [
        { id: 'responde', label: 'O jogo pode responder ao toque.' },
        {
          id: 'nada',
          label: 'O jogo continua igual.',
          shows: 'Com a reação ligada, o personagem apareceu depois do toque.',
        },
      ],
      correctChoiceId: 'responde',
      revealOn: 'responds',
    },
    explain: {
      prompt: 'O que fez o personagem aparecer?',
      choices: [
        { id: 'toque', label: 'O toque ligado à ação de revelar.' },
        { id: 'tempo', label: 'Esperar o tempo passar.' },
      ],
      correctChoiceId: 'toque',
      explanation: 'O toque foi o acontecimento. A ação ligada a ele revelou o personagem.',
    },
  },
  'found-counter': {
    prediction: {
      prompt: 'Imagine que você procurou, mas não achou ninguém. O número Achados mudaria?',
      choices: [
        { id: 'nao', label: 'Não, porque ninguém foi encontrado.' },
        {
          id: 'sim',
          label: 'Sim, porque eu procurei.',
          shows: 'Ao procurar sem encontrar, Achados não mudou.',
        },
      ],
      correctChoiceId: 'nao',
      revealOn: 'no-find',
    },
    explain: {
      prompt: 'Quando Achados aumenta?',
      choices: [
        { id: 'qualquer-busca', label: 'Sempre que eu procuro.' },
        { id: 'encontro', label: 'Quando encontro mais um personagem.' },
      ],
      correctChoiceId: 'encontro',
      explanation: 'Achados guarda quantos personagens foram encontrados nesta busca.',
    },
  },
  'lighthouse-key': {
    prediction: {
      prompt: 'O personagem chega à porta sem a chave. O que você acha que acontece?',
      choices: [
        { id: 'abre', label: 'A porta abre.', shows: 'A porta continuou fechada.' },
        { id: 'fecha', label: 'A porta continua fechada.' },
      ],
      correctChoiceId: 'fecha',
      revealOn: 'locked-without-key',
    },
    explain: {
      prompt: 'Por que a mesma porta abriu na segunda tentativa?',
      choices: [
        { id: 'tempo', label: 'Porque passou mais tempo.' },
        { id: 'chave', label: 'Porque o personagem estava com a chave.' },
      ],
      correctChoiceId: 'chave',
      explanation: 'O jogo conferiu se o personagem tinha a chave antes de abrir a porta.',
    },
  },
  restart: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X: "recomeça sozinha?" não era a crença ingênua da aula. O erro típico é
      // achar que voltar para o início já recomeça, e a pista com os cactos mostra que não.
      // Ids novos: a pergunta mudou de sentido.
      prompt:
        'Se o toque no fim só voltar para a tela de início, o que acontece com os cactos da partida?',
      choices: [
        {
          id: 'somem',
          label: 'Somem sozinhos',
          shows: 'Os cactos da partida anterior continuaram na pista.',
        },
        { id: 'continuam', label: 'Continuam na pista' },
      ],
      correctChoiceId: 'continuam',
      revealOn: 'screen-only',
    },
    explain: {
      // ⚠️ Sem "placar": a cena não tem placar, e a Aula 9 vem antes de ele existir.
      prompt: 'O que Reiniciar o jogo faz que Mudar o estado do jogo para inicio não faz?',
      choices: [
        { id: 'tela', label: 'Só mostra a tela de início.' },
        { id: 'reinicia', label: 'Limpa a pista para a partida nova começar do zero.' },
      ],
      correctChoiceId: 'reinicia',
      explanation:
        'Trocar de tela não apaga nada. Se ninguém limpar a pista, a partida nova começa com os cactos da velha.',
    },
  },
  hitbox: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X: a cena abre com a área GRANDE, e a pergunta é sobre QUANDO aparece o
      // BATEU com ela. Ids novos: a pergunta mudou de sentido.
      prompt: 'Com esta área grande, quando vai aparecer BATEU?',
      // ⚠️ A certa em PRIMEIRO aqui, pela régua do vaivém (`questions-order.test.ts`).
      choices: [
        { id: 'antes', label: 'Antes de os desenhos se encostarem' },
        {
          id: 'desenhos',
          label: 'Só quando os desenhos se encostarem',
          shows: 'Apareceu BATEU com um vão entre os dois desenhos.',
        },
      ],
      correctChoiceId: 'antes',
      revealOn: 'contact',
    },
    explain: {
      prompt: 'O que o jogo usa para saber que houve batida?',
      choices: [
        { id: 'area', label: 'Áreas invisíveis em volta de cada um.' },
        { id: 'pixel', label: 'Os pixels coloridos de cada desenho.' },
      ],
      correctChoiceId: 'area',
      explanation:
        'O desenho é para os olhos; a área é para a conta. Diminuir só a área deixa a batida justa, sem mudar o tamanho do Dino.',
    },
  },
  score: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X: a pergunta é sobre o ERRO que a cena mostra primeiro (a peça solta
      // soma até no início). Ids novos: a pergunta mudou de sentido.
      prompt: 'Com Somar ponto solto, o placar cresce na tela de início?',
      // ⚠️ A certa em PRIMEIRO aqui, pela régua do vaivém (`questions-order.test.ts`).
      choices: [
        { id: 'cresce-no-inicio', label: 'Sim, cresce até no início' },
        {
          id: 'espera',
          label: 'Não, espera o jogo começar',
          shows: 'Com a peça solta, o placar cresceu na tela de início.',
        },
      ],
      correctChoiceId: 'cresce-no-inicio',
      revealOn: 'score-idle-wrong',
    },
    explain: {
      prompt: 'Por que o placar parou no fim?',
      choices: [
        {
          id: 'condicao',
          label: 'Porque Somar ponto está dentro do bloco “o estado do jogo é jogando ?”.',
        },
        { id: 'apaga', label: 'Porque o jogo apaga os pontos no fim.' },
      ],
      correctChoiceId: 'condicao',
      explanation:
        'O número continua guardado no fim. O relógio decide de quanto em quanto tempo somar, e o Se decide em quais telas.',
    },
  },
  lives: {
    prediction: {
      // ⚠️ "Imagine:" (full review de experiência, M5): a faixa de abertura diz "pontos: 0".
      prompt:
        'Imagine: o Dino já tem pontos e bate no cacto, com Perder uma vida em Quando bater. O que muda?',
      choices: [
        { id: 'vidas', label: 'Só as vidas' },
        {
          id: 'as-duas',
          label: 'As vidas e o placar',
          // ⚠️ "a batida não tirou ponto", e não "ficou igual": com o relógio andando, o placar pode
          // subir no mesmo instante da batida.
          shows: 'A batida não tirou nenhum ponto do placar.',
        },
      ],
      correctChoiceId: 'vidas',
      revealOn: 'points-stay',
    },
    explain: {
      prompt: 'Ponto e vida são a mesma contagem?',
      choices: [
        { id: 'duas', label: 'São duas, e cada uma muda pelo seu próprio motivo.' },
        { id: 'uma', label: 'São a mesma coisa, mostrada de dois jeitos.' },
      ],
      correctChoiceId: 'duas',
      explanation:
        'O ponto sobe com o tempo jogado; a vida cai na batida. Uma não mexe na outra, porque são dois números separados.',
    },
  },
  random: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X: a pergunta VOLTOU a ser a da repetição, porque agora o sorteio é de
      // verdade e a régua mostra a marquinha "2×". Antes os exemplos fixos nunca repetiam, e a
      // pergunta tinha sido trocada por uma que a tela conseguia responder. Ids novos.
      prompt: 'Sorteando o lugar, dois cactos podem nascer no mesmo ponto?',
      choices: [
        {
          id: 'nunca-repete',
          label: 'Nunca, o sorteio evita repetir',
          shows: 'Um lugar saiu de novo, e a marquinha dele ganhou 2×.',
        },
        { id: 'pode-repetir', label: 'Podem sim' },
      ],
      correctChoiceId: 'pode-repetir',
      revealOn: 'repeat',
    },
    explain: {
      prompt: 'O que o sorteio garante?',
      choices: [
        { id: 'diferente', label: 'Um valor diferente do anterior.' },
        { id: 'faixa', label: 'Um valor dentro dos limites que você escolheu.' },
      ],
      correctChoiceId: 'faixa',
      explanation:
        'Sortear é tirar um número da faixa, e a faixa é sua. Repetir é possível, e é por isso que o percurso parece novo sem ser controlado.',
    },
  },
  acceleration: {
    prediction: {
      // ⚠️ Sem "A base parou em −9" (review do lote 2): era a meta `base-limit` dita antes do gesto.
      prompt: 'Com a condição Se velocidade > −9 ligada, um cacto novo ainda pode sair com −10?',
      choices: [
        {
          id: 'nunca',
          label: 'Não, −9 é o limite',
          shows: 'Com a base parada em −9, o sorteio tirou mais 1 e nasceu um cacto −10.',
        },
        { id: 'sorteio', label: 'Pode, se o sorteio tirar mais 1' },
      ],
      correctChoiceId: 'sorteio',
      revealOn: 'variation-limit',
    },
    explain: {
      // ⚠️ Lote 5 do Raio-X: a CONDIÇÃO do Estúdio, e não a "placa de limite".
      prompt: 'A condição Se velocidade > −9 segura o quê?',
      choices: [
        { id: 'tudo', label: 'Qualquer velocidade que aparece no jogo.' },
        { id: 'base', label: 'Só a base, antes do sorteio.' },
      ],
      correctChoiceId: 'base',
      // ⚠️ "A base SOBE até o teto" com um número que desce de −5 para −9.
      explanation:
        'A base fica mais rápida até −9 e para. O sorteio vem depois e ainda pode tirar mais 1, por isso sai −10 às vezes.',
    },
  },

  /* ── O núcleo do Iniciante 2D ────────────────────────────────────────────────────────────── */
  velocity: {
    prediction: {
      // ⚠️ A previsão do zero ficava fora do assunto nas demonstrações do número NEGATIVO (Aulas 5
      // e 12), e a frase embaixo do palco respondia ("a velocidade é zero").
      prompt: 'Com a velocidade para o lado em −5, para que lado o Dino vai?',
      choices: [
        { id: 'esquerda', label: 'Para a esquerda' },
        {
          id: 'direita',
          label: 'Para a direita',
          // ⚠️ "com o número negativo", e não "com −5": a instrução deixa a criança escolher o número.
          shows: 'Com o número negativo, o x diminuiu e o Dino foi para a esquerda.',
        },
      ],
      correctChoiceId: 'esquerda',
      revealOn: 'left',
    },
    explain: {
      prompt: 'O que a velocidade faz em cada quadro?',
      choices: [
        { id: 'soma', label: 'Ela é somada na posição.' },
        { id: 'destino', label: 'Ela marca o lugar de chegada.' },
      ],
      correctChoiceId: 'soma',
      explanation:
        'A cada quadro o jogo faz posição mais velocidade. Por isso zero não move o Dino, e o sinal decide para que lado anda.',
    },
  },
  'hold-vs-press': {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X (G5): sobre COMO a raquete de cima anda com a tecla segurada, e não sobre
      // quanto anda ("anda mais?" dependia de quantas vezes ela apertava). Ids novos: mudou de sentido.
      prompt: 'Você vai segurar a tecla e contar até três. O que a raquete de cima faz?',
      choices: [
        { id: 'um-passo', label: 'Dá um passo só' },
        {
          id: 'anda-junto',
          label: 'Anda o tempo todo, igual à de baixo',
          shows: 'Com a tecla segurada, a de cima deu um passo só e a de baixo continuou andando.',
        },
      ],
      correctChoiceId: 'um-passo',
      revealOn: 'while-held',
    },
    explain: {
      prompt: 'Por que as duas raquetes pararam em lugares diferentes?',
      choices: [
        { id: 'rapida', label: 'A raquete de baixo é mais rápida.' },
        {
          id: 'tipo',
          label:
            'A de cima escuta o momento do aperto. A de baixo pergunta em todo quadro se a tecla está apertada.',
        },
      ],
      correctChoiceId: 'tipo',
      explanation:
        'O aperto acontece uma vez só. A pergunta "está apertada?" é feita de novo em todo quadro, e por isso a de baixo anda enquanto você segura.',
    },
  },
  variable: {
    prediction: {
      // ⚠️ "com a tela desligada" era a metáfora errada: quem fica desligado é o MOSTRAR.
      // ⚠️⚠️ Lote 5 do Raio-X: os números do jogo do Desafio (a caixa nasce com 0 e cada acerto soma
      // 1). Ids novos: a pergunta mudou de números.
      // ⚠️⚠️ UM acerto, e não três (consertos do review da onda A do lote 5): o `revealOn` é
      // `changed-hidden`, que cai no PRIMEIRO "somar", e o palpite "três acertos… 3" voltava com a caixa
      // em 1. A pergunta fica exata no instante da revelação. `zero` é a mesma crença; `um` é id novo.
      // ⚠️ "Imagine:" (full review de experiência, M5): na abertura a caixa pontos ainda não existe.
      prompt:
        'Imagine: a caixa pontos guarda 0. Um acerto soma 1, com Mostrar placar desligado. Quanto a caixa guarda?',
      choices: [
        {
          id: 'zero',
          label: '0, porque ninguém viu',
          shows: 'O número da caixa mudou, mesmo sem aparecer na tela.',
        },
        { id: 'um', label: '1' },
      ],
      correctChoiceId: 'um',
      revealOn: 'changed-hidden',
    },
    explain: {
      prompt: 'Guardar, mudar e mostrar são quantas coisas?',
      choices: [
        { id: 'uma', label: 'Uma só, feita em três passos.' },
        { id: 'tres', label: 'Três coisas diferentes.' },
      ],
      correctChoiceId: 'tres',
      explanation:
        'O valor existe guardado, muda sem ninguém ver, e mostrar só copia para a tela o que já estava lá.',
    },
  },
  'group-loop': {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X (G5): as distâncias são parecidas e ficam escondidas até medir, então
      // "o primeiro já serve" deixa de ser óbvio de descartar.
      prompt:
        'Os cactos parecem estar à mesma distância da torre. Dá para achar o mais perto medindo um cacto só?',
      choices: [
        {
          id: 'primeiro',
          label: 'Sim, medir um já basta',
          shows: 'Os três números eram parecidos, e só comparando os três deu para achar o menor.',
        },
        { id: 'todos', label: 'Não, é preciso medir o grupo inteiro' },
      ],
      correctChoiceId: 'todos',
      revealOn: 'nearest',
    },
    explain: {
      prompt: 'O que o laço faz?',
      choices: [
        // ⚠️ "Sabe de antemão qual é o mais perto" era espantalho; o atalho de verdade é parar no
        // primeiro.
        { id: 'primeiro', label: 'Olha só o primeiro cacto do grupo e para.' },
        { id: 'percorre', label: 'Passa por todos do grupo para poder comparar.' },
      ],
      correctChoiceId: 'percorre',
      explanation:
        'Não dá para escolher o menor sem ver todos. O laço mede o grupo inteiro em todo quadro, e por isso a escolha muda quando outro chega mais perto.',
    },
  },
  'enemy-type': {
    prediction: {
      // ⚠️ "cada cacto que já nasceu" (review do lote 2): "os três" e "todos" não passam pelo elenco.
      prompt:
        'Três cactos já estão andando. Você muda a velocidade na ficha. O que acontece com cada cacto que já nasceu?',
      choices: [
        {
          id: 'novos',
          label: 'Só muda quem nascer depois',
          // ⚠️ "mudou junto com a ficha" (consertos do review da onda B do lote 5): o palpite também volta
          // quando a criança muda só a VIDA, e "passou a andar com o número novo" era falso ali.
          shows: 'Cada cacto que já andava mudou junto com a ficha, no mesmo quadro.',
        },
        { id: 'todos', label: 'Todo cacto que já nasceu muda junto' },
      ],
      correctChoiceId: 'todos',
      revealOn: 'all-change',
    },
    explain: {
      // ⚠️⚠️ Pergunta pela DIFERENÇA (consertos do review da onda B do lote 5, T3). A chave da cópia só
      // abre depois de `all-change`, então `copied` é sempre a última meta e a pergunta chega com a cópia
      // LIGADA: "Por que cada cacto mudou junto com a ficha?" tinha na tela a resposta errada ("guarda a
      // própria cópia"). Ids novos: a pergunta mudou de sentido.
      prompt: 'Qual é a diferença entre ler a ficha e copiar a ficha ao nascer?',
      choices: [
        {
          id: 'muda-junto',
          label:
            'Quem lê a ficha muda junto com ela. Quem copiou ao nascer fica com o número de quando nasceu.',
        },
        { id: 'mais-rapido', label: 'Quem copiou ao nascer anda mais rápido que os outros.' },
      ],
      correctChoiceId: 'muda-junto',
      // ⚠️⚠️ Lote 5 do Raio-X: as DUAS regras, e a ponte com a `acceleration` do Corre Dino, em que os
      // cactos que já andavam guardam a velocidade que receberam.
      explanation:
        'Os números moram na ficha, e quem lê a ficha em todo quadro vê o número novo. Quem copia ao nascer guarda o número daquele instante, como na aceleração do Corre Dino.',
    },
  },
  camera: {
    prediction: {
      prompt:
        'A câmera está parada. O Dino anda até a bandeira, lá no fim do mundo. Onde o Dino aparece na tela?',
      choices: [
        { id: 'fora', label: 'Fora da tela' },
        {
          id: 'meio',
          label: 'No meio da tela',
          shows: 'Sem a câmera, o Dino saiu da tela, e só a seta mostrou para onde foi.',
        },
      ],
      correctChoiceId: 'fora',
      revealOn: 'lost',
    },
    explain: {
      prompt: 'O que a câmera é, dentro do jogo?',
      choices: [
        { id: 'janela', label: 'Uma janela que mostra um pedaço do mundo.' },
        { id: 'tamanho', label: 'O tamanho total do mundo.' },
      ],
      correctChoiceId: 'janela',
      explanation:
        'O mundo é maior que a tela o tempo todo. A câmera escolhe qual pedaço aparece, e é por isso que ela precisa seguir o Dino.',
    },
  },
  contact: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X (G5): corações, e a regra de CIMA nomeada ("está encostando?"): as duas
      // pistas ficam à vista durante o palpite.
      prompt:
        'O cacto encosta e fica parado ali. Com a regra "está encostando?", quantos corações o Dino perde?',
      choices: [
        { id: 'muitas', label: 'Um a cada quadro, sem parar' },
        {
          id: 'uma',
          label: 'Um só',
          shows: 'Na pista de cima, saiu um coração a cada quadro.',
        },
      ],
      correctChoiceId: 'muitas',
      revealOn: 'drain',
    },
    explain: {
      prompt: 'Qual é a diferença entre as duas regras do jogo?',
      choices: [
        {
          id: 'quando',
          label:
            '"Está encostando?" é respondida em todo quadro. "Começar a encostar" só no instante em que encosta.',
        },
        // ⚠️ "Uma delas é mais precisa" ninguém escolhe. O erro típico é ligar o acontecimento à
        // velocidade de quem chega.
        { id: 'rapido', label: '"Começar a encostar" só funciona se o cacto vier rápido.' },
      ],
      correctChoiceId: 'quando',
      explanation:
        'A pergunta "está encostando?" é feita em todo quadro, então cobra em todo quadro. "Começar a encostar" acontece uma vez, e só volta a valer depois de afastar.',
    },
  },
  cooldown: {
    prediction: {
      prompt:
        // ⚠️ "Imagine" (full review de experiência, M5): a faixa de abertura diz "recarga: nenhuma".
        'Imagine a recarga em 1 segundo. Você aperta Atirar três vezes bem rápido. Quantos tiros saem?',
      choices: [
        {
          id: 'tres',
          label: 'Os três, um atrás do outro',
          // ⚠️ "o aperto seguinte": o palpite volta na PRIMEIRA recusa, com um aperto só recusado.
          shows: 'Saiu 1 tiro, e o aperto seguinte não virou tiro.',
        },
        { id: 'um', label: 'Só um' },
      ],
      correctChoiceId: 'um',
      revealOn: 'waiting',
    },
    explain: {
      prompt: 'Para que serve a recarga?',
      choices: [
        { id: 'forca', label: 'Para deixar o tiro mais forte.' },
        { id: 'espera', label: 'Para fazer o jogo ESPERAR entre um tiro e o outro.' },
      ],
      correctChoiceId: 'espera',
      explanation:
        'Durante a recarga, o aperto não vira tiro e não fica guardado para depois. É assim que o jogo faz o tiro esperar a vez.',
    },
  },
  aim: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X (G5): sobre o CAMINHO do tiro com a mira desligada. Ids novos: mudou de
      // sentido (antes: "o tiro passa a ir atrás do alvo sozinho?").
      prompt: 'O alvo está lá embaixo e a mira está desligada. Para onde vai o tiro?',
      choices: [
        {
          id: 'alvo',
          label: 'Direto no alvo',
          shows: 'Sem a mira, o tiro foi reto e passou longe do alvo.',
        },
        { id: 'reto', label: 'Reto para a frente' },
      ],
      correctChoiceId: 'reto',
      revealOn: 'straight-miss',
    },
    explain: {
      // ⚠️ A errada antiga ("virar o desenho na direção do alvo") é o que faz o bloco "Apontar o
      // sprite para…" do Jogo 2D: a pergunta marcava como erro um bloco que a criança vai usar.
      prompt: 'O que a mira usa para o tiro acertar?',
      choices: [
        { id: 'seta', label: 'A direção de quem atira até o alvo.' },
        { id: 'distancia', label: 'A distância até o alvo.' },
      ],
      correctChoiceId: 'seta',
      explanation:
        'A mira acha a seta entre dois pontos, e o tiro anda por ela. O bloco "Apontar o sprite para…" usa essa mesma seta para virar o desenho.',
    },
  },
  diagonal: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X (G5): sobre ONDE o Dino para, com o círculo do reto no palco. Ids novos.
      prompt: 'Com direita e baixo apertadas, onde o Dino para depois de 1 segundo?',
      choices: [
        { id: 'fora', label: 'Fora do círculo' },
        {
          id: 'circulo',
          label: 'Em cima do círculo, igual ao reto',
          shows: 'Na diagonal, o Dino passou do círculo.',
        },
      ],
      correctChoiceId: 'fora',
      revealOn: 'faster',
    },
    explain: {
      prompt: 'Por que a diagonal passou do círculo?',
      choices: [
        { id: 'baixo', label: 'Porque a seta de baixo é mais rápida.' },
        { id: 'soma', label: 'Porque o Dino andou para o lado e para baixo ao mesmo tempo.' },
      ],
      correctChoiceId: 'soma',
      explanation:
        'Os dois movimentos juntos fazem um caminho mais comprido, quase uma vez e meia o reto. A correção encurta cada passo. No Estúdio, o bloco "Mover sprite em 4 direções com setas" já faz essa correção.',
    },
  },
  tilemap: {
    prediction: {
      // ⚠️⚠️ Lote 5 do Raio-X (G5): um caso NOVO para ler, com a meta que o mostra (`coin-row`). A legenda
      // do palco diz que "o" é moeda: a pergunta é ONDE as moedas aparecem, no ar ou caídas no chão.
      // Ids novos: a pergunta mudou de sentido.
      prompt: 'Se uma linha do meio virar ...ooo...., o que aparece no desenho?',
      choices: [
        { id: 'no-ar', label: 'Três moedas no ar, na mesma linha' },
        {
          id: 'no-chao',
          label: 'Três moedas caídas no chão',
          shows: 'As moedas ficaram na linha em que foram escritas, no ar.',
        },
      ],
      correctChoiceId: 'no-ar',
      revealOn: 'coin-row',
    },
    explain: {
      prompt: 'O que o mapa do jogo é, na verdade?',
      choices: [
        { id: 'imagem', label: 'Uma imagem grande, desenhada de uma vez.' },
        // ⚠️ "Um dado": para quem tem 9 anos, dado é o de jogar.
        { id: 'dado', label: 'Um texto: letras que o jogo lê e transforma em peças.' },
      ],
      correctChoiceId: 'dado',
      explanation:
        'Cada letra vale uma peça, sempre a mesma, e fica no lugar em que foi escrita. Por isso escrever o mapa é construir a fase.',
    },
  },

  /* ── O motor, o 3D e o ateliê ────────────────────────────────────────────────────────────── */
  pool: {
    prediction: {
      // ⚠️ "O contador pode diminuir?" repetia o título da cena ("O contador que só sobe").
      // ⚠️⚠️ 3, e não 5 (review do lote 2): a meta que responde cai com três fabricados, e o palpite
      // "5, um novo para cada vez" voltava com 3 na tela. Id novo: o número mudou.
      // ⚠️ "fabricou" (lote 5 do Raio-X), a palavra da faixa ("fabricados desde o começo"). Mesmo
      // sentido, mesmos ids.
      prompt:
        'Na tela só cabe um cacto por vez. Depois de 3 cactos passarem, quantos o jogo fabricou?',
      choices: [
        {
          id: 'um',
          label: 'Só 1, o que está na tela',
          shows: 'Cada cacto que entrou chegou com um número novo pintado.',
        },
        { id: 'tres', label: '3, um novo para cada vez' },
      ],
      correctChoiceId: 'tres',
      revealOn: 'grows',
    },
    explain: {
      prompt: 'O que a reciclagem muda?',
      choices: [
        { id: 'apaga', label: 'Apaga da conta os que já saíram.' },
        { id: 'reaproveita', label: 'Usa de novo o cacto que saiu, em vez de fabricar outro.' },
      ],
      correctChoiceId: 'reaproveita',
      explanation:
        'Um número conta quem está na tela agora. O outro conta quantos o jogo já fabricou. Reciclando, o jogo não fabrica mais nenhum: usa de novo o que saiu.',
    },
  },
  'entity-state': {
    prediction: {
      // ⚠️ Lote 5 do Raio-X: as TORRES, e o ▶ que a bancada tem.
      prompt:
        'As três torres são iguais e estão paradas. Você manda SÓ a 1ª atirar e aperta ▶. O que as outras duas fazem?',
      choices: [
        { id: 'parados', label: 'Continuam paradas' },
        // ⚠️⚠️ Verdade em QUALQUER caminho (review do lote 2): pela instrução, as torres mudam de estado
        // antes do relógio, e "só a 1ª mudou de estado" ficava falso.
        {
          id: 'atiram',
          label: 'Atiram também',
          shows: 'Só a torre que estava atirando soltou tiro.',
        },
      ],
      correctChoiceId: 'parados',
      revealOn: 'acts',
    },
    explain: {
      // ⚠️⚠️ Pela DIFERENÇA, e não por onde a chave parou (consertos do review da onda B do lote 5). A
      // última descoberta é o contraste (`shared`), então a cena conclui com "O estado mora: no jogo" e
      // as três torres iguais, e "Onde o estado de cada torre mora?" tinha o distrator "No jogo inteiro"
      // à vista na tela. A pergunta cita o caso de cada torre, e a explicação, os DOIS lados. Mesmo
      // sentido, mesmos ids.
      prompt: 'Com o estado em cada torre, mudar só a 2ª não mexeu na 1ª. Por quê?',
      choices: [
        { id: 'cada', label: 'Cada torre guarda o próprio estado.' },
        { id: 'jogo', label: 'O jogo guarda um estado só para as três.' },
      ],
      correctChoiceId: 'cada',
      explanation:
        'Cada torre guarda o próprio estado, e é esse estado que decide o que a torre faz agora. Com o estado no jogo, mudar uma muda as três.',
    },
  },
  'delta-time': {
    prediction: {
      // ⚠️ A certa antiga ("depende do que o jogo conta") era o nome do controle, não um palpite.
      // ⚠️ Lote 5 do Raio-X: uma CORRIDA com chegada, e o passo dito na pergunta.
      prompt:
        'O mesmo jogo num computador rápido e num devagar. O Dino dá um passo a cada quadro desenhado. Quem chega primeiro?',
      choices: [
        { id: 'rapido', label: 'O do computador rápido' },
        {
          id: 'juntos',
          label: 'Chegam juntos, é o mesmo jogo',
          shows: 'Andando a cada quadro, o computador rápido foi mais longe.',
        },
      ],
      correctChoiceId: 'rapido',
      revealOn: 'apart',
    },
    explain: {
      prompt: 'Como o Dino deve andar para o jogo ficar igual em qualquer computador?',
      choices: [
        { id: 'tempo', label: 'Um tanto a cada segundo.' },
        { id: 'quadros', label: 'Um tanto a cada quadro desenhado.' },
      ],
      correctChoiceId: 'tempo',
      explanation:
        'O computador rápido desenha mais quadros no mesmo segundo. Andando um tanto por quadro, o Dino do rápido vai mais longe. Andando um tanto por segundo, os dois chegam juntos.',
    },
  },
  'circle-collision': {
    prediction: {
      // ⚠️ "Os DESENHOS parecem encostar?" era falso neste palco: os desenhos SÃO os círculos da
      // conta. Um palpite com números sobe um degrau em relação à `hitbox`.
      prompt:
        // ⚠️ "Imagine" (full review de experiência, M5): a faixa de abertura diz "distância entre os
        // centros: 140".
        'Imagine os centros a 70 de distância, com cada raio medindo 30. Os dois círculos já bateram?',
      choices: [
        { id: 'nao', label: 'Ainda não bateram' },
        {
          id: 'sim',
          label: 'Já bateram, estão bem pertinho',
          shows: 'Com os raios 30 e 30, o "bateu" só apareceu quando a distância chegou em 60.',
        },
      ],
      correctChoiceId: 'nao',
      revealOn: 'touch',
    },
    explain: {
      prompt: 'Qual é a conta da batida entre dois círculos?',
      choices: [
        { id: 'soma', label: 'A distância entre os centros contra a soma dos dois raios.' },
        { id: 'tamanho', label: 'O tamanho de um comparado com o do outro.' },
      ],
      correctChoiceId: 'soma',
      explanation:
        'Some os dois raios. Se a distância entre os centros for igual ou menor que essa soma, os dois batem. Mudar um raio muda a resposta sem mover ninguém.',
    },
  },
  'axis-z': {
    prediction: {
      prompt: 'No 3D, aumentar o y leva o objeto para onde?',
      choices: [
        {
          id: 'baixo',
          label: 'Para baixo, como no jogo 2D',
          shows: 'Com o y maior, o cubo subiu.',
        },
        { id: 'cima', label: 'Para cima' },
      ],
      correctChoiceId: 'cima',
      revealOn: 'up',
    },
    explain: {
      prompt: 'O que o terceiro eixo acrescenta?',
      choices: [
        { id: 'altura', label: 'A altura, que a tela não tinha.' },
        { id: 'fundo', label: 'A frente e o fundo: perto e longe.' },
      ],
      correctChoiceId: 'fundo',
      explanation:
        'O z diz o quanto para a frente ou para o fundo. E atenção: aqui o y cresce para CIMA, ao contrário do jogo 2D.',
    },
  },
  'camera-3d': {
    prediction: {
      prompt: 'Com a câmera bem de frente para o cubo, quantas cores você vê?',
      choices: [
        {
          id: 'tres',
          label: 'Três, como no desenho de um cubo',
          shows: 'De frente, apareceu uma cor só.',
        },
        { id: 'uma', label: 'Uma' },
      ],
      correctChoiceId: 'uma',
      revealOn: 'one-face',
    },
    explain: {
      prompt: 'O que decide o que aparece na tela do 3D?',
      choices: [
        { id: 'objeto', label: 'O tamanho do objeto.' },
        { id: 'camera', label: 'De onde a câmera está olhando.' },
      ],
      correctChoiceId: 'camera',
      explanation:
        'O cubo não mudou nenhuma vez. Quem mudou foi o lugar da câmera, e é esse lugar que decide quantos lados aparecem.',
    },
  },
  mesh: {
    prediction: {
      prompt: 'Embaixo da pele colorida, do que um modelo 3D é feito?',
      choices: [
        {
          id: 'macico',
          label: 'Um bloco cheio por dentro, como massinha',
          // ⚠️ Sem "transparente" (consertos do review da onda B do lote 5): a revelação também volta para
          // quem tirou a pele inteira.
          shows: 'Embaixo da pele apareceram pontos e linhas, e nada cheio por dentro.',
        },
        { id: 'pontos', label: 'Pontos ligados por linhas, formando faces' },
      ],
      correctChoiceId: 'pontos',
      revealOn: 'points',
    },
    explain: {
      prompt: 'O que a pele é, num modelo 3D?',
      choices: [
        { id: 'roupa', label: 'A cor pintada por cima das faces.' },
        { id: 'forma', label: 'A forma do modelo.' },
      ],
      correctChoiceId: 'roupa',
      explanation:
        'A forma vem dos pontos e das linhas. A pele só pinta as faces por cima: dá para trocar a pele sem mudar a forma.',
    },
  },
  'pick-ray': {
    prediction: {
      prompt: 'Mirando onde uma caixa cobre a outra, qual delas acende?',
      choices: [
        { id: 'frente', label: 'A que está mais perto de você' },
        // ⚠️ Lote 5 do Raio-X: a caixa da frente passou a ser a MENOR, e "a maior" virou um erro que o
        // palco desmente.
        { id: 'maior', label: 'A maior das duas', shows: 'Acendeu a caixa menor, a mais perto.' },
        { id: 'duas', label: 'As duas', shows: 'Só uma caixa acendeu.' },
      ],
      correctChoiceId: 'frente',
      revealOn: 'first',
    },
    explain: {
      prompt: 'O que acontece com a reta da mira?',
      choices: [
        { id: 'atravessa', label: 'Ela atravessa e acende todas do caminho.' },
        { id: 'para', label: 'Ela sai do seu olho e para na primeira coisa do caminho.' },
      ],
      correctChoiceId: 'para',
      explanation:
        'A mira é uma reta que sai do seu olho. A primeira coisa que ela encontra é a escolhida, e o resto fica escondido atrás.',
    },
  },
  'fill-stroke': {
    prediction: {
      // ⚠️ Lote 5: com as palavras do Pinta (Contorno, Sem cor, Preenchimento). Mesmo sentido, mesmos ids.
      prompt: 'Com o contorno em Sem cor, ainda sobra desenho?',
      choices: [
        {
          id: 'some',
          label: 'Some tudo',
          shows: 'Com o contorno em Sem cor, o preenchimento continuou pintado.',
        },
        { id: 'sobra', label: 'Sobra o preenchimento' },
      ],
      correctChoiceId: 'sobra',
      revealOn: 'only-fill',
    },
    explain: {
      prompt: 'A pedra de vetor tem quantas partes com cor própria?',
      choices: [
        { id: 'dois', label: 'Duas: o preenchimento e o contorno.' },
        { id: 'um', label: 'Uma só, com uma borda.' },
      ],
      correctChoiceId: 'dois',
      explanation:
        'O preenchimento pinta por dentro e o contorno pinta a borda. Cada um pode ficar em Sem cor, e a forma continua a mesma.',
    },
  },
  shading: {
    prediction: {
      // ⚠️ Lote 5: os TRÊS tons da família do azul. Mesmo sentido, mesmos ids.
      prompt: 'O que faz a bola chapada parecer redonda?',
      choices: [
        { id: 'sombra', label: 'Um tom mais escuro de um lado e um mais claro do outro' },
        {
          id: 'contorno',
          label: 'Um contorno mais grosso',
          // ⚠️ Sem "deu volume": é o rótulo da meta, a conclusão.
          shows: 'Nenhum contorno apareceu. Surgiram um azul mais escuro e um azul mais claro.',
        },
      ],
      correctChoiceId: 'sombra',
      revealOn: 'volume',
    },
    explain: {
      prompt: 'De que lado fica a sombra?',
      choices: [
        { id: 'contrario', label: 'Do lado contrário ao do sol.' },
        { id: 'baixo', label: 'Sempre embaixo.' },
      ],
      correctChoiceId: 'contrario',
      explanation:
        'O sol clareia um lado e o outro fica mais escuro. Esses tons da mesma cor fazem o olho ver volume onde só há desenho plano.',
    },
  },
}

const sceneQuestionEntries: [SceneId, SceneQuestions][] = SCENE_IDS.map((sceneId) => {
  const questions = SCENE_QUESTION_DEFINITIONS[sceneId]
  return [
    sceneId,
    {
      ...questions,
      prediction: {
        ...questions.prediction,
        context: SCENE_PREDICTION_CONTEXTS[sceneId],
      },
    },
  ]
})

export const SCENE_QUESTIONS: Record<SceneId, SceneQuestions> = Object.fromEntries(
  sceneQuestionEntries,
) as Record<SceneId, SceneQuestions>
