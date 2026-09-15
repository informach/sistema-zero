import type { SceneId } from './actions'

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
 */

/** Uma alternativa, no formato que o bloco de aula já usa. */
interface Escolha {
  id: string
  label: string
}

export interface ScenePrediction {
  prompt: string
  choices: Escolha[]
  /** O que acontece de verdade. Não reprova ninguém: serve ao relatório do professor. */
  correctChoiceId: string
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

/** ⚠️ `Record<SceneId, …>`: o TS reprova a cena nova que chegar sem as duas perguntas. */
export const SCENE_QUESTIONS: Record<SceneId, SceneQuestions> = {
  /* ── A tela e quem a lê ──────────────────────────────────────────────────────────────────── */
  coordinates: {
    prediction: {
      prompt: 'Se você AUMENTAR o y, para onde o Dino vai?',
      choices: [
        { id: 'cima', label: 'Para cima' },
        { id: 'baixo', label: 'Para baixo' },
      ],
      correctChoiceId: 'baixo',
    },
    explain: {
      prompt: 'O que é o endereço do Dino na tela?',
      choices: [
        { id: 'dois', label: 'Dois números: um para o lado e um para a altura.' },
        { id: 'um', label: 'Um número só, que vai crescendo.' },
      ],
      correctChoiceId: 'dois',
      explanation:
        'São dois números juntos. O x diz o quanto para o lado e o y diz o quanto para baixo. Trocar um só move o Dino num eixo.',
    },
  },
  'screen-reader': {
    prediction: {
      prompt: 'Quem não enxerga a tela consegue saber como se joga?',
      choices: [
        { id: 'desenho', label: 'Sim, o desenho conta sozinho' },
        { id: 'frase', label: 'Só se alguém tiver escrito uma frase' },
      ],
      correctChoiceId: 'frase',
    },
    explain: {
      prompt: 'O que faz o jogo ser jogável por quem não vê a tela?',
      choices: [
        { id: 'frase', label: 'Uma frase que diz o objetivo e o controle.' },
        { id: 'cores', label: 'Cores fortes e desenhos grandes.' },
      ],
      correctChoiceId: 'frase',
      explanation:
        'O leitor de tela lê texto, não desenho. Sem a sua frase ele anuncia "imagem" e mais nada, e o jogo fica fechado.',
    },
  },
  'stage-size': {
    prediction: {
      prompt: 'Quem decide onde a tela do jogo acaba?',
      choices: [
        { id: 'voce', label: 'Você, escolhendo os números' },
        { id: 'jogo', label: 'O jogo, sozinho' },
      ],
      correctChoiceId: 'voce',
    },
    explain: {
      prompt: 'O limite da tela é o quê?',
      choices: [
        { id: 'escolha', label: 'Uma escolha sua: dois números, largura e altura.' },
        { id: 'monitor', label: 'O tamanho do monitor de quem joga.' },
      ],
      correctChoiceId: 'escolha',
      explanation:
        'A tela do jogo é uma medida que você escolhe. A borda só torna esse limite visível, ela não o cria.',
    },
  },
  'draw-loop': {
    prediction: {
      prompt: 'Se o jogo desenhar sem limpar antes, o que aparece?',
      choices: [
        { id: 'rastro', label: 'Um rastro de vários Dinos' },
        { id: 'um', label: 'Um Dino só, andando' },
      ],
      correctChoiceId: 'rastro',
    },
    explain: {
      prompt: 'O que faz o desenho parecer que se mexe?',
      choices: [
        { id: 'repetir', label: 'Desenhar de novo a cada quadro, limpando antes.' },
        { id: 'empurrar', label: 'Empurrar o desenho que já estava lá.' },
      ],
      correctChoiceId: 'repetir',
      explanation:
        'O jogo apaga e redesenha muitas vezes por segundo. Sem repetir, a tela congela; sem limpar, sobra rastro.',
    },
  },

  /* ── Desenho e animação ──────────────────────────────────────────────────────────────────── */
  frames: {
    prediction: {
      prompt: 'Numa animação de dois quadros, o que está na tela em cada instante?',
      choices: [
        { id: 'um', label: 'Um desenho parado' },
        { id: 'meio', label: 'Os dois misturados' },
      ],
      correctChoiceId: 'um',
    },
    explain: {
      prompt: 'O que cria o movimento?',
      choices: [
        { id: 'troca', label: 'A troca rápida entre desenhos parados.' },
        { id: 'desenho', label: 'Um desenho que se mexe sozinho.' },
      ],
      correctChoiceId: 'troca',
      explanation:
        'Cada quadro continua sendo um desenho parado. Quem inventa o movimento é a velocidade da troca, e os seus olhos.',
    },
  },
  'onion-skin': {
    prediction: {
      prompt: 'Dá para acertar o passo do quadro 2 sem ver o quadro 1?',
      choices: [
        { id: 'chute', label: 'Dá, mas no chute' },
        { id: 'facil', label: 'Dá fácil, é só olhar' },
      ],
      correctChoiceId: 'chute',
    },
    explain: {
      prompt: 'Para que serve o fantasma do quadro anterior?',
      choices: [
        { id: 'comparar', label: 'Para comparar sem precisar decorar.' },
        { id: 'aparecer', label: 'Para aparecer no jogo junto com o desenho.' },
      ],
      correctChoiceId: 'comparar',
      explanation:
        'O fantasma é uma guia de quem desenha, não parte do jogo. Ele deixa você medir a distância entre um quadro e o outro.',
    },
  },
  symmetry: {
    prediction: {
      prompt: 'Com o espelho ligado, um traço seu vira quantos?',
      choices: [
        { id: 'dois', label: 'Dois' },
        { id: 'um', label: 'Um, só que mais grosso' },
      ],
      correctChoiceId: 'dois',
    },
    explain: {
      prompt: 'O que o eixo do espelho decide?',
      choices: [
        { id: 'onde', label: 'Onde o reflexo cai.' },
        { id: 'quantos', label: 'Quantos traços são criados.' },
      ],
      correctChoiceId: 'onde',
      explanation:
        'O espelho sempre faz um reflexo. O eixo é a linha em volta da qual ele acontece, então mover o eixo move o reflexo.',
    },
  },
  'pixel-vector': {
    prediction: {
      prompt: 'As duas pedras parecem iguais. E se você chegar bem perto?',
      choices: [
        { id: 'iguais', label: 'Continuam iguais' },
        { id: 'diferentes', label: 'Uma vira escadinha' },
      ],
      correctChoiceId: 'diferentes',
    },
    explain: {
      prompt: 'Qual é a diferença entre as duas pedras?',
      choices: [
        { id: 'como', label: 'Como cada uma é guardada: quadradinhos ou instruções de traço.' },
        { id: 'cor', label: 'A cor e o tamanho de cada uma.' },
      ],
      correctChoiceId: 'como',
      explanation:
        'Uma é feita de quadradinhos, e ampliar mostra os quadradinhos. A outra é uma receita de traço, e o traço é refeito do tamanho que precisar.',
    },
  },
  'sheet-vs-sprite': {
    prediction: {
      prompt: 'Se você aumentar o desenho dentro do jogo, a folha muda?',
      choices: [
        { id: 'muda', label: 'Muda, ela cresce junto' },
        { id: 'fica', label: 'Fica igual' },
      ],
      correctChoiceId: 'fica',
    },
    explain: {
      prompt: 'A folha de desenhos e o tamanho no jogo são a mesma coisa?',
      choices: [
        { id: 'duas', label: 'Não: a folha guarda, e o tamanho no jogo é escolhido depois.' },
        { id: 'uma', label: 'São: o pedaço recortado já vem no tamanho final.' },
      ],
      correctChoiceId: 'duas',
      explanation:
        'A folha é o armário dos desenhos. Recortar diz QUAL desenho usar; o tamanho no jogo é outra escolha, feita na hora de mostrar.',
    },
  },

  /* ── O mundo do jogo ─────────────────────────────────────────────────────────────────────── */
  world: {
    prediction: {
      prompt: 'Você cria o Dino e não liga o desenho. O que aparece na tela?',
      choices: [
        { id: 'nada', label: 'Nada' },
        { id: 'dino', label: 'O Dino' },
      ],
      correctChoiceId: 'nada',
    },
    explain: {
      prompt: 'Por que o Dino não apareceu na tela logo depois de criar?',
      choices: [
        {
          id: 'duas',
          label: 'Existir e aparecer são duas coisas: faltou o comando de desenhar.',
        },
        { id: 'lento', label: 'O jogo demora um pouco para carregar o desenho.' },
      ],
      correctChoiceId: 'duas',
      explanation:
        'Criar põe o Dino nos bastidores do jogo. Desenhar é o que traz o Dino para a tela. São dois comandos porque são duas coisas.',
    },
  },
  layers: {
    prediction: {
      prompt: 'A peça que fica ATRÁS ainda existe no jogo?',
      choices: [
        { id: 'existe', label: 'Existe, só está coberta' },
        { id: 'some', label: 'Some enquanto está atrás' },
      ],
      correctChoiceId: 'existe',
    },
    explain: {
      prompt: 'O que a ordem das peças decide?',
      choices: [
        { id: 'cobre', label: 'Quem cobre quem.' },
        { id: 'existe', label: 'Quem existe e quem não existe.' },
      ],
      correctChoiceId: 'cobre',
      explanation:
        'As duas peças continuam ali o tempo todo. A ordem só diz qual delas é desenhada por cima da outra.',
    },
  },
  gravity: {
    prediction: {
      prompt: 'Sem gravidade, o Dino que pula volta ao chão?',
      choices: [
        { id: 'sobe', label: 'Não, o Dino fica subindo' },
        { id: 'volta', label: 'Volta, sempre' },
      ],
      correctChoiceId: 'sobe',
    },
    explain: {
      prompt: 'O que faz o Dino voltar ao chão?',
      choices: [
        { id: 'gravidade', label: 'A gravidade, que puxa o Dino para baixo o tempo todo.' },
        { id: 'chao', label: 'O chão, que atrai quem está no ar.' },
      ],
      correctChoiceId: 'gravidade',
      explanation:
        'O pulo é um empurrão para cima que acaba. A gravidade continua puxando, então a subida vira descida.',
    },
  },
  impulse: {
    prediction: {
      prompt: 'Com a MESMA gravidade, um impulso maior leva o Dino mais alto?',
      choices: [
        { id: 'alto', label: 'Sim, mais alto' },
        { id: 'igual', label: 'Não, a altura é sempre a mesma' },
      ],
      correctChoiceId: 'alto',
    },
    explain: {
      prompt: 'Quem decide a altura do salto?',
      choices: [
        { id: 'impulso', label: 'A força do impulso, contra a mesma gravidade.' },
        { id: 'tempo', label: 'O tempo que você segura a tecla.' },
      ],
      correctChoiceId: 'impulso',
      explanation:
        'A gravidade não mudou entre os dois saltos. O que mudou foi o empurrão inicial, e é ele que define a altura do salto.',
    },
  },
  'jump-sound': {
    prediction: {
      prompt: 'O som deve tocar quando você aperta a tecla, ou quando o Dino pula?',
      choices: [
        { id: 'pulo', label: 'Quando o Dino pula' },
        { id: 'tecla', label: 'Quando eu aperto' },
      ],
      correctChoiceId: 'pulo',
    },
    explain: {
      prompt: 'Por que o som deve escutar o PULO, e não a tecla?',
      choices: [
        {
          id: 'acontece',
          label: 'Porque nem toda tecla vira pulo, e o som conta o que aconteceu.',
        },
        { id: 'rapido', label: 'Porque a tecla é mais lenta que o pulo.' },
      ],
      correctChoiceId: 'acontece',
      explanation:
        'Se o som escutar a tecla, ele toca mesmo quando o pulo não acontece. Ligado ao pulo, ele conta a verdade, venha de tecla ou de toque.',
    },
  },
  spawn: {
    prediction: {
      prompt: 'Criando um cacto em CADA quadro, como fica a pista?',
      choices: [
        { id: 'parede', label: 'Uma parede de cactos' },
        { id: 'espacada', label: 'Cactos bem espaçados' },
      ],
      correctChoiceId: 'parede',
    },
    explain: {
      prompt: 'O que abriu espaço entre os cactos?',
      choices: [
        { id: 'intervalo', label: 'Esperar um tempo entre uma criação e a outra.' },
        { id: 'velocidade', label: 'Deixar os cactos mais rápidos.' },
      ],
      correctChoiceId: 'intervalo',
      explanation:
        'A velocidade deles não mudou. O que mudou foi o tempo entre um nascimento e o seguinte, e é isso que vira espaço.',
    },
  },
  cleanup: {
    prediction: {
      prompt: 'O cacto que sai da tela some do jogo?',
      choices: [
        { id: 'fica', label: 'Não, o cacto continua guardado' },
        { id: 'some', label: 'Some sozinho' },
      ],
      correctChoiceId: 'fica',
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
      prompt: 'Na tela de INÍCIO, o relógio do jogo já deveria estar contando?',
      choices: [
        { id: 'espera', label: 'Não, deve esperar' },
        { id: 'conta', label: 'Sim, desde o começo' },
      ],
      correctChoiceId: 'espera',
    },
    explain: {
      prompt: 'O que faz o relógio esperar na tela de início?',
      choices: [
        { id: 'condicao', label: 'Uma condição: só contar enquanto estiver jogando.' },
        { id: 'botao', label: 'O botão de começar, que liga o relógio.' },
      ],
      correctChoiceId: 'condicao',
      explanation:
        'O relógio está sempre lá. A condição é um guarda na porta: ela deixa passar só quando a partida está acontecendo.',
    },
  },
  controls: {
    prediction: {
      prompt: 'O convite "toque para começar" funciona sozinho?',
      choices: [
        { id: 'fio', label: 'Não, alguém precisa ligar o toque' },
        { id: 'sozinho', label: 'Funciona, é só escrever' },
      ],
      correctChoiceId: 'fio',
    },
    explain: {
      prompt: 'O que faz o convite virar um começo de verdade?',
      choices: [
        { id: 'ligacao', label: 'A ligação entre o gesto e a ação de começar.' },
        { id: 'texto', label: 'O texto do convite estar bem escrito.' },
      ],
      correctChoiceId: 'ligacao',
      explanation:
        'O texto só conta o que fazer. Quem faz acontecer é o fio entre o toque (ou a tecla) e o comando de iniciar.',
    },
  },
  restart: {
    prediction: {
      prompt: 'Depois que a partida acaba, ela recomeça sozinha?',
      choices: [
        { id: 'nao', label: 'Não, alguém precisa mandar' },
        { id: 'sim', label: 'Sim, sempre recomeça' },
      ],
      correctChoiceId: 'nao',
    },
    explain: {
      prompt: 'O que recomeçar precisa fazer?',
      choices: [
        {
          id: 'zerar',
          label: 'Voltar o placar e os obstáculos ao começo, e só então jogar de novo.',
        },
        { id: 'tela', label: 'Mostrar de novo a tela inicial.' },
      ],
      correctChoiceId: 'zerar',
      explanation:
        'Recomeçar não é só trocar de tela. É devolver o jogo ao estado de partida nova, senão a nova rodada herda a anterior.',
    },
  },
  hitbox: {
    prediction: {
      prompt: 'A batida acontece quando os DESENHOS se encostam?',
      choices: [
        { id: 'area', label: 'Não, quando as áreas se encostam' },
        { id: 'desenho', label: 'Sim, quando os desenhos se tocam' },
      ],
      correctChoiceId: 'area',
    },
    explain: {
      prompt: 'O que o jogo usa para saber que houve batida?',
      choices: [
        { id: 'area', label: 'Áreas invisíveis em volta de cada um.' },
        { id: 'pixel', label: 'Os pixels coloridos de cada desenho.' },
      ],
      correctChoiceId: 'area',
      explanation:
        'O desenho é para os olhos; a área é para a conta. Mudar a área muda o instante da batida sem mudar nada do que se vê.',
    },
  },
  score: {
    prediction: {
      prompt: 'Quando a partida acaba, os pontos somem?',
      choices: [
        { id: 'ficam', label: 'Ficam parados no valor' },
        { id: 'zeram', label: 'Voltam para zero na hora' },
      ],
      correctChoiceId: 'ficam',
    },
    explain: {
      prompt: 'Por que os pontos param de subir fora da partida?',
      choices: [
        { id: 'condicao', label: 'Porque a condição só deixa somar enquanto está jogando.' },
        { id: 'apaga', label: 'Porque o jogo apaga o placar ao terminar.' },
      ],
      correctChoiceId: 'condicao',
      explanation:
        'O valor continua guardado. O que a condição controla é o momento de somar, não o de existir.',
    },
  },
  lives: {
    prediction: {
      prompt: 'Quando o Dino perde uma vida, o placar volta a zero?',
      choices: [
        { id: 'ficam', label: 'Não, os pontos ficam' },
        { id: 'zeram', label: 'Sim, perde os dois' },
      ],
      correctChoiceId: 'ficam',
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
      prompt: 'Sorteando o lugar de nascimento, dois cactos podem nascer no mesmo ponto?',
      choices: [
        { id: 'podem', label: 'Podem sim' },
        { id: 'nunca', label: 'Nunca, o sorteio evita repetir' },
      ],
      correctChoiceId: 'podem',
    },
    explain: {
      prompt: 'O que o sorteio garante?',
      choices: [
        { id: 'faixa', label: 'Um valor dentro dos limites que você escolheu.' },
        { id: 'diferente', label: 'Um valor diferente do anterior.' },
      ],
      correctChoiceId: 'faixa',
      explanation:
        'Sortear é tirar um número da faixa, e a faixa é sua. Repetir é possível, e é por isso que o percurso parece novo sem ser controlado.',
    },
  },
  acceleration: {
    prediction: {
      prompt: 'Com um limite de velocidade, o jogo pode passar dele?',
      choices: [
        { id: 'sorteio', label: 'A base para, mas o sorteio pode passar' },
        { id: 'nunca', label: 'Nunca passa' },
      ],
      correctChoiceId: 'sorteio',
    },
    explain: {
      prompt: 'O limite vale para o quê?',
      choices: [
        { id: 'base', label: 'Para a base que cresce, e não para o que é sorteado por cima dela.' },
        { id: 'tudo', label: 'Para qualquer velocidade que apareça no jogo.' },
      ],
      correctChoiceId: 'base',
      explanation:
        'A base sobe até o teto e para lá. O sorteio acontece depois, somando por cima, então um cacto ainda pode sair mais rápido.',
    },
  },

  /* ── O núcleo do Iniciante 2D ────────────────────────────────────────────────────────────── */
  velocity: {
    prediction: {
      prompt: 'Com a velocidade em ZERO e o relógio andando, o Dino sai do lugar?',
      choices: [
        { id: 'fica', label: 'O Dino fica parado' },
        { id: 'anda', label: 'Anda devagarinho' },
      ],
      correctChoiceId: 'fica',
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
      prompt: 'Segurando a tecla, a raquete anda mais do que apertando uma vez?',
      choices: [
        { id: 'mais', label: 'Anda mais' },
        { id: 'igual', label: 'Anda o mesmo' },
      ],
      correctChoiceId: 'mais',
    },
    explain: {
      prompt: 'Qual é a diferença entre apertar e segurar?',
      choices: [
        {
          id: 'tipo',
          label: 'Apertar é um acontecimento; segurar é uma pergunta feita a cada quadro.',
        },
        { id: 'forca', label: 'Segurar manda um comando mais forte.' },
      ],
      correctChoiceId: 'tipo',
      explanation:
        'O aperto vale uma vez, no instante. O segurar é respondido de novo em cada quadro, e por isso continua andando.',
    },
  },
  variable: {
    prediction: {
      prompt: 'Mudar o número guardado com a tela desligada muda alguma coisa?',
      choices: [
        { id: 'muda', label: 'Muda o valor, mas ninguém vê' },
        { id: 'nada', label: 'Não muda nada' },
      ],
      correctChoiceId: 'muda',
    },
    explain: {
      prompt: 'Guardar, mudar e mostrar são quantas coisas?',
      choices: [
        { id: 'tres', label: 'Três coisas diferentes.' },
        { id: 'uma', label: 'Uma só, feita em três passos.' },
      ],
      correctChoiceId: 'tres',
      explanation:
        'O valor existe guardado, muda sem ninguém ver, e mostrar só copia para a tela o que já estava lá.',
    },
  },
  'group-loop': {
    prediction: {
      prompt: 'Para achar o mais perto, quantos do grupo é preciso olhar?',
      choices: [
        { id: 'todos', label: 'Todos' },
        { id: 'primeiro', label: 'O primeiro já serve' },
      ],
      correctChoiceId: 'todos',
    },
    explain: {
      prompt: 'O que o laço faz?',
      choices: [
        { id: 'percorre', label: 'Passa por todos do grupo para poder comparar.' },
        { id: 'sabe', label: 'Sabe de antemão qual é o mais perto.' },
      ],
      correctChoiceId: 'percorre',
      explanation:
        'Não dá para escolher o menor sem ver todos. O laço é justamente o que percorre o grupo antes de decidir.',
    },
  },
  'enemy-type': {
    prediction: {
      prompt: 'Mudando a ficha do tipo, o que acontece com os que já nasceram?',
      choices: [
        { id: 'todos', label: 'Todos mudam juntos' },
        { id: 'novos', label: 'Só os próximos mudam' },
      ],
      correctChoiceId: 'todos',
    },
    explain: {
      prompt: 'Onde ficam as características dos inimigos?',
      choices: [
        { id: 'ficha', label: 'Numa ficha só, que todos leem.' },
        { id: 'cada', label: 'Dentro de cada inimigo, uma cópia por cabeça.' },
      ],
      correctChoiceId: 'ficha',
      explanation:
        'Eles não guardam os próprios números: consultam a mesma ficha. Por isso um valor trocado muda o grupo inteiro.',
    },
  },
  camera: {
    prediction: {
      prompt: 'Quando o Dino anda para longe, a tela fica parada ou vai junto?',
      choices: [
        { id: 'sai', label: 'A tela fica parada e o Dino some' },
        { id: 'junto', label: 'A tela vai junto sozinha' },
      ],
      correctChoiceId: 'sai',
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
      prompt: 'O Dino encosta no cacto e não sai do lugar. Quantas vidas o Dino perde?',
      choices: [
        { id: 'muitas', label: 'Vai perdendo sem parar' },
        { id: 'uma', label: 'Uma só' },
      ],
      correctChoiceId: 'muitas',
    },
    explain: {
      prompt: 'Qual é a diferença entre as duas perguntas do jogo?',
      choices: [
        {
          id: 'quando',
          label: '"Está encostando?" vale em todo quadro; "acabou de encostar" vale no instante.',
        },
        { id: 'forte', label: 'Uma delas é mais precisa que a outra.' },
      ],
      correctChoiceId: 'quando',
      explanation:
        'A contínua é respondida sempre, então cobra sempre. O acontecimento dispara uma vez, e só volta a valer depois de afastar.',
    },
  },
  cooldown: {
    prediction: {
      prompt: 'Com recarga ligada, apertar rápido três vezes dá três tiros?',
      choices: [
        { id: 'nao', label: 'Não, alguns não saem' },
        { id: 'sim', label: 'Sim, os três saem' },
      ],
      correctChoiceId: 'nao',
    },
    explain: {
      prompt: 'Para que serve a recarga?',
      choices: [
        { id: 'espera', label: 'Para fazer o jogo ESPERAR entre um tiro e o outro.' },
        { id: 'forca', label: 'Para deixar o tiro mais forte.' },
      ],
      correctChoiceId: 'espera',
      explanation:
        'O relógio não serve só para repetir: ele também segura. O pedido feito durante a espera simplesmente não vira tiro.',
    },
  },
  aim: {
    prediction: {
      prompt: 'Movendo o alvo, o tiro passa a ir atrás dele sozinho?',
      choices: [
        { id: 'mira', label: 'Só se a mira estiver ligada' },
        { id: 'sempre', label: 'Sim, sempre' },
      ],
      correctChoiceId: 'mira',
    },
    explain: {
      prompt: 'O que é apontar, para o jogo?',
      choices: [
        { id: 'seta', label: 'Uma seta que vai de quem atira até o alvo.' },
        { id: 'olhar', label: 'Virar o desenho na direção do alvo.' },
      ],
      correctChoiceId: 'seta',
      explanation:
        'A mira calcula a direção entre dois pontos. É essa seta que o tiro segue, e sem ela ele sai sempre para o mesmo lado.',
    },
  },
  diagonal: {
    prediction: {
      prompt: 'Apertando duas setas juntas, o Dino anda mais do que apertando uma?',
      choices: [
        { id: 'mais', label: 'Anda mais' },
        { id: 'igual', label: 'Anda o mesmo' },
      ],
      correctChoiceId: 'mais',
    },
    explain: {
      prompt: 'Por que a diagonal corre mais?',
      choices: [
        { id: 'soma', label: 'Porque os dois passos se somam no mesmo quadro.' },
        { id: 'curto', label: 'Porque o caminho na diagonal é mais curto.' },
      ],
      correctChoiceId: 'soma',
      explanation:
        'Apertar duas setas manda dois movimentos de uma vez. A correção existe para os dois caminhos andarem igual.',
    },
  },
  tilemap: {
    prediction: {
      prompt: 'Trocando uma letra do mapa escrito, o desenho muda?',
      choices: [
        { id: 'muda', label: 'Muda na hora' },
        { id: 'nao', label: 'Não, o desenho é separado' },
      ],
      correctChoiceId: 'muda',
    },
    explain: {
      prompt: 'O que o mapa do jogo é, na verdade?',
      choices: [
        { id: 'dado', label: 'Um dado: letras que o jogo lê e transforma em desenho.' },
        { id: 'imagem', label: 'Uma imagem grande, desenhada de uma vez.' },
      ],
      correctChoiceId: 'dado',
      explanation:
        'Cada letra vale uma coisa, sempre a mesma. Por isso escrever o mapa é construir a fase, e a mesma letra dá sempre o mesmo bloco.',
    },
  },

  /* ── O motor, o 3D e o ateliê ────────────────────────────────────────────────────────────── */
  pool: {
    prediction: {
      prompt: 'O contador de "criados desde o começo" pode diminuir?',
      choices: [
        { id: 'nunca', label: 'Nunca, ele só sobe' },
        { id: 'some', label: 'Diminui quando alguém some' },
      ],
      correctChoiceId: 'nunca',
    },
    explain: {
      prompt: 'O que a reciclagem muda?',
      choices: [
        { id: 'reaproveita', label: 'Reaproveita o mesmo corpo em vez de criar outro.' },
        { id: 'apaga', label: 'Apaga da conta os que já sumiram.' },
      ],
      correctChoiceId: 'reaproveita',
      explanation:
        'Um conta quem existe agora, o outro conta quanto já foi feito. Reciclando, o segundo para de crescer porque nada novo é criado.',
    },
  },
  'entity-state': {
    prediction: {
      prompt: 'Mudando o estado de um personagem, os outros dois mudam junto?',
      choices: [
        { id: 'nao', label: 'Não, cada um tem o seu' },
        { id: 'sim', label: 'Sim, o estado é do jogo' },
      ],
      correctChoiceId: 'nao',
    },
    explain: {
      prompt: 'De quem é o estado?',
      choices: [
        { id: 'cada', label: 'De cada personagem, um por um.' },
        { id: 'jogo', label: 'Do jogo inteiro, valendo para todos.' },
      ],
      correctChoiceId: 'cada',
      explanation:
        'Cada um carrega o próprio estado, e é ele que decide o que aquele personagem faz agora. Por isso um pode mirar enquanto o outro recarrega.',
    },
  },
  'delta-time': {
    prediction: {
      prompt: 'O mesmo jogo, num computador rápido e num devagar. Eles andam igual?',
      choices: [
        { id: 'contando', label: 'Depende do que o jogo conta' },
        { id: 'sempre', label: 'Sempre igual' },
      ],
      correctChoiceId: 'contando',
    },
    explain: {
      prompt: 'O que o jogo deve contar para ficar igual em qualquer máquina?',
      choices: [
        { id: 'tempo', label: 'O tempo que passou.' },
        { id: 'quadros', label: 'Os quadros que desenhou.' },
      ],
      correctChoiceId: 'tempo',
      explanation:
        'Quadro não é tempo: a máquina rápida faz mais quadros no mesmo segundo. Medindo em segundos, as duas andam o mesmo.',
    },
  },
  'circle-collision': {
    prediction: {
      prompt: 'Dois círculos se tocam quando os DESENHOS parecem encostar?',
      choices: [
        { id: 'conta', label: 'Quando a conta diz que encostaram' },
        { id: 'olho', label: 'Quando parecem encostados' },
      ],
      correctChoiceId: 'conta',
    },
    explain: {
      prompt: 'Qual é a conta da batida entre dois círculos?',
      choices: [
        { id: 'soma', label: 'A distância entre os centros contra a soma dos dois raios.' },
        { id: 'tamanho', label: 'O tamanho de um comparado com o do outro.' },
      ],
      correctChoiceId: 'soma',
      explanation:
        'Se a distância entre os centros for menor que a soma dos raios, eles se tocam. Mudar um raio muda o instante, sem mover ninguém.',
    },
  },
  'axis-z': {
    prediction: {
      prompt: 'No 3D, aumentar o y leva o objeto para onde?',
      choices: [
        { id: 'cima', label: 'Para cima' },
        { id: 'baixo', label: 'Para baixo, como na tela' },
      ],
      correctChoiceId: 'cima',
    },
    explain: {
      prompt: 'O que o terceiro eixo acrescenta?',
      choices: [
        { id: 'fundo', label: 'A profundidade: perto e longe.' },
        { id: 'altura', label: 'A altura, que a tela não tinha.' },
      ],
      correctChoiceId: 'fundo',
      explanation:
        'O z é o quanto para o fundo. E atenção: aqui o y cresce para CIMA, ao contrário da tela do jogo 2D.',
    },
  },
  'camera-3d': {
    prediction: {
      prompt: 'Girando a câmera em volta do cubo, quantas cores dá para ver de uma vez?',
      choices: [
        { id: 'varia', label: 'Varia conforme a posição' },
        { id: 'tres', label: 'Sempre as três' },
      ],
      correctChoiceId: 'varia',
    },
    explain: {
      prompt: 'O que decide o que aparece na tela do 3D?',
      choices: [
        { id: 'camera', label: 'De onde a câmera está olhando.' },
        { id: 'objeto', label: 'O tamanho do objeto.' },
      ],
      correctChoiceId: 'camera',
      explanation:
        'O cubo não mudou em nenhum momento. Quem mudou foi o ponto de vista, e é ele que decide quantas faces aparecem.',
    },
  },
  mesh: {
    prediction: {
      prompt: 'Por baixo da cor, do que um modelo 3D é feito?',
      choices: [
        { id: 'pontos', label: 'Pontos ligados por linhas' },
        { id: 'macico', label: 'Um bloco maciço, cheio por dentro' },
      ],
      correctChoiceId: 'pontos',
    },
    explain: {
      prompt: 'O que a textura é, num modelo 3D?',
      choices: [
        { id: 'roupa', label: 'A roupa que cobre os pontos ligados.' },
        { id: 'forma', label: 'A forma do modelo.' },
      ],
      correctChoiceId: 'roupa',
      explanation:
        'A forma vem dos pontos e das linhas, e eles continuam lá o tempo todo. A textura só pinta a superfície por cima.',
    },
  },
  'pick-ray': {
    prediction: {
      prompt: 'Mirando onde uma caixa cobre a outra, qual delas acende?',
      choices: [
        { id: 'frente', label: 'A da frente' },
        { id: 'duas', label: 'As duas' },
      ],
      correctChoiceId: 'frente',
    },
    explain: {
      prompt: 'O que acontece com a reta da mira?',
      choices: [
        { id: 'para', label: 'Ela sai da câmera e para na primeira coisa do caminho.' },
        { id: 'atravessa', label: 'Ela atravessa tudo e escolhe a maior.' },
      ],
      correctChoiceId: 'para',
      explanation:
        'A mira é uma reta que sai do seu olho. A primeira coisa que ela encontra é a escolhida, e o resto fica escondido atrás.',
    },
  },
  'fill-stroke': {
    prediction: {
      prompt: 'Tirando a linha de fora, ainda sobra desenho?',
      choices: [
        { id: 'sobra', label: 'Sobra o miolo pintado' },
        { id: 'some', label: 'Some tudo' },
      ],
      correctChoiceId: 'sobra',
    },
    explain: {
      prompt: 'Quantos desenhos há na mesma forma?',
      choices: [
        { id: 'dois', label: 'Dois: o miolo e o contorno.' },
        { id: 'um', label: 'Um só, com uma borda.' },
      ],
      correctChoiceId: 'dois',
      explanation:
        'Preencher e contornar são duas coisas feitas no mesmo traço. Cada uma existe sem a outra, e a forma continua a mesma.',
    },
  },
  shading: {
    prediction: {
      prompt: 'O que faz uma forma chapada parecer redonda?',
      choices: [
        { id: 'sombra', label: 'Uma segunda cor, mais escura de um lado' },
        { id: 'contorno', label: 'Um contorno mais grosso' },
      ],
      correctChoiceId: 'sombra',
    },
    explain: {
      prompt: 'De que lado fica a sombra?',
      choices: [
        { id: 'contrario', label: 'Do lado contrário ao da luz.' },
        { id: 'baixo', label: 'Sempre embaixo.' },
      ],
      correctChoiceId: 'contrario',
      explanation:
        'A luz bate de um lado e o outro fica escuro. É esse par de cores que faz o olho ver volume onde só há desenho plano.',
    },
  },
}
