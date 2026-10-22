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
    receipt: 'pacman-visual-r4.json.snapshot',
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
    receipt: 'space-arena-visual-r4.json.snapshot',
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
    receipt: 'snake-visual-r1.json.snapshot',
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
