import { describe, expect, mock, test } from 'bun:test'
import type { EditableStudioProject, Project } from '@sistemazero/studio'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'
import {
  completeLibraryAssets,
  resolveStudioLessonSeed,
  StudioLessonMaterialError,
  StudioLessonSeedCompatibilityError,
} from '../src/lib/studio-lesson-seed'

const local = { id: 'lesson-child', name: 'Meu trabalho local' } as Project
const submitted = { id: 'submitted', name: 'Minha entrega' } as Project
const carryover = { id: 'previous', name: 'Aula anterior' } as Project
const initial = { id: 'initial', name: 'Projeto inicial' } as Project

for (const source of ['local', 'submitted', 'carryover'] as const) {
  test(`${source}: incompatible saved work never falls through to a fresh project`, async () => {
    const saved = { ...documentFixture('python', 'classic'), assets: [] } as EditableStudioProject
    const before = structuredClone(saved)
    const next = mock(async () => initial)
    const sources: Parameters<typeof resolveStudioLessonSeed>[0] = {
      local: async () => null,
      submitted: next,
      carryover: next,
      initial,
    }
    if (source === 'carryover') sources.submitted = async () => null
    sources[source] = async () => saved
    const failure = await resolveStudioLessonSeed(sources).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(StudioLessonSeedCompatibilityError)
    expect((failure as StudioLessonSeedCompatibilityError).savedProject).toBe(saved)
    expect(saved).toEqual(before)
    expect(next).not.toHaveBeenCalled()
  })
}

test('a legacy JS draft adopts current compatible authoring without replacing its work', async () => {
  const saved = {
    ...local,
    formatVersion: 2,
    files: { 'index.html': '<p>Meu jogo</p>', 'style.css': '', 'script.js': 'let pontos = 10' },
  }
  const opened = await resolveStudioLessonSeed({
    local: async () => saved,
    initial: {
      ...initial,
      formatVersion: 2,
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    },
  })
  expect(opened).toBe(saved)
  expect(opened).toMatchObject({ files: { 'script.js': 'let pontos = 10' } })
})

for (const kind of ['classic', 'pro'] as const) {
  test(`Python ${kind}: same environment preserves files, lock and work while adding course images`, async () => {
    const initial = {
      ...documentFixture('python', kind),
      assets: [imagem('novo')],
    } as EditableStudioProject
    const saved = { ...initial, id: 'saved', name: 'Trabalho', assets: [] }
    const opened = await resolveStudioLessonSeed({ initial, local: async () => saved })
    expect(opened).toEqual({ ...saved, assets: initial.assets })
    expect(saved.assets).toEqual([])
  })
}

describe('saved lesson project priority', () => {
  test('keeps local work ahead of the submitted project and the template', async () => {
    const cloud = mock(async () => submitted)
    expect(
      await resolveStudioLessonSeed({ local: async () => local, submitted: cloud, initial }),
    ).toBe(local)
    expect(cloud).not.toHaveBeenCalled()
  })

  test('a local migration failure cannot open a submitted project or the template', async () => {
    const failure = new Error('historical project needs recovery')
    const cloud = mock(async () => submitted)
    await expect(
      resolveStudioLessonSeed({
        local: async () => {
          throw failure
        },
        submitted: cloud,
        initial,
      }),
    ).rejects.toBe(failure)
    expect(cloud).not.toHaveBeenCalled()
  })

  test('an unavailable browser database cannot be mistaken for an empty draft', async () => {
    await expect(
      resolveStudioLessonSeed({
        local: async () => {
          throw new Error('IndexedDB unavailable')
        },
        initial,
      }),
    ).rejects.toThrow('IndexedDB unavailable')
  })

  test('without a local draft, restores the submitted work before the previous lesson', async () => {
    expect(
      await resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => submitted,
        carryover: async () => carryover,
        initial,
      }),
    ).toBe(submitted)
  })

  test('uses the previous lesson only when the local draft and submission are absent', async () => {
    expect(
      await resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => null,
        carryover: async () => carryover,
        initial,
      }),
    ).toBe(carryover)
  })

  test('uses the initial project only after confirming there is no saved work', async () => {
    expect(
      await resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => null,
        carryover: async () => null,
        initial,
      }),
    ).toBe(initial)
  })

  test('a failed submission read cannot open the initial project', async () => {
    await expect(
      resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => {
          throw new Error('submission unavailable')
        },
        initial,
      }),
    ).rejects.toThrow('submission unavailable')
  })
})

type ProjectAsset = NonNullable<Project['assets']>[number]

const imagem = (name: string, source: ProjectAsset['source'] = 'library'): ProjectAsset =>
  ({
    id: `curso-${name}`,
    name,
    kind: 'image',
    source,
    dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
  }) as ProjectAsset

describe('library images added to the course after the work was saved', () => {
  const modelo = {
    id: 'initial',
    name: 'Projeto inicial',
    assets: [imagem('personagem'), imagem('menina'), imagem('envio-do-professor', 'upload')],
  } as Project

  test('adds only the missing library images and keeps the child’s own images first', async () => {
    const minha = { ...imagem('personagem'), dataUrl: 'data:image/png;base64,bWluaGE=' }
    const salvo = {
      id: 'lesson-child',
      name: 'Meu jogo',
      assets: [minha, imagem('foto', 'upload')],
    } as Project
    const aberto = await resolveStudioLessonSeed({ local: async () => salvo, initial: modelo })
    expect(aberto.assets?.map((asset) => asset.name)).toEqual(['personagem', 'foto', 'menina'])
    // A imagem que a criança já tem com o mesmo nome não é trocada pela do modelo.
    expect(aberto.assets?.[0]).toBe(minha)
    expect(salvo.assets).toHaveLength(2)
  })

  test('also completes the submitted and the previous-lesson projects', async () => {
    const antigo = {
      id: 'previous',
      name: 'Aula anterior',
      assets: [imagem('personagem')],
    } as Project
    for (const fonte of ['submitted', 'carryover'] as const) {
      const aberto = await resolveStudioLessonSeed({
        local: async () => null,
        [fonte]: async () => antigo,
        initial: modelo,
      })
      expect(aberto.assets?.map((asset) => asset.name)).toEqual(['personagem', 'menina'])
    }
  })

  test('returns the same project when nothing is missing', async () => {
    const completo = {
      id: 'lesson-child',
      name: 'Meu jogo',
      assets: [imagem('personagem'), imagem('menina')],
    } as Project
    expect(await completeLibraryAssets(completo, modelo)).toBe(completo)
    expect(await completeLibraryAssets(local, modelo)).not.toBe(local)
    expect(await completeLibraryAssets(local, initial)).toBe(local)
  })
})

for (const kind of ['classic', 'pro'] as const) {
  for (const conflict of ['identical', 'case', 'source'] as const)
    test(`Python ${kind}: ${conflict} course material paths never produce a corrupt merged seed`, async () => {
      const base = { ...documentFixture('python', kind), assets: [] } as EditableStudioProject
      if (base.programmingLanguage !== 'python') throw new Error('fixture')
      const own = { ...imagem('heroi'), proPath: 'hero.svg' }
      const saved = { ...base, assets: conflict === 'source' ? [] : [own] }
      if (conflict === 'source') {
        if (saved.kind === 'pro') saved.tree['hero.svg'] = { kind: 'file', content: '<svg/>' }
        else saved.files['hero.svg'] = '<svg/>'
      }
      const initial = {
        ...base,
        assets: [
          { ...imagem('novo-heroi'), proPath: conflict === 'case' ? 'Hero.svg' : 'hero.svg' },
        ],
      }
      const before = structuredClone(saved)
      await expect(completeLibraryAssets(saved, initial)).rejects.toBeInstanceOf(
        StudioLessonMaterialError,
      )
      expect(saved).toEqual(before)
      expect(initial.assets[0]?.name).toBe('novo-heroi')
    })
}
