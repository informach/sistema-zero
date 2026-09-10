import { join } from 'node:path'
import { isLearningManifest } from '../../packages/core/src/learning'

const roots = [
  'C:/Users/tocha/projects/sistema-zero/docs/aulas-interativas',
  'C:/Users/tocha/projects/sistema-zero-aulas/docs/aulas-interativas',
]
for (const root of roots) {
  let manifests = 0,
    sections = 0,
    withCompletion = 0
  const versions: Record<string, number> = {},
    rules: Record<string, number> = {}
  const invalid: string[] = []
  for (const path of new Bun.Glob('**/manifesto.json').scanSync(root)) {
    const manifest: unknown = await Bun.file(join(root, path)).json()
    manifests++
    if (!isLearningManifest(manifest)) {
      invalid.push(path)
      continue
    }
    versions[manifest.version] = (versions[manifest.version] ?? 0) + 1
    sections += manifest.sections.length
    for (const section of manifest.sections) {
      if (section.completion) {
        withCompletion++
        for (const id of section.completion.blockIds) {
          if (!section.blockKeys.includes(id)) invalid.push(`${path}:${section.key}:${id}`)
        }
        for (const check of section.completion.projectChecks ?? [])
          rules[check.rule.type] = (rules[check.rule.type] ?? 0) + 1
      }
    }
  }
  console.log(
    JSON.stringify({ root, manifests, versions, sections, withCompletion, rules, invalid }),
  )
}
