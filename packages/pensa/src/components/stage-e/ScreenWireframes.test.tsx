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
  it('desenha as telas com cara de jogo: sprites, logo, botão 3D e HUD (labels como legenda)', () => {
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

    // Logo e botão: o label É o conteúdo (title na fonte display; button sem sprite).
    const top = first?.querySelector('[data-zone="top"]')
    const title = top?.querySelector('[data-kind="title"]')
    expect(title?.textContent).toBe('Dino Turbo')
    expect(title?.className).toContain('[font-family:var(--font-display)]')
    const bottom = first?.querySelector('[data-zone="bottom"]')
    const button = bottom?.querySelector('[data-kind="button"]')
    expect(button?.textContent).toBe('Jogar')
    expect(button?.querySelector('svg')).toBeNull()

    // Placar vira chip de HUD: sprite decorativo + legenda com o label.
    const scoreEl = top?.querySelector('[data-kind="score"]')
    expect(scoreEl?.textContent).toContain('Pontos')
    expect(scoreEl?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')

    // Herói/inimigo/itens viram SPRITES (svg decorativo) com legenda pequenina.
    const middle = first?.querySelector('[data-zone="middle"]')
    for (const [kind, label] of [
      ['hero', 'Dino'],
      ['enemy', 'Meteoro'],
      ['item', 'Moeda'],
    ] as const) {
      const element = middle?.querySelector(`[data-kind="${kind}"]`)
      expect(element?.textContent).toContain(label)
      expect(element?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }

    // O fundo é a CENA da telinha (camada no CARD, sob as zonas), com o label discreto.
    const background = first?.querySelector('[data-kind="background"]')
    expect(background?.textContent).toContain('Floresta')
    expect(middle?.querySelector('[data-kind="background"]')).toBeNull()

    expect(bottom?.querySelector('[data-kind="text"]')?.textContent).toBe('Recorde')

    // Nome da tela + ações da seção.
    expect(screen.getByText('Fim de jogo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tá certo!' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mudar' })).toBeTruthy()
  })

  it('sem paleta usa tokens (sem style inline); com paleta REPINTA via style', () => {
    const view = renderWireframes()
    const title = view.container.querySelector<HTMLElement>('[data-kind="title"]')
    expect(title?.getAttribute('style')).toBeNull()
    expect(title?.className).toContain('text-pz-accent')

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

    // title usa a 3ª cor (destaque, #0ea5e9 = rgb(14, 165, 233)) — NUNCA a cor 0,
    // que é o FUNDO da paleta (título sumia sobre o preenchimento do fundo).
    const painted = view.container.querySelector<HTMLElement>('[data-kind="title"]')
    expect(painted?.getAttribute('style')).toContain('rgb(14, 165, 233)')
    expect(painted?.className).not.toContain('text-pz-accent')
    // hero usa a 2ª cor da paleta (#facc15 = rgb(250, 204, 21)) via currentColor.
    const hero = view.container.querySelector<HTMLElement>('[data-kind="hero"]')
    expect(hero?.getAttribute('style')).toContain('rgb(250, 204, 21)')
    // botão pinta o FUNDO com a cor de destaque (o texto sai por contraste YIQ).
    const button = view.container.querySelector<HTMLElement>('[data-kind="button"]')
    expect(button?.getAttribute('style')).toContain('rgb(14, 165, 233)')
    // background segue com a cor 0 em alpha (preenchimento da cena).
    const background = view.container.querySelector<HTMLElement>('[data-kind="background"]')
    expect(background?.getAttribute('style')).toContain('rgba(34, 197, 94')
  })

  it('paleta com hex inválido cai nos tokens (nunca quebra)', () => {
    const { container } = renderWireframes({ palette: ['lima', 'azul'] })
    const title = container.querySelector<HTMLElement>('[data-kind="title"]')
    expect(title?.getAttribute('style')).toBeNull()
    expect(title?.className).toContain('text-pz-accent')
    const hero = container.querySelector<HTMLElement>('[data-kind="hero"]')
    expect(hero?.getAttribute('style')).toBeNull()
    expect(hero?.className).toContain('text-pz-stage-z')
  })
})
