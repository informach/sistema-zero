import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Raiz do pacote (…/packages/studio-aulas), independente do cwd de quem chama.
const here = dirname(fileURLToPath(import.meta.url))
export const PACKAGE_ROOT = resolve(here, '..', '..')
/** Raiz do monorepo (…/sistema-zero) — para subir o playground do Estúdio. */
export const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..')
/** Caminho absoluto do módulo de automação injetado no playground (via /@fs/). */
export const AUTOMATION_FILE = join(PACKAGE_ROOT, 'harness', 'automation.ts')

export const AULAS_DIR = join(PACKAGE_ROOT, 'aulas')
export const CENARIOS_DIR = join(PACKAGE_ROOT, 'cenarios')

/** Diretórios de uma aula (conteúdo de entrada + saídas geradas). */
export interface AulaPaths {
  slug: string
  dir: string
  roteiro: string
  outDir: string
  audioDir: string
  avatarDir: string
  telaDir: string
  /** Metadados de tempo/coordenadas capturados na gravação da tela. */
  telaTimeline: string
  videoFinal: string
}

export function aulaPaths(slug: string): AulaPaths {
  const dir = join(AULAS_DIR, slug)
  const outDir = join(dir, 'out')
  return {
    slug,
    dir,
    roteiro: join(dir, 'roteiro.yaml'),
    outDir,
    audioDir: join(outDir, 'audio'),
    avatarDir: join(outDir, 'avatar'),
    telaDir: join(outDir, 'tela'),
    telaTimeline: join(outDir, 'tela', 'timeline.json'),
    videoFinal: join(outDir, 'aula.mp4'),
  }
}

export function assertAulaExiste(paths: AulaPaths): void {
  if (!existsSync(paths.roteiro)) {
    throw new Error(
      `Não achei o roteiro da aula "${paths.slug}".\n` +
        `Esperado em: ${paths.roteiro}\n` +
        `Crie a pasta aulas/${paths.slug}/ com um roteiro.yaml (use a skill aula-roteiro).`,
    )
  }
}
