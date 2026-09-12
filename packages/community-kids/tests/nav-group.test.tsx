import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NavGroup } from '@/components/kids/app-sidebar'
import { NAV_ITEMS, visibleChildren } from '@/components/kids/nav'

const criar = NAV_ITEMS.find((item) => item.href === '/criar')
if (!criar) throw new Error('sem o item Criar')

afterEach(cleanup)

function montar(aberto: boolean, onToggle: (open: boolean) => void) {
  return render(
    <NavGroup
      item={criar as never}
      filhos={visibleChildren(criar as never, ['estudio-completo', 'pinta'])}
      pathname="/estudio"
      aberto={aberto}
      onToggle={onToggle}
    />,
  )
}

describe('grupo do menu', () => {
  test('o clique no nome avisa que abriu, em vez de navegar', () => {
    // Decisão da dona: o nome do grupo ABRE; a página da seção é o primeiro filho.
    const avisos: boolean[] = []
    montar(false, (open) => avisos.push(open))
    expect(screen.getByText('Criar').closest('a')).toBeNull()
    fireEvent.click(screen.getByText('Criar'))
    expect(avisos).toEqual([true])
  })

  test('fechar por fora NÃO volta como escolha da criança', () => {
    // ⚠️ O anti-vácuo do lote: o navegador dispara `toggle` também quando quem mudou o
    // atributo foi o React (o grupo que fecha porque outro abriu). Sem descartar esse
    // eco, abrir o segundo grupo zerava a escolha e o clique não abria nada.
    const avisos: boolean[] = []
    const view = montar(true, (open) => avisos.push(open))
    view.rerender(
      <NavGroup
        item={criar as never}
        filhos={visibleChildren(criar as never, ['estudio-completo', 'pinta'])}
        pathname="/estudio"
        aberto={false}
        onToggle={(open) => avisos.push(open)}
      />,
    )
    // ⚠️ O happy-dom NÃO dispara o `toggle` quando o atributo muda pelo React, mas o
    // navegador dispara (a spec enfileira a tarefa em qualquer mudança de `open`).
    // Sem simular aqui, este caso passaria com e sem o conserto — um teste que não morde.
    const details = view.container.querySelector('details')
    expect(details?.open).toBe(false)
    if (details) fireEvent(details, new Event('toggle'))
    expect(avisos).toEqual([])
  })

  test('o filho da página atual é o marcado, e o grupo não', () => {
    montar(true, () => {})
    expect(screen.getByRole('link', { name: 'Estúdio' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Criar').getAttribute('aria-current')).toBeNull()
  })
})
