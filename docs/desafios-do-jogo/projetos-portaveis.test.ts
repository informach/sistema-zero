import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ManifestoDeDesafiosSchema } from '../../packages/arquipelago-contracts/src/desafios'
import {
  createCheckScope,
  prepareClassicCheckDocument,
} from '../../packages/studio/src/check/serverCheck'

function documento(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

test('os projetos clássicos dos desafios abrem integralmente no verificador real', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const problems: { slug: string; variant: string; message: string }[] = []
  let checked = 0
  const paths = Array.from(
    new Bun.Glob('docs/desafios-do-jogo/**/*.manifesto.json').scanSync(root),
  ).sort()
  for (const path of paths) {
    const manifest = ManifestoDeDesafiosSchema.parse(await Bun.file(join(root, path)).json())
    for (const item of manifest.desafios) {
      for (const variant of ['projetoInicial', 'gabarito'] as const) {
        const project = item.conteudo[variant]
        if (!documento(project)) throw new Error(`${item.slug}: documento inválido`)
        if (project.programmingLanguage === 'python' || project.kind === 'pro') continue
        checked++
        try {
          await prepareClassicCheckDocument(project, createCheckScope())
        } catch (error) {
          problems.push({
            slug: item.slug,
            variant,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }
  expect(checked).toBeGreaterThan(0)
  expect(problems).toEqual([])
}, 60_000)
