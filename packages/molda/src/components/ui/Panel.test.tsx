import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { controlInventory } from '../../testing/domContract'
import { Panel } from './Panel'

afterEach(() => {
  cleanup()
})

function Recolhivel({ inicial = true }: { inicial?: boolean }) {
  const [open, setOpen] = useState(inicial)
  return (
    <Panel
      title="Arcade"
      ariaLabel="Cores"
      disclosure={{
        open,
        onOpenChange: setOpen,
        expandLabel: 'Mostrar Cores',
        collapseLabel: 'Recolher Cores',
      }}
      actions={<button type="button">Apagar cor</button>}
      collapsedActions={<span>3 cores</span>}
    >
      <input name="apelido" aria-label="Apelido" />
    </Panel>
  )
}

describe('Panel', () => {
  test('sem disclosure continua exatamente como era: título é texto, corpo sempre à mostra', () => {
    render(
      <Panel title="Peças" actions={<button type="button">Somar</button>}>
        <button type="button">Escolher corpo</button>
      </Panel>,
    )
    // Nenhum botão de recolher nasce sozinho: os quatro painéis do editor antigo e os de
    // textura e céu continuam com o mesmo cabeçalho de antes.
    expect(screen.queryByRole('button', { name: /Recolher|Mostrar/ })).toBeNull()
    expect(screen.getByRole('region', { name: 'Peças' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Escolher corpo' })).toBeDefined()
  })

  /**
   * ⚠️⚠️ A divergência deliberada do Pinta, que DESMONTA o corpo ao recolher. Aqui ele fica
   * montado com o atributo `hidden`, igual ao `WorkspaceInspector`: recolher é tirar do
   * alcance, nunca fazer a criança perder o que estava escrevendo.
   */
  test('recolhido, o corpo sai do alcance mas o que estava escrito sobrevive', () => {
    render(<Recolhivel />)
    const campo = screen.getByRole('textbox', { name: 'Apelido' }) as HTMLInputElement
    fireEvent.change(campo, { target: { value: 'foguete' } })

    fireEvent.click(screen.getByRole('button', { name: 'Recolher Cores' }))
    // Fora do alcance: nem a consulta por papel nem o inventário enxergam.
    expect(screen.queryByRole('textbox', { name: 'Apelido' })).toBeNull()
    expect(controlInventory(document.body)).not.toContain('textbox: Apelido')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Cores' }))
    const devolta = screen.getByRole('textbox', { name: 'Apelido' }) as HTMLInputElement
    // A MESMA caixa, com o MESMO texto: é isto que desmontar perderia.
    expect(devolta).toBe(campo)
    expect(devolta.value).toBe('foguete')
  })

  test('a faixa inteira do título abre e recolhe, não só o chevron', () => {
    render(<Recolhivel />)
    // O alvo da criança é a faixa, que é muito maior que os 44px do chevron.
    fireEvent.click(screen.getByRole('button', { name: 'Arcade' }))
    expect(screen.getByRole('button', { name: 'Cores' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Cores' }))
    expect(screen.getByRole('button', { name: 'Arcade' })).toBeDefined()
  })

  test('recolhido mostra o assunto no lugar do valor, e troca as ações pelo resumo', () => {
    render(<Recolhivel inicial={false} />)
    // "Cores" (o assunto), não "Arcade" (a paleta escolhida agora).
    expect(screen.getByRole('button', { name: 'Cores' })).toBeDefined()
    expect(screen.getByText('3 cores')).toBeDefined()
    // As ações agiriam num corpo fora de alcance: somem junto.
    expect(screen.queryByRole('button', { name: 'Apagar cor' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Cores' }))
    expect(screen.getByRole('button', { name: 'Apagar cor' })).toBeDefined()
    expect(screen.queryByText('3 cores')).toBeNull()
  })

  test('o título e o chevron apontam para o mesmo corpo, e dizem se está aberto', () => {
    render(<Recolhivel />)
    const titulo = screen.getByRole('button', { name: 'Arcade' })
    const chevron = screen.getByRole('button', { name: 'Recolher Cores' })
    expect(titulo.getAttribute('aria-expanded')).toBe('true')
    expect(chevron.getAttribute('aria-expanded')).toBe('true')
    // O corpo EXISTE mesmo recolhido, então `aria-controls` nunca fica pendurado.
    const corpo = titulo.getAttribute('aria-controls')
    expect(corpo).toBeTruthy()
    expect(chevron.getAttribute('aria-controls')).toBe(corpo)
    fireEvent.click(chevron)
    expect(document.getElementById(corpo as string)?.hasAttribute('hidden')).toBe(true)
  })
})
