import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaHostAdapter } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import { createFakeTransport, makeSpecScreen } from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { ScreenWireframes } from './ScreenWireframes'

function renderWireframes(props: Partial<Parameters<typeof ScreenWireframes>[0]> = {}) {
  const transport = createFakeTransport(() => {
    throw new Error('sem rede neste teste')
  })
  const adapter: PensaHostAdapter = { transport, mode: 'kids' }
  return render(
    <PensaAppProvider
      value={{ adapter, copy: getCopy('kids'), store: createProjectStore(transport) }}
    >
      <ScreenWireframes
        screens={props.screens ?? [makeSpecScreen()]}
        palette={props.palette}
        approved={props.approved ?? false}
        onApprove={props.onApprove ?? (() => {})}
        onChange={props.onChange ?? (() => {})}
      />
    </PensaAppProvider>,
  )
}

describe('ScreenWireframes', () => {
  it('desenha cada screen com as 3 zonas e os elementos por kind com label', () => {
    const { container } = renderWireframes({
      screens: [makeSpecScreen(), makeSpecScreen({ name: 'Fim de jogo', elements: [] })],
    })

    // Dois cards de telinha, cada um com as 3 zonas.
    expect(container.querySelectorAll('[data-screen]')).toHaveLength(2)
    const first = container.querySelector('[data-screen="Início"]')
    expect(first).not.toBeNull()
    for (const zone of ['top', 'middle', 'bottom']) {
      expect(first?.querySelector(`[data-zone="${zone}"]`)).not.toBeNull()
    }

    // Elementos na zona certa, com o kind e o label visíveis.
    const top = first?.querySelector('[data-zone="top"]')
    expect(top?.querySelector('[data-kind="title"]')?.textContent).toBe('Dino Turbo')
    expect(top?.querySelector('[data-kind="score"]')?.textContent).toBe('Pontos')
    const middle = first?.querySelector('[data-zone="middle"]')
    expect(middle?.querySelector('[data-kind="hero"]')?.textContent).toBe('Dino')
    expect(middle?.querySelector('[data-kind="enemy"]')?.textContent).toBe('Meteoro')
    expect(middle?.querySelector('[data-kind="item"]')?.textContent).toBe('Moeda')
    expect(middle?.querySelector('[data-kind="background"]')?.textContent).toBe('Floresta')
    const bottom = first?.querySelector('[data-zone="bottom"]')
    expect(bottom?.querySelector('[data-kind="button"]')?.textContent).toBe('Jogar')
    expect(bottom?.querySelector('[data-kind="text"]')?.textContent).toBe('Recorde')

    // Nome da tela + ações da seção.
    expect(screen.getByText('Fim de jogo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tá certo!' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mudar' })).toBeTruthy()
  })

  it('sem paleta usa tokens (sem style inline); com paleta REPINTA via rgba', () => {
    const view = renderWireframes()
    const title = view.container.querySelector<HTMLElement>('[data-kind="title"]')
    expect(title?.getAttribute('style')).toBeNull()
    expect(title?.className).toContain('bg-pz-accent/20')

    view.rerender(
      <PensaAppProvider
        value={{
          adapter: { transport: createFakeTransport(() => null), mode: 'kids' },
          copy: getCopy('kids'),
          store: createProjectStore(createFakeTransport(() => null)),
        }}
      >
        <ScreenWireframes
          screens={[makeSpecScreen()]}
          palette={['#22c55e', '#facc15', '#0ea5e9', '#f97316']}
          approved={false}
          onApprove={() => {}}
          onChange={() => {}}
        />
      </PensaAppProvider>,
    )

    const painted = view.container.querySelector<HTMLElement>('[data-kind="title"]')
    // title usa a 3ª cor (destaque, #0ea5e9 = rgb(14, 165, 233)) — NUNCA a cor 0,
    // que é o FUNDO da paleta (título sumia sobre o preenchimento do fundo).
    expect(painted?.getAttribute('style')).toContain('rgba(14, 165, 233')
    expect(painted?.className).not.toContain('bg-pz-accent/20')
    const hero = view.container.querySelector<HTMLElement>('[data-kind="hero"]')
    // hero usa a 2ª cor da paleta (#facc15 = rgb(250, 204, 21)).
    expect(hero?.getAttribute('style')).toContain('rgba(250, 204, 21')
    const background = view.container.querySelector<HTMLElement>('[data-kind="background"]')
    expect(background?.getAttribute('style')).toContain('rgba(34, 197, 94')
  })

  it('paleta com hex inválido cai nos tokens (nunca quebra)', () => {
    const { container } = renderWireframes({ palette: ['lima', 'azul'] })
    const title = container.querySelector<HTMLElement>('[data-kind="title"]')
    expect(title?.getAttribute('style')).toBeNull()
    expect(title?.className).toContain('bg-pz-accent/20')
  })
})
