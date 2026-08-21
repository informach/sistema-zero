import { afterEach, describe, expect, it, setSystemTime, spyOn } from 'bun:test'
import { defaultProjectControls } from '@sistemazero/studio/controls'
import { act, fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { SCREENSHOT_REQUEST_TIMEOUT_MS } from '../src/components/kids/console-controls'
import { PublicStage } from '../src/components/kids/public-stage'
import { DEFAULT_STAGE_ASPECT } from '../src/lib/stage-fit'

afterEach(() => setSystemTime())

function renderGamepad() {
  const iframeRef = createRef<HTMLIFrameElement>()
  const rootRef = createRef<HTMLDivElement>()
  const view = render(
    <>
      <iframe ref={iframeRef} title="Jogo de teste" />
      <PublicStage
        rootRef={rootRef}
        iframeRef={iframeRef}
        onRestart={() => {}}
        showControls
        rotated={false}
        landscape={false}
        stageAspect={DEFAULT_STAGE_ASPECT}
        controls={defaultProjectControls()}
        header={null}
      >
        <div>Jogo</div>
      </PublicStage>
    </>,
  )
  if (!iframeRef.current?.contentWindow) throw new Error('iframe de teste não foi montado')
  return { ...view, iframe: iframeRef.current }
}

function screenshotMessage(
  source: MessageEventSource,
  dataUrl = 'data:image/png;base64,iVBORw0KGgo=',
) {
  return new MessageEvent('message', {
    source,
    data: { type: 'sz:screenshot:result', dataUrl },
  })
}

describe('download de screenshot do gamepad', () => {
  it('ignora resposta não solicitada, mesmo quando vem do iframe do jogo', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      const { iframe } = renderGamepad()
      act(() => window.dispatchEvent(screenshotMessage(iframe.contentWindow as Window)))
      expect(click).not.toHaveBeenCalled()
    } finally {
      click.mockRestore()
    }
  })

  it('baixa uma única PNG pequena depois de uma solicitação explícita', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      const { getAllByRole, iframe } = renderGamepad()
      fireEvent.click(getAllByRole('button', { name: 'Screenshot' })[0] as HTMLButtonElement)

      act(() => window.dispatchEvent(screenshotMessage(iframe.contentWindow as Window)))
      act(() => window.dispatchEvent(screenshotMessage(iframe.contentWindow as Window)))

      expect(click).toHaveBeenCalledTimes(1)
    } finally {
      click.mockRestore()
    }
  })

  it('recusa fonte diferente, MIME diferente e payload acima do limite', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      const { getAllByRole, iframe } = renderGamepad()
      const screenshot = getAllByRole('button', { name: 'Screenshot' })[0] as HTMLButtonElement

      fireEvent.click(screenshot)
      act(() =>
        window.dispatchEvent(screenshotMessage(window, 'data:image/png;base64,iVBORw0KGgo=')),
      )

      fireEvent.click(screenshot)
      act(() =>
        window.dispatchEvent(
          screenshotMessage(iframe.contentWindow as Window, 'data:text/html;base64,PGgxPg=='),
        ),
      )

      fireEvent.click(screenshot)
      act(() =>
        window.dispatchEvent(
          screenshotMessage(
            iframe.contentWindow as Window,
            `data:image/png;base64,${'A'.repeat(8_000_001)}`,
          ),
        ),
      )

      expect(click).not.toHaveBeenCalled()
    } finally {
      click.mockRestore()
    }
  })

  it('expira a autorização quando o iframe demora demais para responder', () => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      setSystemTime(new Date(1_000))
      const { getAllByRole, iframe } = renderGamepad()
      fireEvent.click(getAllByRole('button', { name: 'Screenshot' })[0] as HTMLButtonElement)

      setSystemTime(new Date(1_001 + SCREENSHOT_REQUEST_TIMEOUT_MS))
      act(() => window.dispatchEvent(screenshotMessage(iframe.contentWindow as Window)))

      expect(click).not.toHaveBeenCalled()
    } finally {
      click.mockRestore()
    }
  })
})
