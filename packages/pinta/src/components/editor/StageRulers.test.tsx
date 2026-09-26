import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useRef, useState } from 'react'
import { StageRulers } from './StageRulers'

/**
 * O palco re-renderiza a cada `pointermove` de gesto. A régua não pode re-criar os
 * milhares de traços a cada um deles: `RulerTicks` é `memo` e `ticks` é memoizado por
 * zoom/documento, então um render do pai com as mesmas entradas pula a subárvore.
 * happy-dom não faz layout: o que se prova aqui é a CONTAGEM de renders, via a sonda.
 */
function Harness({ onTicksRender }: { onTicksRender: () => void }): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<SVGSVGElement>(null)
  const [, setTick] = useState(0)
  const [zoom, setZoom] = useState(1)
  return (
    <>
      <button type="button" onClick={() => setTick((n) => n + 1)}>
        re-render
      </button>
      <button type="button" onClick={() => setZoom((z) => z * 2)}>
        zoom
      </button>
      <StageRulers
        enabled
        stageRef={stageRef}
        contentRef={contentRef}
        docWidth={480}
        docHeight={360}
        zoom={zoom}
        onTicksRender={onTicksRender}
      >
        <div ref={stageRef}>
          <svg ref={contentRef} aria-label="conteúdo" role="img" />
        </div>
      </StageRulers>
    </>
  )
}

describe('StageRulers: os traços não são re-criados a cada render do palco', () => {
  it('um re-render do pai com o mesmo zoom/documento não renderiza os traços de novo', () => {
    let renders = 0
    render(<Harness onTicksRender={() => (renders += 1)} />)
    // Uma régua de cima e uma da esquerda.
    expect(renders).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 're-render' }))
    fireEvent.click(screen.getByRole('button', { name: 're-render' }))
    expect(renders).toBe(2)
    // Mudou o zoom: aí sim os traços são outros.
    fireEvent.click(screen.getByRole('button', { name: 'zoom' }))
    expect(renders).toBe(4)
  })
})
