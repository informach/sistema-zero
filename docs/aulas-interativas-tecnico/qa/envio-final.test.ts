import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { LearningManifest } from '../../../packages/core/src/learning'
import {
  isFinalProjectSection,
  submissionUpToDateWorkspace,
} from '../../../packages/core/src/learning/section-progression'
import { caminhoAula, listarArquivosAulas } from './caminhos'

const files = listarArquivosAulas()
  .filter((file) => file.endsWith('.manifesto.json'))
  .sort()

test('os oito cursos têm um ponto de envio por projeto, com as partes intermediárias independentes dele', () => {
  expect(files).toHaveLength(44)
  let projects = 0
  for (const file of files) {
    const manifest = JSON.parse(readFileSync(caminhoAula(file), 'utf8')) as LearningManifest
    if (/^(desafio-dia-|nave-contra-asteroides-|corre-dino-)/.test(file)) {
      // Conferir também a direção de cena: o gesto gravado deve acompanhar a fala revisada.
      const script = readFileSync(
        caminhoAula(file.replace('.manifesto.json', '.roteiro.md')),
        'utf8',
      )
      expect(script, file).not.toMatch(/(?:aguardar|esperar|espere)(?: aparecer)? \*{0,2}Salvo/)
    }
    const sections = manifest.sections.map((section) => ({
      ...section,
      id: section.key,
      blockIds: section.blockKeys,
      workspaceBlockId: section.workspaceKey,
    }))
    for (const block of manifest.blocks) {
      const content = block.content
      if (!content || !['studio', 'pinta'].includes(content.kind)) continue
      if ('purpose' in content && content.purpose === 'experiment') continue
      projects++
      const context = `${file}/${block.key}`
      const deliveries = sections.filter((s) => s.completion?.blockIds.includes(block.key))
      expect(deliveries, context).toHaveLength(1)
      const delivery = deliveries[0]!
      expect(delivery.blockIds, context).toContain(block.key)
      expect(isFinalProjectSection(sections, delivery.id), context).toBe(true)
      expect(
        sections.filter((s) => s.blockIds.includes(block.key)),
        context,
      ).toHaveLength(1)
      const before = sections.slice(0, sections.indexOf(delivery))
      for (const section of before.filter((s) => s.workspaceBlockId === block.key)) {
        expect(section.intent, `${context}/${section.id}`).not.toBe('delivery')
        expect(section.completion?.submissionUpToDate, `${context}/${section.id}`).not.toBe(true)
        const dialogue = manifest.blocks.filter((b) => section.blockIds.includes(b.key))
        for (const b of dialogue) {
          if (b.content?.kind === 'dialogue')
            expect(b.content.text, `${context}/${section.id}`).not.toMatch(
              /clique em Enviar (?:meu projeto|meu desenho|de novo)|envie o seu projeto/i,
            )
        }
      }
    }
  }
  expect(projects).toBe(42)
})

test.each([
  ['cade-todo-mundo-aula-2', 'personalizar'],
  ['desafio-dia-3', 'posicionar-chave'],
])('%s exige a versão atual no único envio, depois das escolhas', (file, key) => {
  const m = JSON.parse(
    readFileSync(caminhoAula(`${file}.manifesto.json`), 'utf8'),
  ) as LearningManifest
  const sections = m.sections.map((s) => ({
    ...s,
    id: s.key,
    blockIds: s.blockKeys,
    workspaceBlockId: s.workspaceKey,
  }))
  const blocks = m.blocks.map((b) => ({
    id: b.key,
    content: b.content ?? { kind: 'video' as const },
  }))
  expect(sections.filter((s) => s.completion?.submissionUpToDate).map((s) => s.id)).toEqual([key])
  expect(submissionUpToDateWorkspace(sections, blocks, key)).toEqual({
    blockId: 'projeto',
    kind: 'studio',
  })
})
