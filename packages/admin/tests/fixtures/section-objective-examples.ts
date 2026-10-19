export const objectiveSectionId = '33333333-3333-4333-8333-333333333333'
export const otherObjectiveSectionId = '44444444-4444-4444-8444-444444444444'
const entryId = '11111111-1111-4111-8111-111111111111'
const solutionId = '22222222-2222-4222-8222-222222222222'

export const objectiveProject = (overrides: Record<string, unknown> = {}) => ({
  formatVersion: 2,
  id: 'stable-project',
  name: 'Meu projeto',
  kind: 'classic',
  mode: 'blocks',
  createdAt: 0,
  updatedAt: 0,
  files: { 'index.html': '', 'style.css': '', 'script.js': '' },
  installedExtensions: [],
  ir: { js: [] },
  blocksState: null,
  ...overrides,
})

export function objectiveWorkspace(initial: unknown, solution?: unknown, entry?: unknown) {
  return {
    kind: 'studio',
    initialProject: initial,
    projectExamples: {
      version: 1,
      examples: {
        ...(solution === undefined ? {} : { [solutionId]: solution }),
        ...(entry === undefined ? {} : { [entryId]: entry }),
      },
      sections: {
        ...(solution === undefined && entry === undefined
          ? {}
          : {
              [objectiveSectionId]: {
                ...(solution === undefined ? {} : { solutionExampleId: solutionId }),
                ...(entry === undefined ? {} : { entryExampleId: entryId }),
              },
            }),
      },
    },
  }
}
