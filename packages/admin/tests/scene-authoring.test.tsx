import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')

test('⚠️ o editor do caso AVISA quando um salto não sai do chão (o motor o abre sem salto)', async () => {
  // Review do lote 1: o admin oferece "Pular" no caso, e desde o conserto da Aula 3 o motor desfaz
  // em silêncio o salto que não subiu nem um pixel. O caso segue aceito; o professor é avisado.
  const { saltoParadoNoCaso } = await import('../src/lib/scene-authoring-rules')
  expect(saltoParadoNoCaso('gravity', [{ type: 'jump', input: 'tap' }])).toBe(true)
  expect(
    saltoParadoNoCaso('gravity', [
      { type: 'jump', input: 'tap' },
      { type: 'advance', seconds: 0.3 },
    ]),
  ).toBe(false)
  expect(saltoParadoNoCaso('gravity', [{ type: 'impulse', force: 12 }])).toBe(false)
  expect(saltoParadoNoCaso('gravity', undefined)).toBe(false)

  const { SceneSetupEditor } = await import('../src/components/editor/scene-setup-editor')
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <SceneSetupEditor
        activity={{
          type: 'experimentation',
          scene: 'gravity',
          setup: { actions: [{ type: 'jump', input: 'tap' }] },
        }}
        onChange={() => {}}
      />,
    ),
  )
  expect(container.textContent).toContain('Um salto no caso só aparece com o relógio depois dele.')
  await act(async () =>
    root.render(
      <SceneSetupEditor
        activity={{ type: 'experimentation', scene: 'velocity' }}
        onChange={() => {}}
      />,
    ),
  )
  // A missão de fábrica da `velocity` é a do lado: as metas só de caso ficam fora da contagem.
  expect(container.textContent).toContain('cobra as 3 descobertas do modelo')
  expect(container.textContent).toContain('só vale marcada')
  await act(async () => root.unmount())
  container.remove()
})
