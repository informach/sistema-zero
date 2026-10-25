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
] as const satisfies readonly RaylibGame[]

export type RaylibGameKey = (typeof RAYLIB_GAMES)[number]['key']

/** Text files of every example, besides its media. */
export const RAYLIB_GAME_FILES = ['main.py', 'README.md', 'NOTICE.md', 'LICENSE'] as const
