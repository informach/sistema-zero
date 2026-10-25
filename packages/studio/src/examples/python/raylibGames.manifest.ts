import type { ExampleExperience } from '../../core/example'
import type { ExtensionExampleDifficulty } from '../../extensions/types'
import type { PgzeroMusic } from './pgzeroGames.manifest'
import type { VisualReferenceSound } from './visualReferenceGames.manifest'

export interface RaylibGame {
  /** Folder in src/examples/python/raylib and the `python:<key>:blocks|code` gallery identity. */
  key: string
  /** camelCase prefix of the generated files. */
  stem: string
  name: string
  emoji: string
  description: string
  genre: string
  concepts: readonly string[]
  difficulty: ExtensionExampleDifficulty
  experience: ExampleExperience
  /** Which extension the game installs: Raylib 2D or Raylib 3D. */
  extension: '2d' | '3d'
  /** The lesson or game of the Clear Code course that inspired the mechanics (NOTICE.md). */
  inspiration: string
  howToPlay: string
  /** Small changes a child can try, in the README. */
  ideas: readonly string[]
  /** Sound effects, written to sounds/<path>. */
  sounds: readonly VisualReferenceSound[]
  /** Background music, written to music/<path> as OGG. */
  music: readonly PgzeroMusic[]
  /** Qualification receipt in docs/continuity/2026-10-24-python-raylib-games-evidence. */
  receipt: string
}

/**
 * The Raylib examples of the gallery: the Clear Code raylib course condensed into lessons, then
 * its games. Each one is an original implementation with original art (scripts/python/
 * raylib-art.ts) and sounds; nothing from the course is copied. Every game runs unchanged on
 * the desktop `raylib==6.0.1.0` (scripts/python/raylib-playtest).
 */
export const RAYLIB_GAMES = [
  {
    key: 'ola-raylib',
    stem: 'olaRaylib',
    name: 'Olá, Raylib',
    emoji: '👋',
    description:
      'O primeiro programa: formas, a mesma nave em três versões e texto com duas fontes.',
    genre: 'Primeiros passos',
    concepts: ['Blocos', 'Ponte', 'Código', 'Formas', 'Imagens', 'Texto', 'Mouse'],
    difficulty: 'beginner',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 1 (base)',
    howToPlay: 'Clique no círculo grande para trocar a cor dele.',
    ideas: [
      'Troque o texto de boas-vindas.',
      'Mude a cor do fundo em `clear_background`.',
      'Troque `images/nave.png` por um desenho seu do Pinta.',
    ],
    sounds: [],
    music: [],
    receipt: 'ola-raylib-r1.json.snapshot',
  },
  {
    key: 'nave-que-desliza',
    stem: 'naveQueDesliza',
    name: 'Nave que Desliza',
    emoji: '🚀',
    description:
      'Pilote a nave com as setas, pegue as estrelas e fuja da pedra que quica sozinha pela tela.',
    genre: 'Coleta',
    concepts: ['Blocos', 'Ponte', 'Código', 'Teclado', 'Tempo do quadro', 'Vetores', 'Colisão'],
    difficulty: 'beginner',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 2 e 3 (movimento e teclado)',
    howToPlay:
      'Use as setas para pilotar a nave e pegar as estrelas. Se a pedra encostar, a nave volta ao começo.',
    ideas: [
      'Deixe a pedra mais rápida mudando VELOCIDADE_PEDRA.',
      'Tire a linha do `vector2_normalize` e veja a diagonal ficar mais rápida.',
      'Coloque uma segunda pedra.',
    ],
    sounds: [],
    music: [],
    receipt: 'nave-que-desliza-r1.json.snapshot',
  },
  {
    key: 'encostou',
    stem: 'encostou',
    name: 'Encostou!',
    emoji: '🧱',
    description:
      'Um labirinto de paredes que seguram a caixa: pegue todas as moedas para a saída abrir.',
    genre: 'Labirinto',
    concepts: ['Blocos', 'Ponte', 'Código', 'Colisão', 'Listas', 'Mapa em texto', 'Funções'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 4 e 8 (colisões e resolução de colisão)',
    howToPlay:
      'Use as setas para andar pelo labirinto. Pegue todas as moedas; só então a saída fica verde e abre. Enter recomeça.',
    ideas: [
      'Desenhe um labirinto novo trocando as linhas de MAPA.',
      'Coloque mais moedas com a letra M.',
      'Deixe a caixa mais rápida em VELOCIDADE.',
    ],
    sounds: [],
    music: [],
    receipt: 'encostou-r1.json.snapshot',
  },
  {
    key: 'camera-que-segue',
    stem: 'cameraQueSegue',
    name: 'Câmera que Segue',
    emoji: '🎥',
    description:
      'Um mundo maior que a tela: a câmera segue a bola enquanto você caça gemas entre os planetas.',
    genre: 'Exploração',
    concepts: ['Blocos', 'Ponte', 'Código', 'Câmera 2D', 'Zoom', 'Sorteio', 'Listas'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 5 (câmera)',
    howToPlay:
      'As setas movem a bola. Q e W mudam o zoom, A e S giram a câmera e R deixa a câmera reta. Pegue as 12 gemas; Enter espalha de novo.',
    ideas: [
      'Aumente MUNDO para o mundo ficar maior.',
      'Troque o fundo da tela e as cores dos planetas.',
      'Mostre o zoom na tela com `camera.zoom`.',
    ],
    sounds: [],
    music: [],
    receipt: 'camera-que-segue-r1.json.snapshot',
  },
  {
    key: 'sprites-timer-animacao',
    stem: 'spritesTimerAnimacao',
    name: 'Sprites, Timer e Animação',
    emoji: '🍎',
    description:
      'O herói anda com animação e pega as maçãs que um cronômetro solta do céu. Três maçãs no chão e acabou.',
    genre: 'Coleta',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Herança', 'Cronômetro', 'Animação', 'Som'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 6, 7, 9 e 10 (som, classes, timer e animação)',
    howToPlay:
      'As setas andam para os lados. Pegue as maçãs antes que caiam no chão: cada uma que cai custa uma vida. Enter recomeça.',
    ideas: [
      'Mude o 0.9 do cronômetro para as maçãs caírem mais depressa.',
      'Troque o 8 da animação para o herói mexer as pernas mais rápido.',
      'Desenhe o seu herói no Pinta, com quatro quadros, e troque `images/heroi0.png` a `heroi3.png`.',
    ],
    sounds: [
      { path: 'pegar.wav', notes: [784, 1047], noteMilliseconds: 60 },
      { path: 'perder.wav', notes: [330, 262, 196], noteMilliseconds: 110 },
    ],
    music: [],
    receipt: 'sprites-timer-animacao-r1.json.snapshot',
  },
  {
    key: 'dino-corredor',
    stem: 'dinoCorredor',
    name: 'Dino Corredor',
    emoji: '🦖',
    description:
      'O dino corre sozinho pelo deserto: pule os cactos e os passarinhos. Quanto mais longe, mais rápido.',
    genre: 'Corrida sem fim',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Gravidade',
      'Classes',
      'Animação',
      'Música',
      'Recorde',
    ],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'Dino runner',
    howToPlay:
      'Espaço ou a seta para cima pulam. Desvie dos cactos e dos passarinhos; ao bater, Enter corre de novo e o recorde fica guardado.',
    ideas: [
      'Mude PULO e GRAVIDADE e veja o pulo ficar mais alto ou mais baixo.',
      'Faça o jogo acelerar mais depressa trocando o 8 de `velocidade`.',
      'Desenhe o seu dino no Pinta e troque `images/dino0.png` e `images/dino1.png`.',
    ],
    sounds: [
      { path: 'pulo.wav', notes: [523, 784], noteMilliseconds: 50 },
      { path: 'batida.wav', notes: [220, 165, 110], noteMilliseconds: 120 },
    ],
    music: [
      {
        path: 'tema.ogg',
        notes: [392, 494, 587, 494, 440, 523, 659, 523, 392, 494, 587, 784, 698, 587, 523, 494],
        noteMilliseconds: 180,
      },
    ],
    receipt: 'dino-corredor-r1.json.snapshot',
  },
  {
    key: 'chuva-de-meteoros',
    stem: 'chuvaDeMeteoros',
    name: 'Chuva de Meteoros',
    emoji: '☄️',
    description:
      'Meteoros girando caem do céu: pilote a nave, atire com o laser e veja quantos segundos você aguenta.',
    genre: 'Nave',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Classes',
      'Herança',
      'Colisão de círculos',
      'Animação',
      'Música',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '2d',
    inspiration: 'game 2D (space shooter)',
    howToPlay:
      'As setas pilotam a nave e o espaço atira. Um meteoro que encostar na nave acaba o voo; Enter voa de novo e o recorde fica guardado.',
    ideas: [
      'Mude TEMPO_ENTRE_METEOROS para chover mais ou menos meteoros.',
      'Faça o laser mais rápido em VELOCIDADE_LASER.',
      'Desenhe a sua nave no Pinta e troque `images/nave.png`.',
    ],
    sounds: [
      { path: 'laser.wav', notes: [1568, 1175, 880], noteMilliseconds: 30 },
      { path: 'explosao.wav', notes: [196, 147, 110, 82], noteMilliseconds: 70 },
    ],
    music: [
      {
        path: 'tema.ogg',
        notes: [220, 262, 330, 262, 247, 294, 370, 294, 220, 262, 330, 440, 392, 330, 294, 247],
        noteMilliseconds: 200,
      },
    ],
    receipt: 'chuva-de-meteoros-r1.json.snapshot',
  },
  {
    key: 'batalha-de-monstrinhos',
    stem: 'batalhaDeMonstrinhos',
    name: 'Batalha de Monstrinhos',
    emoji: '⚔️',
    description:
      'Uma batalha por turnos: escolha golpes, troque de monstrinho e use a vantagem dos elementos.',
    genre: 'Batalha por turnos',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Dicionários',
      'Funções',
      'Cronômetro',
      'Menus',
      'Música',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '2d',
    inspiration: 'Pokemon-style Battle',
    howToPlay:
      'As setas para cima e para baixo escolhem, Enter confirma e ESC volta. Atacar mostra os golpes, Trocar chama outro da equipe, Defender diminui o próximo golpe e Fugir acaba a batalha. Água vence fogo, fogo vence planta, planta vence água e raio vence água.',
    ideas: [
      'Mude o dano dos golpes em GOLPES.',
      'Crie um monstrinho novo em MONSTROS (e desenhe ele no Pinta).',
      'Acrescente uma vantagem nova em VANTAGENS.',
    ],
    sounds: [
      { path: 'choque.wav', notes: [1319, 988, 1319, 988], noteMilliseconds: 40 },
      { path: 'jato.wav', notes: [523, 659, 784], noteMilliseconds: 50 },
      { path: 'chama.wav', notes: [196, 262, 330], noteMilliseconds: 60 },
      { path: 'folha.wav', notes: [880, 784, 698], noteMilliseconds: 50 },
      { path: 'arranhao.wav', notes: [1568, 1047], noteMilliseconds: 30 },
      { path: 'cura.wav', notes: [523, 659, 784, 1047], noteMilliseconds: 70 },
    ],
    music: [
      {
        path: 'batalha.ogg',
        notes: [330, 392, 440, 392, 330, 294, 330, 247, 330, 392, 494, 440, 392, 330, 294, 330],
        noteMilliseconds: 170,
      },
    ],
    receipt: 'batalha-de-monstrinhos-r1.json.snapshot',
  },
  {
    key: 'aventura-do-heroi',
    stem: 'aventuraDoHeroi',
    name: 'Aventura do Herói',
    emoji: '🗡️',
    description:
      'Explore a ilha com a espada: corte o mato, derrote as gosmas e não deixe os corações acabarem.',
    genre: 'Aventura',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Câmera 2D',
      'Mapa em texto',
      'Classes',
      'Ordem de desenho',
      'Música',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '2d',
    inspiration: 'Zelda-style Adventure',
    howToPlay:
      'As setas andam e o espaço balança a espada para onde o herói está olhando. As gosmas perseguem quem chega perto; cada encostão tira um coração. Derrote todas para limpar a ilha; Enter recomeça.',
    ideas: [
      'Desenhe uma ilha nova trocando as letras de MAPA.',
      'Dê mais corações ao herói em VIDAS.',
      'Faça as gosmas mais rápidas mudando o 70 em `Gosma.atualizar`.',
    ],
    sounds: [
      { path: 'espada.wav', notes: [1175, 880], noteMilliseconds: 40 },
      { path: 'acerto.wav', notes: [392, 262], noteMilliseconds: 60 },
      { path: 'dano.wav', notes: [294, 220, 175], noteMilliseconds: 90 },
    ],
    music: [
      {
        path: 'aventura.ogg',
        notes: [262, 330, 392, 523, 494, 392, 330, 294, 262, 330, 392, 440, 392, 330, 294, 262],
        noteMilliseconds: 220,
      },
    ],
    receipt: 'aventura-do-heroi-r1.json.snapshot',
  },
] as const satisfies readonly RaylibGame[]

export type RaylibGameKey = (typeof RAYLIB_GAMES)[number]['key']

/** Text files of every example, besides its media. */
export const RAYLIB_GAME_FILES = ['main.py', 'README.md', 'NOTICE.md', 'LICENSE'] as const
