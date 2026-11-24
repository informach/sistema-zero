import { afterEach, expect, mock, test } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createRef, StrictMode } from 'react'
import type { EditableStudioProject } from '../../core/editableProject'
import { StudioProjectPlayer } from './StudioProjectPlayer'

/**
 * O minijogo Pro do Arquipélago (lacunas, 01/11/2026): o host compila pela rota do desafio e o
 * player só mostra o artefato, no quadro isolado, sem WebContainer.
 */
const artifact = {
  id: 'a'.repeat(64),
  sha256: 'b'.repeat(64),
  url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
  expiresAt: Date.now() + 60_000,
}
const project = {
  id: 'minijogo-pro',
  name: 'Jardim',
  kind: 'pro',
  tree: { 'src/main.ts': { kind: 'file', content: 'export {}' } },
} as unknown as EditableStudioProject
afterEach(cleanup)

test('Pro com a compilação do host: toca o artefato no quadro isolado, uma compilação só', async () => {
  const build = mock(async () => artifact)
  const view = render(<StudioProjectPlayer project={project} title="Jardim" proBuild={build} />)
  await waitFor(() => expect(view.container.querySelector('iframe')?.src).toBe(artifact.url))
  expect(view.container.querySelector('iframe')?.sandbox.value).toBe(
    'allow-scripts allow-pointer-lock',
  )
  expect(build).toHaveBeenCalledTimes(1)
})

test('falha na compilação vira recado, sem quadro; artefato estranho também', async () => {
  const falha = mock(async () => {
    throw new Error('O ambiente Pro demorou demais para responder.')
  })
  const onError = mock(() => {})
  const view = render(<StudioProjectPlayer project={project} proBuild={falha} onError={onError} />)
  expect((await screen.findByRole('alert')).textContent).toContain('demorou demais')
  expect(view.container.querySelector('iframe')).toBeNull()
  expect(onError).toHaveBeenCalledTimes(1)
  cleanup()
  const estranho = mock(async () => ({ ...artifact, url: 'https://outro.test/qualquer' }))
  const outra = render(<StudioProjectPlayer project={project} proBuild={estranho} />)
  expect((await screen.findByRole('alert')).textContent).toContain('não devolveu o jogo')
  expect(outra.container.querySelector('iframe')).toBeNull()
})

test('Pro compilado mantém a referência pública do quadro e a libera ao fechar', async () => {
  const frame = createRef<HTMLIFrameElement>()
  const build = async () => artifact
  const view = render(
    <StrictMode>
      <StudioProjectPlayer project={project} proBuild={build} ref={frame} />
    </StrictMode>,
  )
  await waitFor(() => expect(view.container.querySelector('iframe')?.src).toBe(artifact.url))
  expect(frame.current === view.container.querySelector('iframe')).toBe(true)
  expect(frame.current?.isConnected).toBe(true)
  view.unmount()
  expect(frame.current).toBeNull()
})

test('atualizar o callback de erro do host não recompila um artefato pronto', async () => {
  const build = mock(async () => artifact)
  const view = render(<StudioProjectPlayer project={project} proBuild={build} onError={() => {}} />)
  await waitFor(() => expect(view.container.querySelector('iframe')?.src).toBe(artifact.url))
  view.rerender(<StudioProjectPlayer project={project} proBuild={build} onError={() => {}} />)
  await waitFor(() => expect(view.container.querySelector('iframe')?.src).toBe(artifact.url))
  expect(build).toHaveBeenCalledTimes(1)
})
