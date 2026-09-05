import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const sources = [...new Bun.Glob('**/*.tsx').scanSync({ cwd: import.meta.dir })].map((file) => ({
  file,
  text: readFileSync(join(import.meta.dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
}))

describe('contrato de acessibilidade dos controles do Molda', () => {
  test('não reintroduz alvos interativos de 36 px', () => {
    for (const source of sources) {
      expect(source.text.match(/\b(?:min-h|min-w|h|w|size)-9\b/g), source.file).toBeNull()
    }
  })

  test('campos têm name para integração com formulários e tecnologias assistivas', () => {
    for (const source of sources) {
      for (const field of source.text.match(/<(?:input|select|textarea)\b[\s\S]*?>/g) ?? []) {
        expect(field, `${source.file}: ${field}`).toContain('name=')
      }
    }
  })

  test('spinners param quando movimento reduzido está ativo', () => {
    for (const source of sources) {
      for (const tag of source.text.match(/<[^>]*animate-spin[^>]*>/g) ?? []) {
        expect(tag, `${source.file}: ${tag}`).toContain('motion-reduce:animate-none')
      }
    }
  })
})
