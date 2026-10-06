import { describe, expect, mock, test } from 'bun:test'
import type { Project } from '@sistemazero/studio'
import { completeLibraryAssets, resolveStudioLessonSeed } from '../src/lib/studio-lesson-seed'

const local = { id: 'lesson-child', name: 'Meu trabalho local' } as Project
const submitted = { id: 'submitted', name: 'Minha entrega' } as Project
const carryover = { id: 'previous', name: 'Aula anterior' } as Project
const initial = { id: 'initial', name: 'Projeto inicial' } as Project

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

  test('returns the same project when nothing is missing', () => {
    const completo = {
      id: 'lesson-child',
      name: 'Meu jogo',
      assets: [imagem('personagem'), imagem('menina')],
    } as Project
    expect(completeLibraryAssets(completo, modelo)).toBe(completo)
    expect(completeLibraryAssets(local, modelo)).not.toBe(local)
    expect(completeLibraryAssets(local, initial)).toBe(local)
  })
})
