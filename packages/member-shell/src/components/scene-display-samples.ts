import {
  castText,
  type SceneCast,
  type SceneId,
  type SceneReading,
} from '@sistemazero/core/learning/scene'

/**
 * Exemplos de apresentação da faixa e da frase de cada experiência.
 *
 * São TEXTOS para medir a moldura antes do primeiro gesto, não passos de uma demonstração:
 * a criança conduz a cena e o motor nunca executa estes exemplos. O estado inicial real
 * do caso também entra no molde no player.
 */
const DEFAULT_DISPLAY_SAMPLES: Record<
  SceneId,
  { readouts: readonly SceneReading[]; situations: readonly string[] }
> = {
  coordinates: {
    readouts: [
      {
        label: 'x',
        value: '110',
        tone: 'a',
      },
      {
        label: 'y',
        value: '150',
        tone: 'b',
      },
    ],
    situations: [
      'O Dino está em x 110, y 150.',
      'x foi de 110 para 300: o Dino foi para a direita. O y ficou igual.',
      'y foi de 150 para 240: o Dino desceu. O x ficou igual.',
      'Mudaram os dois: o Dino foi para a esquerda e para cima.',
    ],
  },
  'screen-reader': {
    readouts: [
      {
        label: 'descrição',
        value: 'escrita',
        tone: 'alert',
      },
      {
        label: 'diz o que fazer',
        value: 'ainda não',
        tone: 'b',
      },
      {
        label: 'diz como jogar',
        value: 'ainda não',
        tone: 'b',
      },
    ],
    situations: [
      'A descrição do jogo está vazia.',
      'A pessoa ouviu só isso.',
      'A frase diz o que fazer e como jogar.',
    ],
  },
  'stage-size': {
    readouts: [
      {
        label: 'largura',
        value: '800',
        tone: 'a',
      },
      {
        label: 'altura',
        value: '480',
        tone: 'b',
      },
      {
        label: 'borda',
        value: 'escondida',
        tone: 'alert',
      },
    ],
    situations: [
      'Tela de 800 por 480, com a borda escondida.',
      'Tela de 800 por 480, com a borda à vista. O jogo pede 480 por 270.',
      'Tela de 480 por 270, com a borda à vista. É a tela que o jogo pede.',
    ],
  },
  'draw-loop': {
    readouts: [
      {
        label: 'quadro',
        value: '12',
        tone: 'plain',
      },
      {
        label: 'x do Dino',
        value: '186',
        tone: 'a',
      },
      {
        label: 'Dinos na tela',
        value: '1',
        tone: 'b',
      },
    ],
    situations: [
      'Quadro 0: 1 Dino na tela.',
      'Quadro 4: o x do Dino mudou e a tela continua igual.',
      'Desenhou sem limpar: 5 Dinos na tela.',
      'Limpou e desenhou: um Dino só, no lugar novo.',
    ],
  },
  frames: {
    readouts: [
      {
        label: 'quadro',
        value: '1 de 2',
        tone: 'a',
      },
      {
        label: 'velocidade',
        value: '4 quadros por segundo',
        tone: 'b',
      },
      {
        label: 'prévia',
        value: 'parada',
        tone: 'plain',
      },
    ],
    situations: [
      'Na tela, com a prévia parada: o quadro 1.',
      'Na tela, com a prévia parada: o quadro 2.',
      'A prévia parou. Na tela ficou o quadro 2.',
    ],
  },
  'onion-skin': {
    readouts: [
      {
        label: 'quadro',
        value: '1 de 2',
        tone: 'a',
      },
      {
        label: 'fantasma',
        value: 'desligado',
        tone: 'b',
      },
      {
        label: 'o fogo 2 cresceu',
        value: 'quase nada',
        tone: 'plain',
      },
    ],
    situations: [
      'Fantasma desligado: só o quadro 1 está na tela.',
      'Sem o fantasma, só o fogo 2 está na tela.',
      'O fogo tracejado é o do quadro 1.',
      'Com o fantasma: o fogo 2 cresceu um pouco e cabe no quadro.',
      'Fantasma ligado no quadro 1, que não tem quadro anterior.',
    ],
  },
  symmetry: {
    readouts: [
      {
        label: 'espelho',
        value: 'cima e baixo',
        tone: 'a',
      },
      {
        label: 'seus traços',
        value: '0',
        tone: 'b',
      },
      {
        label: 'cópias do espelho',
        value: '0',
        tone: 'plain',
      },
    ],
    situations: [
      'Espelhos desligados, na grade da nave.',
      'Você pintou a asa.',
      'Você pintou a asa. O espelho pintou uma cópia.',
    ],
  },
  'pixel-vector': {
    readouts: [
      {
        label: 'aproximar',
        value: '2 vezes',
        tone: 'a',
      },
      {
        label: 'as duas pedras',
        value: 'de longe',
        tone: 'b',
      },
    ],
    situations: [
      'Lupa em 1: as duas pedras quase do tamanho do jogo.',
      'Lupa em 2: as duas pedras quase do tamanho do jogo.',
      'Lupa em 4. Olhe as bordas das duas pedras.',
      'Lupa em 8. Olhe as bordas das duas pedras.',
    ],
  },
  'sheet-vs-sprite': {
    readouts: [
      {
        label: 'recorte',
        value: '64 por 32',
        tone: 'a',
      },
      {
        label: 'no jogo',
        value: '54 por 54',
        tone: 'b',
      },
      {
        label: 'quadro',
        value: '1 de 2',
        tone: 'plain',
      },
    ],
    situations: [
      'Nenhum recorte da folha de 64 por 32 ainda: o jogo está vazio, num quadrado de 54 por 54.',
      'No jogo: a folha inteira, com as duas naves espremidas.',
      'Recorte de 32: no jogo aparece uma nave inteira.',
      'Recorte no quadro 1: no jogo, a nave com o fogo pequeno.',
    ],
  },
  world: {
    readouts: [
      {
        label: 'bastidores',
        value: 'com o Dino',
        tone: 'a',
      },
      {
        label: 'na tela do jogo',
        value: 'ainda não apareceu',
        tone: 'b',
      },
    ],
    situations: [
      'Os bastidores estão vazios e a tela do jogo também.',
      'O Dino está nos bastidores e ainda não apareceu na tela do jogo.',
      'O Dino está nos bastidores e apareceu na tela do jogo.',
    ],
  },
  layers: {
    readouts: [
      {
        label: '1º a desenhar',
        value: 'a floresta',
        tone: 'a',
      },
      {
        label: '2º a desenhar',
        value: 'a floresta',
        tone: 'b',
      },
    ],
    situations: [
      'Só um pedacinho do Dino aparece no desenho.',
      'O Dino aparece sem nada na frente.',
    ],
  },
  gravity: {
    readouts: [
      {
        label: 'gravidade',
        value: 'desligada',
        tone: 'a',
      },
      {
        label: 'altura agora',
        value: '405',
        tone: 'b',
      },
    ],
    situations: [
      'O Dino está parado no chão.',
      'O Dino está a 405 de altura.',
      'O Dino voltou ao chão.',
    ],
  },
  impulse: {
    readouts: [
      {
        label: 'impulso',
        value: '14',
        tone: 'plain',
      },
      {
        label: 'salto de antes',
        value: 'ainda não',
        tone: 'a',
      },
      {
        label: 'este salto',
        value: '163',
        tone: 'b',
      },
    ],
    situations: [
      'O impulso está em 9. Faça o Dino saltar para ver a altura.',
      'Impulso 9: o último salto chegou a 68 de altura.',
      'A marca de antes está em 68, e a deste salto em 163.',
    ],
  },
  'jump-sound': {
    readouts: [
      {
        label: 'o som toca quando',
        value: 'apertar Espaço',
        tone: 'a',
      },
      {
        label: 'pulos',
        value: '0',
        tone: 'plain',
      },
      {
        label: 'sons',
        value: '0',
        tone: 'b',
      },
    ],
    situations: [
      'Nenhum pulo e nenhum som ainda.',
      'Pulou, e nenhum som tocou.',
      'O Dino voltou ao chão.',
    ],
  },
  'fixed-vs-read': {
    readouts: [
      {
        label: 'centro x da nave',
        value: '400',
        tone: 'a',
      },
      {
        label: 'x do tiro',
        value: 'número 400',
        tone: 'b',
      },
      {
        label: 'marcas',
        value: '0',
        tone: 'plain',
      },
    ],
    situations: [
      'A nave está em x 400. O próximo tiro usa o número 400. Há 0 marcas de nascimento.',
    ],
  },
  'once-vs-always': {
    readouts: [
      {
        label: 'quadro',
        value: '0',
        tone: 'plain',
      },
      {
        label: 'personagens',
        value: '0',
        tone: 'a',
      },
      {
        label: 'ações disparadas',
        value: '0',
        tone: 'b',
      },
    ],
    situations: ['Quadro 0: 0 personagens, 0 tiros e 0 vidas.'],
  },
  'collision-pair': {
    readouts: [
      {
        label: 'pedras no grupo',
        value: '3',
        tone: 'a',
      },
      {
        label: 'tiros no grupo',
        value: '3',
        tone: 'b',
      },
      {
        label: 'quadro',
        value: '0',
        tone: 'plain',
      },
    ],
    situations: ['Há 3 pedras e 3 tiros nos grupos. Quadro 0.'],
  },
  invincibility: {
    readouts: [
      {
        label: 'vidas',
        value: '3',
        tone: 'a',
      },
      {
        label: 'proteção',
        value: '0 quadros restando',
        tone: 'b',
      },
      {
        label: 'quadro',
        value: '0',
        tone: 'plain',
      },
    ],
    situations: [
      'Quadro 0. A nave tem 3 vidas e 0 quadros de proteção restando. 0 pedras já bateram.',
    ],
  },
  'number-line': {
    readouts: [
      {
        label: 'velocidade',
        value: '-5',
        tone: 'a',
      },
      {
        label: 'pergunta',
        value: '-5 = -9',
        tone: 'b',
      },
      {
        label: 'resposta',
        value: 'não ✕',
        tone: 'alert',
      },
    ],
    situations: [
      'O marcador está em -5. A frase velocidade = -9 responde não. Somar -1 foi apertado 0 vezes.',
    ],
  },
  'unique-names': {
    readouts: [
      {
        label: 'criador nave',
        value: 'presente',
        tone: 'a',
      },
      {
        label: 'nome da folha',
        value: 'vazio',
        tone: 'b',
      },
      {
        label: 'prévia',
        value: 'voando',
        tone: 'plain',
      },
    ],
    situations: [
      'O bloco de cima cria nave. A folha se chama nenhum nome ainda. A prévia está voando.',
    ],
  },
  'motion-amount': {
    readouts: [
      {
        label: 'cratera anda',
        value: '0',
        tone: 'a',
      },
      {
        label: 'pedra inteira anda',
        value: '0',
        tone: 'b',
      },
      {
        label: 'Prévia',
        value: 'tocando · 8 por segundo',
        tone: 'plain',
      },
    ],
    situations: [
      'Os dois quadros alternam 8 vezes por segundo. A cratera anda 0 e o corpo anda 0 no segundo quadro.',
    ],
  },
  'two-clocks': {
    readouts: [
      {
        label: 'pedras que nasceram',
        value: '0',
        tone: 'a',
      },
      {
        label: 'nascimento',
        value: 'a cada 40 quadros',
        tone: 'b',
      },
      {
        label: 'giro',
        value: '8 desenhos por segundo',
        tone: 'plain',
      },
    ],
    situations: [
      'Quadro 0. Nasceram 0 pedras; cada uma troca desenhos a 8 por segundo. A última nasceu no quadro 0.',
    ],
  },
  'copy-vs-original': {
    readouts: [
      {
        label: 'jogo da aula',
        value: 'azul',
        tone: 'a',
      },
      {
        label: 'arquivo',
        value: 'ainda não existe',
        tone: 'plain',
      },
      {
        label: 'projeto no Estúdio',
        value: 'vazio',
        tone: 'b',
      },
    ],
    situations: [
      'O jogo da aula está azul. Ainda não há arquivo. O Estúdio ainda não tem projeto.',
    ],
  },
  'published-copy': {
    readouts: [
      {
        label: 'seu projeto',
        value: 'azul',
        tone: 'a',
      },
      {
        label: 'publicações no Mural',
        value: '0',
        tone: 'b',
      },
      {
        label: 'última publicação',
        value: 'nenhuma',
        tone: 'plain',
      },
    ],
    situations: ['Seu projeto está azul. O Mural tem 0 publicações; a tela está vazia.'],
  },
  'same-rules-new-skin': {
    readouts: [
      {
        label: 'tema',
        value: 'nave',
        tone: 'a',
      },
      {
        label: 'regra de atirar',
        value: 'ligada',
        tone: 'b',
      },
      {
        label: 'vidas',
        value: '3',
        tone: 'plain',
      },
    ],
    situations: [
      'Tema nave no espaço. As setas movem; a tecla de tiro está ligada. O obstáculo vem de cima; encostou, perde uma vida. Vidas: 3.',
    ],
  },
  spawn: {
    readouts: [
      {
        label: 'nasceram',
        value: 'a cada quadro',
        tone: 'b',
      },
      {
        label: 'sem relógio',
        value: '60 em 2 s',
        tone: 'b',
      },
      {
        label: 'com relógio',
        value: '2 em 2 s',
        tone: 'b',
      },
    ],
    situations: [
      'Ainda não nasceu nenhum cacto.',
      '60 cactos nasceram até agora.',
      'Criar cacto está no relógio, a cada 1 s. 2 cactos nasceram até agora.',
    ],
  },
  cleanup: {
    readouts: [
      {
        label: 'na tela',
        value: '3',
        tone: 'plain',
      },
      {
        label: 'no grupo',
        value: '3',
        tone: 'b',
      },
      {
        label: 'remover quem sai',
        value: 'desligado',
        tone: 'a',
      },
    ],
    situations: [
      '3 cactos na tela e 3 no grupo.',
      '4 cactos na tela e 6 no grupo.',
      '6 cactos na tela e 6 no grupo.',
    ],
  },
  'game-state': {
    readouts: [
      {
        label: 'toques do relógio',
        value: '0',
        tone: 'a',
      },
      {
        label: 'nascimentos',
        value: '0',
        tone: 'b',
      },
      {
        label: 'condição',
        value: 'sem pergunta',
        tone: 'plain',
      },
    ],
    situations: [
      'Na tela de início. 0 cactos criados até agora.',
      'Na tela de início. 1 cacto criado até agora.',
      'Durante a partida. 1 cacto criado até agora.',
    ],
  },
  controls: {
    readouts: [
      {
        label: 'tela',
        value: 'Jogando',
        tone: 'a',
      },
      {
        label: 'começa com',
        value: 'Enter e toque',
        tone: 'b',
      },
    ],
    situations: [
      'A tela de início mostra o convite para começar.',
      'Você tocou, e nada aconteceu.',
      'A partida está acontecendo.',
    ],
  },
  restart: {
    readouts: [
      {
        label: 'tela',
        value: 'Jogando',
        tone: 'a',
      },
      {
        label: 'cactos na pista',
        value: '0',
        tone: 'plain',
      },
      {
        label: 'no fim, o toque',
        value: 'vai para o início',
        tone: 'b',
      },
    ],
    situations: [
      'Na tela de início, com a pista vazia.',
      'Um cacto bateu no Dino: fim da partida.',
      'A partida nova começou com 3 cactos da partida anterior e acabou na hora, com uma batida.',
      'Durante a partida, com 1 cacto na pista.',
    ],
  },
  hitbox: {
    readouts: [
      {
        label: 'distância do cacto',
        value: '149',
        tone: 'a',
      },
      {
        label: 'área do Dino',
        value: '100%',
        tone: 'b',
      },
      {
        label: 'tamanho do Dino',
        value: '64',
        tone: 'plain',
      },
    ],
    situations: [
      'O cacto está a 149 do Dino. As áreas pontilhadas ainda não se encostam.',
      'BATEU! Os desenhos ainda têm um vão de 9.',
      'A área do Dino ficou em 80%. Não bateu.',
    ],
  },
  score: {
    readouts: [
      {
        label: 'tela',
        value: 'Início',
        tone: 'a',
      },
      {
        label: 'Somar ponto',
        value: 'dentro do Se',
        tone: 'plain',
      },
      {
        label: 'pontos',
        value: '0',
        tone: 'b',
      },
    ],
    situations: [
      'Na tela de início, Somar ponto está fora do Se, solto, e o placar está em 0.',
      'Na tela de início, Somar ponto está fora do Se, solto, e o placar está em 2.',
      'Na tela de início, Somar ponto está dentro do Se, a cada segundo, e o placar está em 0.',
      'No fim da partida, Somar ponto está dentro do Se, a cada segundo, e o placar está em 3.',
    ],
  },
  lives: {
    readouts: [
      {
        label: 'vidas',
        value: '3',
        tone: 'a',
      },
      {
        label: 'pontos',
        value: '0',
        tone: 'b',
      },
      {
        label: 'batidas',
        value: '0',
        tone: 'plain',
      },
    ],
    situations: [
      '3 vidas e 0 pontos no placar.',
      'O relógio andou e o placar está em 2.',
      'Uma vida saiu. Restam 2, e o placar continua em 2.',
      'Sem vidas, a partida acabou com o placar em 2.',
    ],
  },
  random: {
    readouts: [
      {
        label: 'último lugar',
        value: 'nenhum',
        tone: 'a',
      },
      {
        label: 'lugares diferentes',
        value: '0',
        tone: 'plain',
      },
      {
        label: 'última velocidade',
        value: 'nenhuma',
        tone: 'b',
      },
    ],
    situations: [
      'Nenhum lugar sorteado ainda.',
      'Saiu 520 de novo.',
      'Saiu −6: em 1 segundo, o cacto andou 180.',
    ],
  },
  acceleration: {
    readouts: [
      {
        label: 'base',
        value: '−5',
        tone: 'a',
      },
      {
        label: 'a condição',
        value: 'ligada',
        tone: 'b',
      },
      {
        label: 'último cacto',
        value: 'nenhum',
        tone: 'plain',
      },
    ],
    situations: [
      'A base está em −5, com a condição ligada. 0 cactos na fileira.',
      'Passaram 5 segundos: a base está em −9, e o cacto novo nasceu com −9.',
      'Passaram 5 segundos: a base está em −9, e o cacto novo nasceu com −10.',
    ],
  },
  velocity: {
    readouts: [
      {
        label: 'velocidade',
        value: 'vx −5 · vy 0',
        tone: 'a',
      },
      {
        label: 'posição',
        value: 'x 60 · y 135',
        tone: 'b',
      },
      {
        label: 'quadros',
        value: '10',
        tone: 'plain',
      },
    ],
    situations: [
      'O Dino está em x 60, y 135, com velocidade 0 para o lado e 0 para baixo.',
      'O Dino está em x 60, y 135, com velocidade −5 para o lado e 0 para baixo.',
      '5 quadros: o x foi de 60 para 85.',
      '5 quadros: o x foi de 85 para 60.',
      'O relógio andou, e o Dino continua em x 60, y 135.',
    ],
  },
  'hold-vs-press': {
    readouts: [
      {
        label: 'de cima',
        value: '0 passos',
        tone: 'a',
      },
      {
        label: 'de baixo',
        value: '0 passos',
        tone: 'b',
      },
      {
        label: 'a tecla',
        value: 'solta',
        tone: 'plain',
      },
    ],
    situations: [
      'A tecla está solta. Nenhuma raquete anda agora.',
      'A tecla está solta. A de cima deu 1 passo e a de baixo 0 passos.',
      'A tecla está solta. A de cima deu 1 passo e a de baixo 8 passos.',
    ],
  },
  variable: {
    readouts: [
      {
        label: 'guardado na caixa',
        value: 'sem caixa',
        tone: 'a',
      },
      {
        label: 'na tela',
        value: 'nada',
        tone: 'alert',
      },
      {
        label: 'mudanças',
        value: '0',
        tone: 'plain',
      },
    ],
    situations: [
      'A caixa pontos ainda não existe.',
      'A caixa pontos foi criada e guarda 0.',
      'A caixa pontos foi de 2 para 3.',
      'A caixa guarda 3, e a tela mostra 3.',
    ],
  },
  'group-loop': {
    readouts: [
      {
        label: 'medidas',
        value: '1º 118, 2º 112, 3º 125',
        tone: 'a',
      },
      {
        label: 'escolhido',
        value: 'nenhum',
        tone: 'b',
      },
      {
        label: 'laço',
        value: 'desligado',
        tone: 'plain',
      },
    ],
    situations: [
      'Você mediu 0 de 3 cactos.',
      'O 3º está a 125.',
      'O 2º é o mais perto dos três.',
      'O laço mede os três em todo quadro. O escolhido é o 1º.',
    ],
  },
  'enemy-type': {
    readouts: [
      {
        label: 'velocidade na ficha',
        value: '3',
        tone: 'a',
      },
      {
        label: 'vida na ficha',
        value: '2',
        tone: 'b',
      },
      {
        label: 'o cacto',
        value: 'copia a ficha ao nascer',
        tone: 'plain',
      },
    ],
    situations: [
      'A ficha diz velocidade 3 e vida 2. Nenhum cacto nasceu ainda.',
      '3 cactos na pista. A ficha diz velocidade 3 e vida 2.',
      '3 cactos na pista. A ficha diz velocidade 7 e vida 2.',
      '4 cactos na pista, com velocidade 7, 7, 7 e 3.',
    ],
  },
  camera: {
    readouts: [
      {
        label: 'o Dino no mundo',
        value: '200',
        tone: 'a',
      },
      {
        label: 'a tela mostra',
        value: '660 a 1140',
        tone: 'b',
      },
      {
        label: 'câmera',
        value: 'segue o Dino',
        tone: 'plain',
      },
    ],
    situations: [
      'A tela mostra do 0 ao 480, e o Dino está em 200.',
      'A tela mostra do 0 ao 480, e o Dino está em 700.',
      'A tela mostra do 460 ao 940, com o Dino no meio.',
      'A tela mostra do 660 ao 1140, com o Dino no meio.',
    ],
  },
  contact: {
    readouts: [
      {
        label: 'distância',
        value: '120',
        tone: 'plain',
      },
      {
        label: 'em cima',
        value: '0 corações a menos',
        tone: 'a',
      },
      {
        label: 'embaixo',
        value: '0 corações a menos',
        tone: 'b',
      },
    ],
    situations: ['O cacto está longe do Dino.', 'O cacto está encostando no Dino há 4 quadros.'],
  },
  cooldown: {
    readouts: [
      {
        label: 'recarga',
        value: '1 segundo',
        tone: 'a',
      },
      {
        label: 'tiros',
        value: '0',
        tone: 'b',
      },
      {
        label: 'apertos sem tiro',
        value: '0',
        tone: 'plain',
      },
    ],
    situations: [
      'Sem recarga. 0 tiros saíram.',
      'Sem recarga. 3 tiros saíram.',
      'Recarregando: falta 0,5 s. 1 tiro saiu. 1 aperto não virou tiro.',
    ],
  },
  aim: {
    readouts: [
      {
        label: 'alvo',
        value: 'x 380, y 220',
        tone: 'a',
      },
      {
        label: 'mira',
        value: 'desligada',
        tone: 'b',
      },
      {
        label: 'o tiro',
        value: 'ainda não saiu',
        tone: 'plain',
      },
    ],
    situations: [
      'A mira está desligada, e o alvo está em x 380, y 220.',
      'O alvo foi para x 120, y 220.',
      'O tiro passou longe do alvo.',
      'O tiro acertou o alvo.',
    ],
  },
  diagonal: {
    readouts: [
      {
        label: 'setas',
        value: 'nenhuma',
        tone: 'a',
      },
      {
        label: 'andou',
        value: 'nada ainda',
        tone: 'b',
      },
      {
        label: 'correção',
        value: 'desligada',
        tone: 'plain',
      },
    ],
    situations: [
      'O Dino está no começo, com a correção desligada.',
      'O Dino andou 60 e parou no círculo.',
      'O Dino andou 85 e passou do círculo.',
      'Com a correção, o Dino andou 60 na diagonal.',
    ],
  },
  tilemap: {
    readouts: [
      {
        label: 'casas trocadas',
        value: '0',
        tone: 'a',
      },
      {
        label: 'moedas no mapa',
        value: '0',
        tone: 'b',
      },
      {
        label: 'o mapa',
        value: '6 linhas, 10 casas cada',
        tone: 'plain',
      },
    ],
    situations: [
      'O chão do desenho está escrito na última linha do texto.',
      'Linha 4, casa 5: agora é bloco.',
      'Linha 3, casa 6: agora é moeda.',
      'Linha 2, casa 8: agora é moeda.',
    ],
  },
  pool: {
    readouts: [
      {
        label: 'na tela agora',
        value: '0',
        tone: 'a',
      },
      {
        label: 'fabricados desde o começo',
        value: '0',
        tone: 'b',
      },
      {
        label: 'reciclar quem saiu',
        value: 'desligado',
        tone: 'plain',
      },
    ],
    situations: [
      'Nenhum cacto ainda. Aperte ▶.',
      'O cacto nº 3 entrou. Os cactos nº 1 e 2 já saíram.',
      'O cacto nº 3 saiu e entrou de novo. O jogo não fabricou nenhum cacto novo.',
    ],
  },
  'entity-state': {
    readouts: [
      {
        label: '1ª',
        value: 'atirando',
        tone: 'a',
      },
      {
        label: '2ª',
        value: 'atirando',
        tone: 'a',
      },
      {
        label: '3ª',
        value: 'recarregando',
        tone: 'a',
      },
    ],
    situations: [
      'A 1ª torre está parada, a 2ª parada e a 3ª parada.',
      'A 1ª virou para o alvo. A 2ª soltou um tiro. A 3ª não fez nada.',
      'A 1ª virou para o alvo. A 2ª soltou um tiro. A 3ª encheu um pouco a recarga.',
      'A 1ª soltou um tiro. A 2ª soltou um tiro. A 3ª soltou um tiro.',
    ],
  },
  'delta-time': {
    readouts: [
      {
        label: 'quadros do rápido',
        value: '20',
        tone: 'a',
      },
      {
        label: 'quadros do devagar',
        value: '10',
        tone: 'b',
      },
      {
        label: 'o Dino anda',
        value: 'a cada segundo',
        tone: 'plain',
      },
    ],
    situations: [
      'Os dois estão na largada.',
      'O rápido está em 80 e o devagar em 40.',
      'Chegaram juntos! O rápido desenhou o dobro de quadros.',
    ],
  },
  'circle-collision': {
    readouts: [
      {
        label: 'distância entre os centros',
        value: '140',
        tone: 'a',
      },
      {
        label: 'soma dos raios',
        value: '60',
        tone: 'b',
      },
      {
        label: 'a conta diz',
        value: 'ainda não',
        tone: 'alert',
      },
    ],
    situations: [
      'Distância 140. Raios 30 + 30 = 60.',
      'Distância 60. Raios 30 + 30 = 60. A fila dos raios alcançou o outro centro.',
      'Distância 60. Raios 10 + 30 = 40.',
    ],
  },
  'axis-z': {
    readouts: [
      {
        label: 'x',
        value: '60',
        tone: 'alert',
      },
      {
        label: 'y (altura)',
        value: '70',
        tone: 'leaf',
      },
      {
        label: 'z (negativo é o fundo)',
        value: '−80',
        tone: 'a',
      },
    ],
    situations: [
      'O cubo está no chão, no meio, com a sombra embaixo.',
      'O cubo está no chão, lá no fundo, com a sombra embaixo. No fundo, o cubo parece menor.',
      'O cubo está no ar, lá no fundo. A sombra ficou no chão, bem embaixo. No fundo, o cubo parece menor.',
    ],
  },
  'camera-3d': {
    readouts: [
      {
        label: 'volta da câmera',
        value: '2 de 8',
        tone: 'a',
      },
      {
        label: 'altura da câmera',
        value: 'por cima',
        tone: 'b',
      },
    ],
    situations: [
      'A câmera está no canto do cubo, na altura do meio. Volta 2 de 8.',
      'A câmera está bem de frente para um lado, na altura do meio. Volta 1 de 8.',
      'A câmera está no canto do cubo, olhando por cima. Volta 2 de 8.',
      'A câmera voltou para onde começou.',
    ],
  },
  mesh: {
    readouts: [
      {
        label: 'a pele',
        value: 'transparente',
        tone: 'a',
      },
      {
        label: 'volta do modelo',
        value: '2 de 8',
        tone: 'b',
      },
      {
        label: 'pontos do modelo',
        value: '8',
        tone: 'plain',
      },
    ],
    situations: [
      'O modelo está com a pele inteira.',
      'A pele está transparente. Os pontos estão logo embaixo.',
      'O modelo girou, e os pontos giraram junto.',
    ],
  },
  'pick-ray': {
    readouts: [
      {
        label: 'caixas no caminho',
        value: '0',
        tone: 'a',
      },
      {
        label: 'acendeu',
        value: 'nenhuma',
        tone: 'b',
      },
    ],
    situations: [
      'Nada no caminho: a reta foi até o fim.',
      'A reta saiu do seu olho e bateu na caixa C.',
      'A reta saiu do seu olho e bateu na caixa B. A caixa A ficou atrás.',
    ],
  },
  'fill-stroke': {
    readouts: [
      {
        label: 'preenchimento',
        value: 'Sem cor',
        tone: 'a',
      },
      {
        label: 'contorno',
        value: 'laranja',
        tone: 'b',
      },
    ],
    situations: [
      'Preenchimento azul, contorno laranja.',
      'Preenchimento azul, contorno em Sem cor.',
      'Preenchimento em Sem cor, contorno laranja.',
    ],
  },
  shading: {
    readouts: [
      {
        label: 'o sol está na',
        value: 'esquerda',
        tone: 'a',
      },
      {
        label: 'tons de azul',
        value: '1',
        tone: 'b',
      },
    ],
    situations: [
      'A bola tem um tom só, com o sol na esquerda.',
      'Sol na esquerda, sombra na direita.',
      'Sol na direita, sombra na esquerda.',
    ],
  },
}

export function sceneDisplaySamples(scene: SceneId, cast?: SceneCast) {
  const samples = DEFAULT_DISPLAY_SAMPLES[scene]
  if (!cast) return samples
  return {
    readouts: samples.readouts.map((reading) => ({
      ...reading,
      label: castText(reading.label, cast),
      value: castText(reading.value, cast),
    })),
    situations: samples.situations.map((situation) => castText(situation, cast)),
  }
}
