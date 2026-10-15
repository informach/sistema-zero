import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { buildProProject } from '../../core/proProject'
import { setProjectStorageNamespace } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import { ProAssistancePanel } from './ProAssistancePanel'

afterEach(() => {
  cleanup()
  setProjectStorageNamespace('')
  useProjectStore.setState({ project: null })
})
function setup() {
  useProjectStore
    .getState()
    .setProject(
      buildProProject(
        'notes',
        'Notas',
        { 'main.ts': { kind: 'file', content: 'const score = 0' } },
        'dev',
        'vanilla-vite',
      ),
    )
  return render(<ProAssistancePanel projectId="notes" />)
}
test('optional questions and a free answer survive reopening without changing code', () => {
  const ui = setup()
  fireEvent.click(ui.getByRole('button', { name: 'Quero ajuda para planejar', hidden: true }))
  const question = ui.getByLabelText('Qual é o objetivo do jogo?')
  fireEvent.change(question, { target: { value: 'Encontrar três cristais' } })
  fireEvent.submit(question.closest('form')!)
  const project = useProjectStore.getState().project!
  expect(project.proMeta?.assistance?.questions?.[0]).toMatchObject({
    status: 'answered',
    answer: 'Encontrar três cristais',
  })
  expect(project.tree?.['main.ts']).toEqual({ kind: 'file', content: 'const score = 0' })
  ui.unmount()
  const reopened = render(<ProAssistancePanel projectId="notes" />)
  expect(reopened.getByText(/Encontrar três cristais/)).toBeDefined()
  expect(reopened.getByLabelText('Como a pessoa joga e controla o personagem?')).toBeDefined()
})
test('does not replace a briefing changed elsewhere or write through a profile epoch change', () => {
  setProjectStorageNamespace('notes-a')
  const ui = setup()
  const idea = ui.getByLabelText('Ideia do projeto') as HTMLTextAreaElement
  fireEvent.change(idea, { target: { value: 'Minha ideia ainda não guardada' } })
  act(() => {
    useProjectStore.getState().setProAssistance({ version: 1, briefing: 'Outra ideia' })
  })
  fireEvent.submit(idea.closest('form')!)
  expect(ui.getByRole('alert', { hidden: true }).textContent).toContain('mudaram')
  expect(useProjectStore.getState().project?.proMeta?.assistance?.briefing).toBe('Outra ideia')
  expect(idea.value).toBe('Minha ideia ainda não guardada')
  setProjectStorageNamespace('notes-b')
  setProjectStorageNamespace('notes-a')
  fireEvent.change(idea, { target: { value: 'Novo texto' } })
  fireEvent.submit(idea.closest('form')!)
  expect(ui.getByRole('alert', { hidden: true }).textContent).toContain('perfil mudou')
  expect(useProjectStore.getState().project?.proMeta?.assistance?.briefing).toBe('Outra ideia')
})
