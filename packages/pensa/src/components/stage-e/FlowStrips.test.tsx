import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaHostAdapter } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import { createFakeTransport, makeSpecFlow } from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { FlowStrips } from './FlowStrips'

function renderStrips(props: Partial<Parameters<typeof FlowStrips>[0]> = {}) {
  const transport = createFakeTransport(() => {
    throw new Error('sem rede neste teste')
  })
  const adapter: PensaHostAdapter = { transport, mode: 'kids' }
  return render(
    <PensaAppProvider
      value={{ adapter, copy: getCopy('kids'), store: createProjectStore(transport) }}
    >
      <FlowStrips
        flows={props.flows ?? [makeSpecFlow()]}
        approved={props.approved ?? false}
        busy={props.busy}
        onApprove={props.onApprove ?? (() => {})}
        onChange={props.onChange ?? (() => {})}
      />
    </PensaAppProvider>,
  )
}

describe('FlowStrips', () => {
  it('cada flow vira uma tirinha com 3 quadrinhos rotulados + chips das telas', () => {
    const flows = [
      makeSpecFlow(),
      makeSpecFlow({
        id: 'flow-2',
        title: 'Pegar a moeda',
        input: 'encosta na moeda',
        processing: 'soma um ponto',
        output: 'a moeda some e o placar sobe',
        screens: ['Fase 1', 'Fim de jogo'],
      }),
    ]
    renderStrips({ flows })

    // Os 3 rótulos dos quadrinhos aparecem UMA vez por tirinha.
    expect(screen.getAllByText('Quando o jogador...')).toHaveLength(2)
    expect(screen.getAllByText('...o jogo...')).toHaveLength(2)
    expect(screen.getAllByText('...e aparece na tela...')).toHaveLength(2)
    // Conteúdo dos quadrinhos e títulos.
    expect(screen.getByText('Desviar do meteoro')).toBeTruthy()
    expect(screen.getByText('encosta na moeda')).toBeTruthy()
    expect(screen.getByText('soma um ponto')).toBeTruthy()
    expect(screen.getByText('a moeda some e o placar sobe')).toBeTruthy()
    // Chips das telas envolvidas no rodapé.
    expect(screen.getAllByText('Fase 1')).toHaveLength(2)
    expect(screen.getByText('Fim de jogo')).toBeTruthy()
  })

  it('"Tá certo!" aprova e "Mudar" abre o feedback; aprovado vira selo', () => {
    let approved = 0
    let changed = 0
    const view = renderStrips({
      onApprove: () => {
        approved += 1
      },
      onChange: () => {
        changed += 1
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Tá certo!' }))
    expect(approved).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Mudar' }))
    expect(changed).toBe(1)

    view.rerender(
      <PensaAppProvider
        value={{
          adapter: { transport: createFakeTransport(() => null), mode: 'kids' },
          copy: getCopy('kids'),
          store: createProjectStore(createFakeTransport(() => null)),
        }}
      >
        <FlowStrips flows={[makeSpecFlow()]} approved onApprove={() => {}} onChange={() => {}} />
      </PensaAppProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Tá certo!' })).toBeNull()
    expect(screen.getByText('Aprovado!')).toBeTruthy()
    // "Mudar" continua disponível mesmo aprovado.
    expect(screen.getByRole('button', { name: 'Mudar' })).toBeTruthy()
  })
})
