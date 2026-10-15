import { expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { usePreviewCanvas } from './usePreviewCanvas'

test('each preview owns a fresh canvas and disposes it during StrictMode remount and unmount', () => {
  const instances: Array<{ canvas: HTMLCanvasElement; disposed: number }> = []
  const create = (canvas: HTMLCanvasElement) => {
    const instance = { canvas, disposed: 0 }
    instances.push(instance)
    return {
      dispose: () => {
        instance.disposed += 1
      },
    }
  }
  function Preview() {
    const { containerRef } = usePreviewCanvas(create, 'Prévia')
    return <div ref={containerRef} />
  }
  const view = render(
    <StrictMode>
      <Preview />
    </StrictMode>,
  )
  expect(instances).toHaveLength(2)
  expect(instances[0]?.canvas).not.toBe(instances[1]?.canvas)
  expect(instances[0]?.disposed).toBe(1)
  expect(instances[0]?.canvas.isConnected).toBe(false)
  expect(instances[1]?.canvas.isConnected).toBe(true)
  expect(view.container.querySelectorAll('canvas[aria-label="Prévia"]')).toHaveLength(1)
  view.unmount()
  expect(instances[1]?.disposed).toBe(1)
  expect(instances[1]?.canvas.isConnected).toBe(false)
})

test('failed construction removes the owned canvas and reports unsupported', () => {
  const create = () => {
    throw new Error('WebGL unavailable')
  }
  function Preview() {
    const { containerRef, unsupported } = usePreviewCanvas(create, 'Prévia')
    return (
      <>
        <div ref={containerRef} />
        <output>{String(unsupported)}</output>
      </>
    )
  }
  const view = render(<Preview />)
  expect(view.container.querySelector('canvas')).toBeNull()
  expect(view.container.querySelector('output')?.textContent).toBe('true')
  view.unmount()
})
