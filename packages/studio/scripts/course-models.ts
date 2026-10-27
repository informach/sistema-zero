/**
 * Grava modelos na biblioteca dos cursos (`src/core/course-models/`, ver `core/courseModels.ts`).
 *
 * `publishCourseModel(bytes)` escreve `m-<sha256>.generated.ts` (o GLB em data URL) quando ainda
 * não existe e devolve o sha; `writeCourseModelRegistry()` refaz o registro com um `import()`
 * LITERAL por arquivo (cada modelo vira um pedaço próprio do pacote, baixado só por quem usa).
 * Os geradores de curso chamam os dois; o teste `courseModels.test.ts` confere que cada arquivo
 * tem o sha do nome.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const COURSE_MODELS_DIR = resolve(import.meta.dirname, '../src/core/course-models')
const FILE = /^m-([a-f0-9]{64})\.generated\.ts$/

export function publishCourseModel(bytes: Uint8Array): string {
  const sha = createHash('sha256').update(bytes).digest('hex')
  const path = resolve(COURSE_MODELS_DIR, `m-${sha}.generated.ts`)
  if (!existsSync(path)) {
    const dataUrl = `data:model/gltf-binary;base64,${Buffer.from(bytes).toString('base64')}`
    writeFileSync(path, `// Gerado por scripts/course-models.ts. Não edite.\nexport default '${dataUrl}'\n`)
  }
  return sha
}

export function writeCourseModelRegistry(): string[] {
  const shas = readdirSync(COURSE_MODELS_DIR)
    .map((f) => FILE.exec(f)?.[1])
    .filter((s): s is string => Boolean(s))
    .sort()
  const linhas = shas.map((s) => `  '${s}': () => import('./m-${s}.generated'),`)
  writeFileSync(
    resolve(COURSE_MODELS_DIR, 'registry.generated.ts'),
    [
      '// Gerado por scripts/course-models.ts. Não edite.',
      '// Um import() literal por modelo: cada um vira um pedaço próprio, baixado só por quem usa.',
      'export const COURSE_MODEL_LOADERS: Readonly<Record<string, () => Promise<{ default: string }>>> = {',
      ...linhas,
      '}',
      '',
    ].join('\n'),
  )
  return shas
}
