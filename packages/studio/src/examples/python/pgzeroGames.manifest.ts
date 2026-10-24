import type { ExampleExperience } from '../../core/example'
import type { ExtensionExampleDifficulty } from '../../extensions/types'
import type { VisualReferenceSound } from './visualReferenceGames.manifest'

/** Background music: synthesized from a score, stored as OGG in music/ (Pygame Zero reads mp3/ogg). */
export interface PgzeroMusic {
  path: string
  notes: readonly number[]
  noteMilliseconds: number
}

export interface PgzeroGame {
  /** Folder in src/examples/python/pgzero and the `python:<key>:blocks|code` gallery identity. */
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
  /** Which book chapter inspired the mechanics (documented in the game's NOTICE.md). */
  inspiration: string
  howToPlay: string
  /** Small changes a child can try, in the README. */
  ideas: readonly string[]
  /** Sound effects, written to sounds/<path>. */
  sounds: readonly VisualReferenceSound[]
  music: readonly PgzeroMusic[]
  /** Qualification receipt in docs/continuity/2026-10-24-python-pgzero-games-evidence. */
  receipt: string
}

/**
 * The Pygame Zero examples of the gallery (lote 1: the nine games of DK's Coding Games in Python
 * and its warm-up). Each one is an original implementation of the mechanics with original art
 * (scripts/python/pgzero-art.ts) and sounds; nothing from the book is copied.
 */
export const PGZERO_GAMES = [
  {
    key: 'ola-pgzero',
    stem: 'olaPgzero',
    name: 'Olá, Pygame Zero',
    emoji: '👋',
    description: 'O primeiro programa: escreva na tela e pilote uma nave com as setas.',
    genre: 'Primeiros passos',
    concepts: ['Blocos', 'Ponte', 'Código', 'Ator', 'Teclado', 'Texto'],
    difficulty: 'beginner',
    experience: 'game',
    inspiration: 'hello.py',
    howToPlay: 'Use as setas do teclado para pilotar a nave pela tela.',
    ideas: [
      'Troque o texto de boas-vindas.',
      'Mude a cor do fundo em `screen.fill`.',
      'Deixe a nave mais rápida trocando o 4 por outro número.',
    ],
    sounds: [],
    music: [],
    receipt: 'ola-pgzero-r1.json.snapshot',
  },
  {
    key: 'acerte-a-maca',
    stem: 'acerteAMaca',
    name: 'Acerte a Maçã',
    emoji: '🍎',
    description: 'Clique na maçã antes que ela mude de lugar. Errou o clique? Fim de jogo.',
    genre: 'Mira',
    concepts: ['Blocos', 'Ponte', 'Código', 'Mouse', 'Sorteio', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    inspiration: 'Shoot the Fruit',
    howToPlay:
      'Clique na maçã para ganhar um ponto. Se clicar fora dela, o jogo termina; clique de novo para recomeçar.',
    ideas: [
      'Diminua a área onde a maçã aparece.',
      'Mostre uma mensagem diferente quando bater o recorde.',
      'Troque a maçã por outro desenho do Pinta.',
    ],
    sounds: [
      { path: 'acerto.wav', notes: [880, 1175], noteMilliseconds: 60 },
      { path: 'erro.wav', notes: [330, 220], noteMilliseconds: 120 },
    ],
    music: [],
    receipt: 'acerte-a-maca-r1.json.snapshot',
  },
  {
    key: 'raposa-moedas',
    stem: 'raposaMoedas',
    name: 'Raposa Caça-Moedas',
    emoji: '🦊',
    description: 'Leve a raposa até as moedas e pegue o máximo que puder em 30 segundos.',
    genre: 'Coleta',
    concepts: ['Blocos', 'Ponte', 'Código', 'Colisão', 'Relógio', 'Som'],
    difficulty: 'beginner',
    experience: 'game',
    inspiration: 'Coin Collector',
    howToPlay: 'Use as setas para levar a raposa até a moeda. Você tem 30 segundos.',
    ideas: [
      'Mude o tempo do jogo.',
      'Faça a raposa andar mais rápido.',
      'Coloque duas moedas na tela.',
    ],
    sounds: [
      { path: 'moeda.wav', notes: [988, 1319], noteMilliseconds: 50 },
      { path: 'fim.wav', notes: [523, 392, 262], noteMilliseconds: 150 },
    ],
    music: [],
    receipt: 'raposa-moedas-r1.json.snapshot',
  },
  {
    key: 'ligue-os-pontos',
    stem: 'ligueOsPontos',
    name: 'Ligue os Pontos',
    emoji: '✏️',
    description: 'Clique nos pontos na ordem dos números e desenhe uma figura misteriosa.',
    genre: 'Quebra-cabeça',
    concepts: ['Blocos', 'Ponte', 'Código', 'Listas', 'Repetição', 'Linhas'],
    difficulty: 'beginner',
    experience: 'game',
    inspiration: 'Follow the Numbers',
    howToPlay:
      'Clique no ponto 1, depois no 2, e assim por diante. Errou a ordem? As linhas somem e você recomeça. Ao terminar, aperte espaço.',
    ideas: [
      'Mude a quantidade de pontos.',
      'Troque a cor das linhas.',
      'Conte quantos erros a pessoa cometeu.',
    ],
    sounds: [
      { path: 'ponto.wav', notes: [784], noteMilliseconds: 60 },
      { path: 'erro.wav', notes: [262, 196], noteMilliseconds: 100 },
      { path: 'fim.wav', notes: [523, 659, 784, 1047], noteMilliseconds: 110 },
    ],
    music: [],
    receipt: 'ligue-os-pontos-r1.json.snapshot',
  },
  {
    key: 'estrela-vermelha',
    stem: 'estrelaVermelha',
    name: 'Estrela Vermelha',
    emoji: '⭐',
    description: 'Ache a estrela vermelha entre as outras antes que elas caiam. Pixel art.',
    genre: 'Reflexo',
    concepts: ['Blocos', 'Ponte', 'Código', 'Animação', 'Listas', 'Pixel art'],
    difficulty: 'intermediate',
    experience: 'game',
    inspiration: 'Red Alert',
    howToPlay:
      'Clique na estrela vermelha antes que as estrelas cheguem ao chão. A cada fase aparecem mais estrelas e elas caem mais rápido.',
    ideas: [
      'Mude a quantidade de fases.',
      'Troque a cor da estrela certa.',
      'Desenhe uma estrela nova no Pinta, em pixel art.',
    ],
    sounds: [
      { path: 'acerto.wav', notes: [660, 880, 1320], noteMilliseconds: 50 },
      { path: 'erro.wav', notes: [300, 200], noteMilliseconds: 120 },
    ],
    music: [],
    receipt: 'estrela-vermelha-r1.json.snapshot',
  },
  {
    key: 'quiz-relampago',
    stem: 'quizRelampago',
    name: 'Quiz Relâmpago',
    emoji: '❓',
    description: 'Responda antes de o tempo acabar. Dá para trocar as perguntas.',
    genre: 'Quiz',
    concepts: ['Blocos', 'Ponte', 'Código', 'Listas', 'Retângulos', 'Relógio'],
    difficulty: 'intermediate',
    experience: 'game',
    inspiration: 'Big Quiz',
    howToPlay: 'Leia a pergunta e clique na resposta certa antes que o contador chegue a zero.',
    ideas: [
      'Escreva suas próprias perguntas na lista.',
      'Dê mais tempo para cada pergunta.',
      'Mostre a resposta certa quando a pessoa errar.',
    ],
    sounds: [
      { path: 'acerto.wav', notes: [660, 880], noteMilliseconds: 70 },
      { path: 'erro.wav', notes: [220, 165], noteMilliseconds: 140 },
    ],
    music: [],
    receipt: 'quiz-relampago-r1.json.snapshot',
  },
  {
    key: 'voo-de-balao',
    stem: 'vooDeBalao',
    name: 'Voo de Balão',
    emoji: '🎈',
    description:
      'Clique para subir o balão e desvie de pássaros, casas e árvores. Guarda o recorde.',
    genre: 'Desvio',
    concepts: ['Blocos', 'Ponte', 'Código', 'Funções', 'Arquivos', 'Animação'],
    difficulty: 'intermediate',
    experience: 'game',
    inspiration: 'Balloon Flight',
    howToPlay:
      'Clique e segure para o balão subir; solte para ele descer. Desvie dos pássaros, das casas e das árvores. O recorde fica no arquivo recorde.txt.',
    ideas: [
      'Mude a velocidade dos obstáculos.',
      'Faça o balão subir mais devagar.',
      'Guarde também o nome de quem fez o recorde.',
    ],
    sounds: [{ path: 'fim.wav', notes: [440, 330, 220], noteMilliseconds: 140 }],
    music: [],
    receipt: 'voo-de-balao-r1.json.snapshot',
  },
  {
    key: 'desafio-da-danca',
    stem: 'desafioDaDanca',
    name: 'Desafio da Dança',
    emoji: '🕺',
    description:
      'Observe os passos do robô e repita com as setas. A sequência cresce a cada rodada.',
    genre: 'Memória',
    concepts: ['Blocos', 'Ponte', 'Código', 'Música', 'Relógio', 'Listas'],
    difficulty: 'advanced',
    experience: 'game',
    inspiration: 'Dance Challenge',
    howToPlay:
      'Observe os passos do robô. Quando aparecer "Sua vez", repita a sequência com as setas. Cada rodada acrescenta um passo.',
    ideas: [
      'Mude o tempo entre os passos.',
      'Troque a música por outra feita por você.',
      'Mostre quantas rodadas a pessoa venceu.',
    ],
    sounds: [],
    music: [
      {
        path: 'ritmo.ogg',
        notes: [
          262, 330, 392, 330, 294, 349, 440, 349, 330, 392, 494, 392, 294, 349, 440, 392, 262, 330,
          392, 523, 494, 392, 330, 294, 262, 294, 330, 392, 349, 330, 294, 262,
        ],
        noteMilliseconds: 250,
      },
    ],
    receipt: 'desafio-da-danca-r1.json.snapshot',
  },
  {
    key: 'jardim-feliz',
    stem: 'jardimFeliz',
    name: 'Jardim Feliz',
    emoji: '🌻',
    description: 'Ajude a vaca a regar as flores antes que murchem e fuja das flores-monstro.',
    genre: 'Cuidado',
    concepts: ['Blocos', 'Ponte', 'Código', 'Listas', 'Tempo', 'Colisão'],
    difficulty: 'advanced',
    experience: 'game',
    inspiration: 'Happy Garden',
    howToPlay:
      'Use as setas para andar com a vaca e aperte espaço perto de uma flor para regá-la. Flores que ficam murchas por muito tempo encerram o jogo, e as flores-monstro também.',
    ideas: [
      'Faça as flores murcharem mais devagar.',
      'Mude quando as flores-monstro aparecem.',
      'Dê um ponto para cada flor regada.',
    ],
    sounds: [
      { path: 'agua.wav', notes: [1200, 900, 1500], noteMilliseconds: 40, noise: true },
      { path: 'fim.wav', notes: [392, 330, 262], noteMilliseconds: 150 },
    ],
    music: [],
    receipt: 'jardim-feliz-r2.json.snapshot',
  },
  {
    key: 'dragoes-dorminhocos',
    stem: 'dragoesDorminhocos',
    name: 'Dragões Dorminhocos',
    emoji: '🐉',
    description: 'Pegue os ovos enquanto os dragões dormem. Se acordarem, cuidado! Pixel art.',
    genre: 'Estratégia',
    concepts: ['Blocos', 'Ponte', 'Código', 'Listas', 'Estados', 'Pixel art'],
    difficulty: 'advanced',
    experience: 'game',
    inspiration: 'Sleeping Dragons',
    howToPlay:
      'Use as setas para chegar aos ovos quando o dragão estiver dormindo. Se ele acordar com você no ninho, você perde uma vida.',
    ideas: [
      'Mude quanto tempo cada dragão dorme.',
      'Dê mais vidas ao herói.',
      'Faça um ninho valer mais ovos.',
    ],
    sounds: [
      { path: 'ovo.wav', notes: [784, 988], noteMilliseconds: 60 },
      { path: 'dano.wav', notes: [200, 150], noteMilliseconds: 120, noise: true },
    ],
    music: [],
    receipt: 'dragoes-dorminhocos-r1.json.snapshot',
  },
] as const satisfies readonly PgzeroGame[]

export type PgzeroGameKey = (typeof PGZERO_GAMES)[number]['key']

/** Text files of every example, besides its media. */
export const PGZERO_GAME_FILES = ['main.py', 'README.md', 'NOTICE.md', 'LICENSE'] as const
