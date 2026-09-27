import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { encodePng } from '../../../export/png'
import { installReferenceImageRuntime } from '../../../testing/referenceImageRuntime'
import { ReferenceImageGuide } from './ReferenceImageGuide'

const copy = COPY.editor.model.reference
const file = (name: string) =>
  new File([new Uint8Array(encodePng(new Uint8Array(16), 2, 2))], name, { type: 'image/png' })
function choose(container: HTMLElement, name: string) {
  const input = container.querySelector('input[type=file]')
  if (!input) throw new Error('Expected image chooser')
  fireEvent.change(input, { target: { files: [file(name)] } })
}

test('a reference is view-bound, non-interactive and adjustable without touching the model canvas', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const { container, rerender, unmount } = render(
      <ReferenceImageGuide view="front" disabled={false}>
        <canvas data-testid="model" />
      </ReferenceImageGuide>,
    )
    const canvas = screen.getByTestId('model')
    const button = screen.getByRole('button', { name: copy.title })
    button.focus()
    fireEvent.click(button)
    choose(container, 'desenho.png')
    await waitFor(() => expect(runtime.images).toHaveLength(1))
    await act(async () => runtime.images[0]!.finish())
    await screen.findByText('desenho.png')
    const image = container.querySelector('img')!
    expect(image.classList.contains('pointer-events-none')).toBe(true)
    expect(image.style.opacity).toBe('0.3')
    fireEvent.change(screen.getByRole('slider', { name: copy.opacity }), {
      target: { value: '50' },
    })
    expect(image.style.opacity).toBe('0.5')
    fireEvent.click(screen.getByRole('button', { name: copy.flip }))
    expect(image.style.transform).toContain('scale(-0.8, 0.8)')
    fireEvent.click(screen.getByRole('button', { name: copy.done }))
    expect(document.activeElement).toBe(button)
    rerender(
      <ReferenceImageGuide view="left" disabled={false}>
        <canvas data-testid="model" />
      </ReferenceImageGuide>,
    )
    expect(container.querySelector('img')).toBeNull()
    rerender(
      <ReferenceImageGuide view="front" disabled={false}>
        <canvas data-testid="model" />
      </ReferenceImageGuide>,
    )
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:reference-0')
    expect(screen.getByTestId('model')).toBe(canvas)
    unmount()
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
  } finally {
    runtime.restore()
  }
})

test('failed replacement keeps the previous guide; cancel does not install late decoded data', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const { container, unmount } = render(
      <ReferenceImageGuide view="front" disabled={false}>
        <canvas />
      </ReferenceImageGuide>,
    )
    fireEvent.click(screen.getByRole('button', { name: copy.title }))
    choose(container, 'original.png')
    await waitFor(() => expect(runtime.images).toHaveLength(1))
    await act(async () => runtime.images[0]!.finish())
    await screen.findByText('original.png')
    choose(container, 'quebrado.png')
    await waitFor(() => expect(runtime.images).toHaveLength(2))
    await act(async () => runtime.images[1]!.fail())
    expect((await screen.findByRole('alert')).textContent).toBe(copy.failures.decode)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:reference-0')
    choose(container, 'atrasado.png')
    await waitFor(() => expect(runtime.images).toHaveLength(3))
    fireEvent.click(screen.getByRole('button', { name: copy.done }))
    expect(runtime.images[2]!.removed).toBe(true)
    await act(async () => runtime.images[2]!.finish())
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:reference-0')
    unmount()
    expect(runtime.revoke).toHaveBeenCalledTimes(3)
  } finally {
    runtime.restore()
  }
})

test('rapid replacement only adopts the latest request, and remove releases its resource', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const { container, unmount } = render(
      <ReferenceImageGuide view="front" disabled={false}>
        <canvas />
      </ReferenceImageGuide>,
    )
    fireEvent.click(screen.getByRole('button', { name: copy.title }))
    choose(container, 'primeiro.png')
    await waitFor(() => expect(runtime.images).toHaveLength(1))
    choose(container, 'segundo.png')
    await waitFor(() => expect(runtime.images).toHaveLength(2))
    await act(async () => runtime.images[1]!.finish())
    await screen.findByText('segundo.png')
    await act(async () => runtime.images[0]!.finish())
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:reference-1')
    fireEvent.click(screen.getByRole('button', { name: copy.remove }))
    expect(container.querySelector('img')).toBeNull()
    expect(runtime.revoke).toHaveBeenCalledTimes(2)
    unmount()
    expect(runtime.revoke).toHaveBeenCalledTimes(2)
  } finally {
    runtime.restore()
  }
})

test('closing the editor during decode releases its URL and cannot leak into the next instance', async () => {
  const runtime = installReferenceImageRuntime()
  try {
    const first = render(
      <ReferenceImageGuide view="front" disabled={false}>
        <canvas />
      </ReferenceImageGuide>,
    )
    fireEvent.click(screen.getByRole('button', { name: copy.title }))
    choose(first.container, 'antigo.png')
    await waitFor(() => expect(runtime.images).toHaveLength(1))
    first.unmount()
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
    const second = render(
      <ReferenceImageGuide view="front" disabled={false}>
        <canvas />
      </ReferenceImageGuide>,
    )
    await act(async () => runtime.images[0]!.finish())
    expect(second.container.querySelector('img')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.title }))
    expect(within(screen.getByRole('dialog')).queryByText('antigo.png')).toBeNull()
    second.unmount()
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
  } finally {
    runtime.restore()
  }
})
