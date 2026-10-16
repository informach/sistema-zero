import { describe, expect, it } from 'bun:test'
import { loadProTemplate } from '../components/code/pro-templates'
import { initialWorkspace } from '../modes/pro/workspace/model'
import { convertClassicToProTree } from '../state/convertToPro'
import { createEmptyProject } from './project'
import { compatibleProGuides, proFileDescriptions } from './proLearningGuides'

describe('orientation uses the real template and never invents game roles', () => {
  for (const id of ['canvas-survival', 'three-exploration', 'react-ts']) {
    it(`opens the ${id} tree and only labels existing recipe references`, async () => {
      const template = await loadProTemplate(id),
        tree = template.tree
      const before = JSON.stringify(tree),
        workspace = initialWorkspace(tree)
      expect(tree[workspace.activeFile]?.kind).toBe('file')
      const descriptions = proFileDescriptions(id, tree)
      if (id === 'react-ts') expect(descriptions).toEqual({})
      else expect(Object.keys(descriptions).length).toBeGreaterThan(0)
      for (const path of Object.keys(descriptions)) expect(tree[path]?.kind).toBe('file')
      expect(
        proFileDescriptions(
          id,
          Object.fromEntries(
            Object.entries(tree).filter(([path]) => !Object.hasOwn(descriptions, path)),
          ),
        ),
      ).toEqual({})
      expect(JSON.stringify(tree)).toBe(before)
    })
  }
  it('opens a converted project without assigning recipes for a different kit', async () => {
    const project = createEmptyProject('converted-guide', 'Meu jogo')
    project.files['script.js'] = 'console.log("jogar")'
    const tree = await convertClassicToProTree(project)
    expect(tree[initialWorkspace(tree).activeFile]?.kind).toBe('file')
    expect(tree['public/script.js']?.kind).toBe('file')
    expect(compatibleProGuides('vanilla-vite', tree)).toEqual([])
  })
  it('keeps a custom project navigable without forcing a prescribed folder structure', () => {
    const tree = { 'meu-jogo.js': { kind: 'file' as const, content: 'console.log("jogar")' } }
    expect(initialWorkspace(tree).activeFile).toBe('meu-jogo.js')
    expect(proFileDescriptions(undefined, tree)).toEqual({})
  })
})
