import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isLearningManifest } from '../../../packages/core/src/learning'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { SZIRInputSchema } from '../../../packages/studio/src/ir/schema'
import {
  isGameExtensionId,
  isManualGameVisualBlock,
} from '../../../packages/studio/src/official-extensions/gameVisualPolicy'
import { caminhoAula, listarArquivosAulas } from './caminhos'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

interface LessonProject {
  path: string
  kind: 'initialProject' | 'solutionProject'
  value: Record<string, unknown>
}

/** Includes solutions wherever the authoring format places them, not just the activity root. */
function projects(value: unknown, path = ''): LessonProject[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => projects(item, `${path}[${i}]`))
  if (!record(value)) return []
  const found: LessonProject[] = []
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key
    if ((key === 'initialProject' || key === 'solutionProject') && record(child)) {
      found.push({ path: childPath, kind: key, value: child })
    }
    found.push(...projects(child, childPath))
  }
  return found
}

function usesGameExtension(project: Record<string, unknown>): boolean {
  if (!Array.isArray(project.installedExtensions)) return false
  return project.installedExtensions.some((extension: unknown) => {
    if (!record(extension)) return false
    const id = record(extension.manifest) ? extension.manifest.id : extension.id
    return typeof id === 'string' && isGameExtensionId(id)
  })
}

function manualBlocks(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.flatMap(manualBlocks))].sort()
  if (!record(value)) return []
  const own =
    typeof value.type === 'string' && isManualGameVisualBlock(value.type) ? [value.type] : []
  return [...new Set([...own, ...Object.values(value).flatMap(manualBlocks)])].sort()
}

const manifests = listarArquivosAulas()
  .filter((name) => name.endsWith('.manifesto.json'))
  .map((name) => ({ name, value: JSON.parse(readFileSync(caminhoAula(name), 'utf8')) as unknown }))

describe('jogos dos cursos JavaScript usam os recursos visuais das extensões', () => {
  test('o inventário alcança os cinco cursos e os projetos atuais', () => {
    expect(manifests.length).toBeGreaterThanOrEqual(30)
    for (const course of [
      'cade-todo-mundo',
      'desafio',
      'nave-contra-asteroides',
      'corre-dino',
      'meu-jeito',
    ]) {
      expect(
        manifests.some(({ name }) => name.startsWith(`${course}-`)),
        course,
      ).toBe(true)
    }
    expect(
      manifests
        .flatMap(({ value }) => projects(value))
        .filter(({ value }) => usesGameExtension(value)).length,
    ).toBeGreaterThanOrEqual(30)
  })

  for (const { name, value } of manifests) {
    test(name, () => {
      expect(isLearningManifest(value), name).toBe(true)
      for (const project of projects(value).filter(({ value }) => usesGameExtension(value))) {
        const label = `${name}/${project.path}`
        expect(manualBlocks(project.value.blocksState), `${label}/blocos salvos`).toEqual([])
        if (project.value.ir != null) {
          const result = SZIRInputSchema.safeParse(project.value.ir)
          expect(result.success, `${label}/IR válida`).toBe(true)
          if (!result.success) throw result.error
          expect(result.data.html, `${label}/HTML`).toEqual([])
          expect(result.data.css, `${label}/CSS`).toEqual([])
          expect(result.data.htmlShell, `${label}/página manual`).toBeUndefined()
          expect(
            manualBlocks(buildWorkspaceStateFromIR(result.data)),
            `${label}/blocos reconstruídos`,
          ).toEqual([])
        } else {
          expect(record(project.value.blocksState), `${label}/representação editável`).toBe(true)
        }
      }
    })
  }

  test('a guarda encontra blocos proibidos aninhados e alcança os gabaritos', () => {
    const fixture = {
      blocks: [
        {
          content: {
            solutionProject: {
              installedExtensions: [{ id: 'game-2d' }],
              blocksState: {
                blocks: {
                  blocks: [
                    {
                      type: 'sz_g2d_on_key',
                      inputs: {
                        BODY: {
                          block: {
                            type: 'sz_if',
                            inputs: { THEN: { block: { type: 'sz_canvas_fill_text' } } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    }
    const solutions = projects(fixture)
    expect(solutions).toHaveLength(1)
    expect(solutions[0]?.kind).toBe('solutionProject')
    expect(solutions[0] && usesGameExtension(solutions[0].value)).toBe(true)
    expect(manualBlocks(solutions[0]?.value.blocksState)).toEqual(['sz_canvas_fill_text'])
    expect(manualBlocks({ type: 'sz_g2d_draw_sprite' })).toEqual([])
  })
})
