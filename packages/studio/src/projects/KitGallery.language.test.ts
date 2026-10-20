import { expect, test } from 'bun:test'
import type { PythonExampleEntry } from '../examples/pythonCatalog'
import { filterKitGroups, type KitGroup } from './KitGallery'

const groups: KitGroup[] = [
  {
    extensionId: 'core',
    label: 'JavaScript',
    entries: [
      {
        key: 'core:fixture',
        name: 'Jogo',
        description: 'Teste',
        experience: 'game',
        emoji: '🎮',
      },
    ],
  },
]

test('the existing JavaScript catalog remains the default', () => {
  expect(filterKitGroups(groups, { query: '', difficulty: 'all', experience: 'all' })).toEqual(
    groups,
  )
})

test('selecting Python never presents an existing JavaScript entry as Python', () => {
  expect(
    filterKitGroups(groups, {
      query: '',
      difficulty: 'all',
      experience: 'all',
      programmingLanguage: 'python',
    }),
  ).toEqual([])
})

test('language composes with accent-free search, experience and difficulty', () => {
  const entry: PythonExampleEntry = {
    programmingLanguage: 'python',
    key: 'python:fixture',
    name: 'Animação',
    description: 'Fixture',
    emoji: '🐢',
    experience: 'game',
    kind: 'pro',
    difficulty: 'beginner',
    extensions: [],
    load: async () => ({ entrypoint: 'main.py', files: { 'main.py': 'print(1)' } }),
  }
  const python = [{ extensionId: 'python', label: 'Python', entries: [entry] }]
  expect(
    filterKitGroups(python, {
      programmingLanguage: 'python',
      query: 'animacao',
      difficulty: 'beginner',
      experience: 'game',
    })[0]?.entries,
  ).toEqual([entry])
  expect(
    filterKitGroups(python, {
      programmingLanguage: 'python',
      query: '',
      difficulty: 'advanced',
      experience: 'game',
    }),
  ).toEqual([])
  expect(filterKitGroups(python, { query: '', difficulty: 'all', experience: 'all' })).toEqual([])
})
