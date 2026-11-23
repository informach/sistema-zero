import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createEmptyProject, type Project } from '#core'
import { useProjectStore } from '../../../state/projectStore'
import {
  currentProEngineCopies,
  type ProEngineInventory,
  proEngineCopyPath,
  proEngineUpdatePlan,
} from '../proEngineCopies'
import { useProEngineUpdateOffer } from './useProEngineUpdate'

const path = proEngineCopyPath('game-2d')
let current = ''
let older = ''
let known: ProEngineInventory

beforeAll(async () => {
  current = (await currentProEngineCopies('game-2d')).completo
  older = `/* motor publicado antes */\n${current}`
  known = {
    'game-2d': { completo: [await studioProDigest(older)], 'sem-cenario-pinta': [] },
    'game-2d-advanced': { completo: [], 'sem-cenario-pinta': [] },
  }
})

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  useProjectStore.getState().setEditingAccess('author')
})

function Probe() {
  return <output>{useProEngineUpdateOffer(known) ?? 'sem oferta'}</output>
}

function openPro(engine: string): Project {
  const project: Project = {
    ...createEmptyProject('pro-com-motor', 'Meu jogo'),
    kind: 'pro',
    mode: 'code',
    proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
    tree: {
      'index.html': { kind: 'file', content: '<canvas></canvas>' },
      public: { kind: 'dir' },
      'public/script.js': { kind: 'file', content: 'window.PROGRAMA = 1' },
      'public/sz-ext': { kind: 'dir' },
      [path]: { kind: 'file', content: engine },
    },
  }
  useProjectStore.setState({ project, isDirty: false, saveError: null })
  return project
}

describe('useProEngineUpdateOffer', () => {
  it('oferece a troca a quem é autor de um projeto com motor antigo e intacto', async () => {
    openPro(older)
    render(<Probe />)
    expect(await screen.findByText('pro-com-motor')).toBeTruthy()
    // Digitar no código da criança não muda a oferta.
    act(() =>
      useProjectStore.getState().setProFileContent('public/script.js', 'window.PROGRAMA = 2'),
    )
    expect(await screen.findByText('pro-com-motor')).toBeTruthy()
    // Quem só observa o projeto não recebe a oferta.
    act(() => useProjectStore.getState().setEditingAccess('observer'))
    expect(await screen.findByText('sem oferta')).toBeTruthy()
  })

  it('a oferta acompanha o arquivo do motor: some com o motor de agora ou editado', async () => {
    const edited = `${older}\n// meu ajuste`
    openPro(edited)
    render(<Probe />)
    // A conferência é assíncrona: espera a mesma conta que o hook faz antes de afirmar "sem oferta".
    const settle = (content: string) =>
      act(async () => {
        await proEngineUpdatePlan({ [path]: { kind: 'file', content } }, known)
      })
    await settle(edited)
    expect(screen.getByText('sem oferta')).toBeTruthy()
    act(() => useProjectStore.getState().setProFileContent(path, older))
    expect(await screen.findByText('pro-com-motor')).toBeTruthy()
    act(() => useProjectStore.getState().setProFileContent(path, current))
    await settle(current)
    expect(screen.getByText('sem oferta')).toBeTruthy()
  })
})
