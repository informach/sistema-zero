import { afterEach, expect, spyOn, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { CtrlBar } from '../../../../member-shell/src/components/creator/console-controls'

afterEach(cleanup)
test('controlled public mute persists through hidden controls and restart while retaining the JS protocol', () => {
  const messages: unknown[] = []
  const posted = spyOn(window, 'postMessage').mockImplementation((value) => {
    messages.push(value)
  })
  function Host() {
    const [muted, setMuted] = useState(false),
      [visible, setVisible] = useState(true),
      [runs, setRuns] = useState(0)
    const frame = useRef<HTMLIFrameElement>(document.createElement('iframe'))
    const fullscreen = useRef<HTMLDivElement>(null)
    Object.defineProperty(frame.current, 'contentWindow', { configurable: true, value: window })
    return (
      <div ref={fullscreen}>
        <output data-testid="preference">{String(muted)}</output>
        <output data-testid="restarts">{runs}</output>
        <button type="button" onClick={() => setVisible((value) => !value)}>
          Controles
        </button>
        {visible && (
          <CtrlBar
            iframeRef={frame}
            fullscreenTargetRef={fullscreen}
            onRestart={() => setRuns((value) => value + 1)}
            muted={muted}
            onMutedChange={setMuted}
          />
        )}
      </div>
    )
  }
  try {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }))
    expect(screen.getByTestId('preference').textContent).toBe('true')
    expect(messages.at(-1)).toEqual({ type: 'sz:audio', muted: true })
    fireEvent.click(screen.getByRole('button', { name: 'Controles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Controles' }))
    expect(screen.getByRole('button', { name: 'Ativar som' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))
    expect(screen.getByTestId('restarts').textContent).toBe('1')
    expect(screen.getByTestId('preference').textContent).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }))
    expect(messages.at(-1)).toEqual({ type: 'sz:audio', muted: false })
  } finally {
    posted.mockRestore()
  }
})
