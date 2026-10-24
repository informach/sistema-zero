import type { StudioPythonRuntimeFeature } from '@sistemazero/core/studio/python-runtime-features'
import type { ExampleExperience } from '../../core/example'
import type { ExtensionExampleDifficulty } from '../../extensions/types'

/** Original procedural sound: integer frequencies (Hz) and one duration per note. */
export interface VisualReferenceSound {
  path: string
  notes: readonly number[]
  noteMilliseconds: number
  noise?: boolean
}

export interface VisualReferenceGame {
  /** Folder in src/examples/python and the `python:<key>:blocks|code` gallery identity. */
  key: string
  /** camelCase prefix of the generated files; the export names are its CONSTANT_CASE. */
  stem: string
  name: string
  emoji: string
  description: string
  genre: string
  concepts: readonly string[]
  difficulty: ExtensionExampleDifficulty
  experience: ExampleExperience
  requiredPythonFeatures: readonly StudioPythonRuntimeFeature[]
  sounds: readonly VisualReferenceSound[]
  /** Qualification receipt in docs/continuity/2026-10-22-python-reference-games-visual-evidence. */
  receipt: string
}

/**
 * The one list of visual reference games. Generators, gallery and tests derive from it;
 * a game exists only after its sources, scores and qualification receipt are versioned.
 */
export const VISUAL_REFERENCE_GAMES = [
  {
    key: 'pacman-visual',
    stem: 'pacmanVisual',
    name: 'Pac-Man',
    emoji: '🟡',
    description:
      'Explore o labirinto, recolha pontos e escape de sete fantasmas. Programa inteiro editável.',
    genre: 'Labirinto',
    concepts: ['Blocos', 'Ponte', 'Código', 'Funções', 'Listas', 'Colisões', 'Eventos', 'Som'],
    difficulty: 'advanced',
    experience: 'game',
    requiredPythonFeatures: ['turtle-compound-shapes'],
    sounds: [
      { path: 'opening.wav', notes: [262, 330, 392, 523], noteMilliseconds: 120 },
      { path: 'collect.wav', notes: [660, 880], noteMilliseconds: 40 },
      { path: 'power.wav', notes: [392, 523, 659], noteMilliseconds: 90 },
      { path: 'collision.wav', notes: [330, 220, 110], noteMilliseconds: 110 },
    ],
    receipt: 'pacman-visual-r6.json.snapshot',
  },
  {
    key: 'space-arena-visual',
    stem: 'spaceArenaVisual',
    name: 'Space Arena',
    emoji: '🚀',
    description:
      'Pilote com inércia, enfrente inimigos e explore a arena com câmera e radar. Programa inteiro editável.',
    genre: 'Nave espacial',
    concepts: ['Blocos', 'Ponte', 'Código', 'Funções', 'Física', 'Partículas', 'Câmera', 'Som'],
    difficulty: 'advanced',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'bgm.wav',
        notes: [131, 196, 262, 196, 147, 220, 294, 220, 165, 247, 330, 247, 147, 220, 294, 196],
        noteMilliseconds: 250,
      },
      { path: 'explosion.wav', notes: [100, 70, 40], noteMilliseconds: 90, noise: true },
      { path: 'missile_fire.wav', notes: [1200, 800, 400], noteMilliseconds: 35 },
      { path: 'powerup.wav', notes: [440, 554, 659, 880], noteMilliseconds: 70 },
      { path: 'thruster.wav', notes: [65, 66, 65, 64], noteMilliseconds: 75, noise: true },
    ],
    receipt: 'space-arena-visual-r6.json.snapshot',
  },
  {
    key: 'snake-visual',
    stem: 'snakeVisual',
    name: 'Cobrinha',
    emoji: '🐍',
    description:
      'Coma frutas, cresça sem bater na borda nem em si mesma; no modo Lagarta, cada fruta acelera.',
    genre: 'Arcade',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Listas', 'Grade', 'Eventos', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      { path: 'abertura.wav', notes: [392, 494, 587, 784], noteMilliseconds: 110 },
      { path: 'comer.wav', notes: [784, 1047], noteMilliseconds: 45 },
      { path: 'bater.wav', notes: [294, 196, 131], noteMilliseconds: 120 },
    ],
    receipt: 'snake-visual-r3.json.snapshot',
  },
  {
    key: 'pong-visual',
    stem: 'pongVisual',
    name: 'Pong',
    emoji: '🏓',
    description:
      'Rebata a bola com as raquetes, mude o ângulo pelo ponto do toque e faça 7 pontos; o computador pode jogar.',
    genre: 'Arcade',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Ângulos', 'Colisões', 'Eventos', 'Som'],
    difficulty: 'intermediate',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'rebater.wav',
        notes: [660, 880],
        noteMilliseconds: 40,
      },
      {
        path: 'parede.wav',
        notes: [440],
        noteMilliseconds: 30,
      },
      {
        path: 'ponto.wav',
        notes: [523, 392],
        noteMilliseconds: 90,
      },
      {
        path: 'vitoria.wav',
        notes: [523, 659, 784, 1047],
        noteMilliseconds: 120,
      },
    ],
    receipt: 'pong-visual-r2.json.snapshot',
  },
  {
    key: 'tron-visual',
    stem: 'tronVisual',
    name: 'Tron',
    emoji: '🏍️',
    description:
      'Duas motos de luz deixam rastro na arena; vire sem bater e vença 3 rodadas antes da outra moto.',
    genre: 'Arcade',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Conjuntos', 'Grade', 'Eventos', 'Som'],
    difficulty: 'intermediate',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'largada.wav',
        notes: [392, 523, 784],
        noteMilliseconds: 110,
      },
      {
        path: 'curva.wav',
        notes: [988],
        noteMilliseconds: 25,
      },
      {
        path: 'batida.wav',
        notes: [220, 147, 98],
        noteMilliseconds: 120,
        noise: true,
      },
      {
        path: 'vitoria.wav',
        notes: [523, 659, 784, 1047],
        noteMilliseconds: 120,
      },
    ],
    receipt: 'tron-visual-r2.json.snapshot',
  },
  {
    key: 'flappy-visual',
    stem: 'flappyVisual',
    name: 'Flappy',
    emoji: '🐦',
    description:
      'Bata as asas com Espaço ou clique para passar entre os canos sem encostar; cada cano vale um ponto.',
    genre: 'Arcade',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Gravidade', 'Colisões', 'Aleatório', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'asa.wav',
        notes: [700, 900],
        noteMilliseconds: 30,
      },
      {
        path: 'ponto.wav',
        notes: [880, 1320],
        noteMilliseconds: 50,
      },
      {
        path: 'batida.wav',
        notes: [196, 131],
        noteMilliseconds: 110,
        noise: true,
      },
    ],
    receipt: 'flappy-visual-r2.json.snapshot',
  },
  {
    key: 'spinner-visual',
    stem: 'spinnerVisual',
    name: 'Spinner',
    emoji: '🌀',
    description:
      'Dê impulsos para girar o spinner, veja o atrito frear e tente bater o recorde de voltas com um impulso.',
    genre: 'Brinquedo',
    concepts: ['Blocos', 'Ponte', 'Código', 'Ângulos', 'Trigonometria', 'Atrito', 'Eventos', 'Som'],
    difficulty: 'beginner',
    experience: 'exploration',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'impulso.wav',
        notes: [330, 494, 660],
        noteMilliseconds: 40,
      },
      {
        path: 'clique.wav',
        notes: [1760],
        noteMilliseconds: 15,
      },
    ],
    receipt: 'spinner-visual-r2.json.snapshot',
  },
  {
    key: 'tictactoe-visual',
    stem: 'tictactoeVisual',
    name: 'Jogo da Velha',
    emoji: '⭕',
    description:
      'Marque X e O pelo teclado numérico, setas ou clique; feche uma linha ou enfrente o computador.',
    genre: 'Tabuleiro',
    concepts: ['Blocos', 'Ponte', 'Código', 'Listas', 'Funções', 'Condições', 'Eventos', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'jogada.wav',
        notes: [523, 659],
        noteMilliseconds: 50,
      },
      {
        path: 'recusa.wav',
        notes: [196, 165],
        noteMilliseconds: 90,
      },
      {
        path: 'vitoria.wav',
        notes: [523, 659, 784, 1047],
        noteMilliseconds: 110,
      },
      {
        path: 'empate.wav',
        notes: [392, 330, 392],
        noteMilliseconds: 120,
      },
    ],
    receipt: 'tictactoe-visual-r2.json.snapshot',
  },
  {
    key: 'connect-four-visual',
    stem: 'connectFourVisual',
    name: 'Ligue 4',
    emoji: '🔴',
    description:
      'Solte peças vermelhas e amarelas nas colunas e ligue quatro em linha antes da outra pessoa.',
    genre: 'Tabuleiro',
    concepts: ['Blocos', 'Ponte', 'Código', 'Listas', 'Laços', 'Animação', 'Eventos', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'encaixe.wav',
        notes: [330, 220],
        noteMilliseconds: 45,
      },
      {
        path: 'recusa.wav',
        notes: [196, 165],
        noteMilliseconds: 90,
      },
      {
        path: 'vitoria.wav',
        notes: [392, 523, 659, 784, 1047],
        noteMilliseconds: 100,
      },
      {
        path: 'empate.wav',
        notes: [392, 330, 392],
        noteMilliseconds: 120,
      },
    ],
    receipt: 'connect-four-visual-r2.json.snapshot',
  },
  {
    key: 'tiles-visual',
    stem: 'tilesVisual',
    name: 'Quebra-cabeça de 15',
    emoji: '🧩',
    description:
      'Deslize as peças numeradas com as setas ou o clique até colocar de 1 a 15 em ordem.',
    genre: 'Quebra-cabeça',
    concepts: ['Blocos', 'Ponte', 'Código', 'Listas', 'Laços', 'Aleatório', 'Eventos', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'deslizar.wav',
        notes: [440, 554],
        noteMilliseconds: 35,
      },
      {
        path: 'bloqueio.wav',
        notes: [147],
        noteMilliseconds: 90,
      },
      {
        path: 'embaralhar.wav',
        notes: [262, 392, 330, 494, 392, 587],
        noteMilliseconds: 55,
      },
      {
        path: 'vitoria.wav',
        notes: [523, 659, 784, 1047, 1319],
        noteMilliseconds: 110,
      },
    ],
    receipt: 'tiles-visual-r2.json.snapshot',
  },
  {
    key: 'memory-visual',
    stem: 'memoryVisual',
    name: 'Jogo da Memória',
    emoji: '🃏',
    description:
      'Vire as cartas com as setas ou o clique e ache os oito pares de figuras com poucas tentativas.',
    genre: 'Memória',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Listas', 'Aleatório', 'Eventos', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'virar.wav',
        notes: [660],
        noteMilliseconds: 40,
      },
      {
        path: 'acerto.wav',
        notes: [659, 880, 1175],
        noteMilliseconds: 70,
      },
      {
        path: 'erro.wav',
        notes: [262, 208],
        noteMilliseconds: 110,
      },
      {
        path: 'vitoria.wav',
        notes: [523, 659, 784, 1047, 784, 1047],
        noteMilliseconds: 100,
      },
    ],
    receipt: 'memory-visual-r2.json.snapshot',
  },
  {
    key: 'simon-visual',
    stem: 'simonVisual',
    name: 'Genius',
    emoji: '🟢',
    description:
      'Veja as cores piscarem e repita a sequência com as setas ou o clique; a cada acerto ela cresce.',
    genre: 'Memória',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Listas',
      'Aleatório',
      'Temporizador',
      'Eventos',
      'Som',
    ],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'verde.wav',
        notes: [392],
        noteMilliseconds: 300,
      },
      {
        path: 'vermelho.wav',
        notes: [330],
        noteMilliseconds: 300,
      },
      {
        path: 'azul.wav',
        notes: [196],
        noteMilliseconds: 300,
      },
      {
        path: 'amarelo.wav',
        notes: [262],
        noteMilliseconds: 300,
      },
      {
        path: 'erro.wav',
        notes: [147, 110],
        noteMilliseconds: 220,
      },
    ],
    receipt: 'simon-visual-r2.json.snapshot',
  },
  {
    key: 'bubbles-visual',
    stem: 'bubblesVisual',
    name: 'Bolhas no Fundo do Mar',
    emoji: '🐠',
    description:
      'Guie o submarino e estoure bolhas antes que o tempo acabe; cada 1000 pontos dá mais 30 segundos.',
    genre: 'Arcade',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Listas', 'Colisões', 'Tempo', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'estourar.wav',
        notes: [880, 1320],
        noteMilliseconds: 35,
      },
      {
        path: 'bonus.wav',
        notes: [523, 659, 784, 1047],
        noteMilliseconds: 90,
      },
      {
        path: 'fim.wav',
        notes: [392, 330, 262, 196],
        noteMilliseconds: 150,
      },
    ],
    receipt: 'bubbles-visual-r2.json.snapshot',
  },
  {
    key: 'egg-catcher-visual',
    stem: 'eggCatcherVisual',
    name: 'Pega-Ovos',
    emoji: '🥚',
    description:
      'Mova a cesta e pegue os ovos que caem cada vez mais rápido; o ovo dourado vale mais.',
    genre: 'Arcade',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Herança', 'Colisões', 'Eventos', 'Som'],
    difficulty: 'intermediate',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'pegar.wav',
        notes: [660, 880],
        noteMilliseconds: 40,
      },
      {
        path: 'dourado.wav',
        notes: [784, 988, 1175, 1568],
        noteMilliseconds: 60,
      },
      {
        path: 'quebrar.wav',
        notes: [180, 120, 90],
        noteMilliseconds: 80,
        noise: true,
      },
      {
        path: 'fim.wav',
        notes: [392, 311, 262, 196],
        noteMilliseconds: 150,
      },
    ],
    receipt: 'egg-catcher-visual-r2.json.snapshot',
  },
  {
    key: 'monkey-visual',
    stem: 'monkeyVisual',
    name: 'Macaco e Morcego',
    emoji: '🐒',
    description:
      'Lance a banana para cima, acerte o morcego e o hipopótamo voador e corra para buscá-la.',
    genre: 'Arcade',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Herança', 'Estados', 'Colisões', 'Som'],
    difficulty: 'intermediate',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'lancar.wav',
        notes: [440, 660, 880],
        noteMilliseconds: 35,
      },
      {
        path: 'acertar.wav',
        notes: [988, 1319, 1568],
        noteMilliseconds: 55,
      },
      {
        path: 'pegar.wav',
        notes: [523, 784],
        noteMilliseconds: 50,
      },
      {
        path: 'fim.wav',
        notes: [523, 392, 330, 262],
        noteMilliseconds: 140,
      },
    ],
    receipt: 'monkey-visual-r2.json.snapshot',
  },
  {
    key: 'cannon-visual',
    stem: 'cannonVisual',
    name: 'Canhão',
    emoji: '🎯',
    description:
      'Ajuste ângulo e força, atire com gravidade e derrube os alvos antes que cheguem ao seu lado.',
    genre: 'Tiro ao alvo',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Física', 'Trigonometria', 'Eventos', 'Som'],
    difficulty: 'intermediate',
    experience: 'game',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'tiro.wav',
        notes: [160, 110, 70],
        noteMilliseconds: 60,
        noise: true,
      },
      {
        path: 'acerto.wav',
        notes: [880, 1175, 1568],
        noteMilliseconds: 50,
      },
      {
        path: 'fim.wav',
        notes: [330, 262, 196, 131],
        noteMilliseconds: 160,
      },
    ],
    receipt: 'cannon-visual-r2.json.snapshot',
  },
  {
    key: 'life-visual',
    stem: 'lifeVisual',
    name: 'Jogo da Vida',
    emoji: '🧫',
    description:
      'Desenhe células e veja a colônia nascer, crescer e morrer pelas regras de Conway. Programa inteiro editável.',
    genre: 'Simulação',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Conjuntos',
      'Dicionários',
      'Laços',
      'Regras',
      'Eventos',
    ],
    difficulty: 'intermediate',
    experience: 'exploration',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'sortear.wav',
        notes: [262, 330, 392, 523],
        noteMilliseconds: 90,
      },
      {
        path: 'marcar.wav',
        notes: [740, 988],
        noteMilliseconds: 35,
      },
      {
        path: 'passo.wav',
        notes: [523, 659],
        noteMilliseconds: 45,
      },
      {
        path: 'limpar.wav',
        notes: [523, 392, 262],
        noteMilliseconds: 70,
      },
    ],
    receipt: 'life-visual-r2.json.snapshot',
  },
  {
    key: 'starry-visual',
    stem: 'starryVisual',
    name: 'Céu Estrelado',
    emoji: '✨',
    description:
      'Encha o céu de estrelas de várias pontas e ligue as suas numa constelação. Programa inteiro editável.',
    genre: 'Desenho',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Geometria', 'Ângulos', 'Listas', 'Som'],
    difficulty: 'intermediate',
    experience: 'exploration',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'abertura.wav',
        notes: [392, 523, 659, 784, 1047],
        noteMilliseconds: 110,
      },
      {
        path: 'brilho.wav',
        notes: [1319, 1760],
        noteMilliseconds: 50,
      },
      {
        path: 'constelacao.wav',
        notes: [523, 659, 784, 1047],
        noteMilliseconds: 80,
      },
      {
        path: 'limpar.wav',
        notes: [784, 523, 330],
        noteMilliseconds: 70,
      },
    ],
    receipt: 'starry-visual-r2.json.snapshot',
  },
  {
    key: 'fortune-visual',
    stem: 'fortuneVisual',
    name: 'Vidente',
    emoji: '🔮',
    description:
      'Faça uma pergunta e gire a roda: o ponteiro desacelera e para numa resposta. Programa inteiro editável.',
    genre: 'Brinquedo',
    concepts: ['Blocos', 'Ponte', 'Código', 'Ângulos', 'Atrito', 'Listas', 'Sorteio', 'Som'],
    difficulty: 'beginner',
    experience: 'exploration',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'abertura.wav',
        notes: [330, 392, 494, 659],
        noteMilliseconds: 110,
      },
      {
        path: 'tique.wav',
        notes: [1500],
        noteMilliseconds: 20,
      },
      {
        path: 'parar.wav',
        notes: [659, 523, 784],
        noteMilliseconds: 120,
      },
    ],
    receipt: 'fortune-visual-r2.json.snapshot',
  },
  {
    key: 'turtle-bet-visual',
    stem: 'turtleBetVisual',
    name: 'Corrida com Aposta',
    emoji: '🐢',
    description:
      'Aposte numa de quatro tartarugas e veja quem cruza a chegada primeiro. Programa inteiro editável.',
    genre: 'Corrida',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Sorteio', 'Listas', 'Eventos', 'Som'],
    difficulty: 'beginner',
    experience: 'exploration',
    requiredPythonFeatures: [],
    sounds: [
      {
        path: 'largada.wav',
        notes: [440, 440, 880],
        noteMilliseconds: 150,
      },
      {
        path: 'chegada.wav',
        notes: [523, 659, 784, 1047],
        noteMilliseconds: 110,
      },
      {
        path: 'acerto.wav',
        notes: [784, 988, 1175, 1568],
        noteMilliseconds: 90,
      },
    ],
    receipt: 'turtle-bet-visual-r2.json.snapshot',
  },
] as const satisfies readonly VisualReferenceGame[]

export type VisualReferenceGameKey = (typeof VISUAL_REFERENCE_GAMES)[number]['key']

/** Text files shipped with every game, identical in the Blocks and Code presentations. */
export const VISUAL_REFERENCE_GAME_FILES = [
  'main.py',
  'README.md',
  'NOTICE.md',
  'LICENSE',
  'requirements.txt',
] as const

export const visualReferenceGameConstant = (game: Pick<VisualReferenceGame, 'stem'>) =>
  game.stem.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()
