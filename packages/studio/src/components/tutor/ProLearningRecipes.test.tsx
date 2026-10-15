import { afterEach, describe, expect, mock, test } from 'bun:test'
import { type StudioTutorIntent, studioProTemplate } from '@sistemazero/core/studio'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createGameTree } from '../code/pro-templates/games'
import { ProLearningRecipes } from './ProLearningRecipes'

afterEach(cleanup)

async function treeFor(id: string) {
  const template = studioProTemplate(id)
  if (!template) throw new Error('Kit ausente')
  return createGameTree(template)
}

describe('receitas do kit no Zappy Pro', () => {
  test('aprender e preparar alteração só preenchem callbacks; manual não chama nenhum deles', async () => {
    const tree = await treeFor('canvas-survival')
    const before = JSON.stringify(tree)
    const onAsk = mock((_question: string, _intent: StudioTutorIntent) => {})
    const onBuild = mock((_objective: string) => {})
    render(
      <ProLearningRecipes
        templateId="canvas-survival"
        tree={tree}
        onAsk={onAsk}
        onBuild={onBuild}
      />,
    )
    fireEvent.click(screen.getByText('Aprender com os recursos do kit'))
    fireEvent.change(screen.getByLabelText('Encontrar um recurso'), { target: { value: 'som' } })
    const audio = within(screen.getByRole('article', { name: 'Sons de coleta e acerto' }))
    fireEvent.click(audio.getByText('Passo a passo manual'))
    expect(audio.getByText(/registre um caminho local em define/)).toBeTruthy()
    expect(audio.getByText(/Até 16 IDs/)).toBeTruthy()
    expect(onAsk).not.toHaveBeenCalled()
    expect(onBuild).not.toHaveBeenCalled()
    fireEvent.click(audio.getByRole('button', { name: 'Entender' }))
    expect(onAsk).toHaveBeenCalledTimes(1)
    expect(onAsk.mock.calls[0]?.[0]).toContain('src/sound.ts (createSoundBank)')
    expect(onAsk.mock.calls[0]?.[1]).toBe('explain')
    expect(onBuild).not.toHaveBeenCalled()
    fireEvent.click(audio.getByRole('button', { name: 'Preparar alteração' }))
    expect(onBuild).toHaveBeenCalledTimes(1)
    expect(onBuild.mock.calls[0]?.[0]).toContain('preservando minhas outras escolhas')
    expect(JSON.stringify(tree)).toBe(before)
  })

  test('Three oferece câmera e materiais, sem presumir sprites Canvas', async () => {
    render(
      <ProLearningRecipes
        templateId="three-exploration"
        tree={await treeFor('three-exploration')}
        onAsk={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Aprender com os recursos do kit'))
    expect(screen.getByRole('article', { name: 'Câmera e enquadramento' })).toBeTruthy()
    expect(screen.getByRole('article', { name: 'Luz e materiais 3D' })).toBeTruthy()
    expect(screen.queryByRole('article', { name: 'Personagem e sprites' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Preparar alteração' })).toBeNull()
  })

  test('projeto importado ou export removida recebe ajuda genérica, sem receita incompatível', async () => {
    const tree = await treeFor('canvas-survival')
    tree['src/sound.ts'] = { kind: 'file', content: 'export const changed = true' }
    const view = render(
      <ProLearningRecipes templateId="canvas-survival" tree={tree} onAsk={() => {}} />,
    )
    fireEvent.click(screen.getByText('Aprender com os recursos do kit'))
    fireEvent.change(screen.getByLabelText('Encontrar um recurso'), { target: { value: 'som' } })
    expect(screen.queryByRole('article', { name: 'Sons de coleta e acerto' })).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('pedir uma explicação normalmente')
    view.rerender(<ProLearningRecipes tree={tree} onAsk={() => {}} />)
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
})
