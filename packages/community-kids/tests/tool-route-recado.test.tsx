import { afterEach, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { KidsBand } from '../src/components/kids/kids-band'
import { TOOL_ROUTE_RECADO, ToolRouteRecado } from '../src/components/kids/tool-route-recado'

/**
 * O recado das rotas de ferramenta rola na própria caixa (full review de 11/09/2026). Essas
 * rotas travam a altura na janela e cortam o que passa (`MainContainer`, regime dos apps
 * embarcados), então o produto bloqueado, o posto que falta e o "tente de novo" ficavam com os
 * botões e a faixa lilás cortados, sem jeito de rolar, no celular e em janela baixa.
 *
 * happy-dom não faz layout: o que se trava aqui é o MECANISMO (a classe da caixa, o par com a
 * última faixa) e, pelo texto das páginas, que nenhum recado dessas rotas volte sem a caixa.
 * A rolagem foi medida no navegador, com a conferência das telas.
 */
afterEach(cleanup)

const PAGINAS = [
  'app/(app)/estudio/page.tsx',
  'app/(app)/estudio/pro/[id]/page.tsx',
  'app/(app)/pinta/page.tsx',
  'app/(app)/pensa/page.tsx',
  'app/(app)/molda/page.tsx',
]

const fonte = (relativo: string) =>
  readFileSync(join(import.meta.dir, '..', 'src', relativo), 'utf8')

describe('o recado das rotas de ferramenta rola por dentro', () => {
  it('a caixa rola e ocupa o que sobra do <main> travado', () => {
    const tokens = TOOL_ROUTE_RECADO.split(' ')
    for (const token of ['flex', 'min-h-0', 'flex-1', 'flex-col', 'overflow-y-auto']) {
      expect(tokens).toContain(token)
    }
    render(<ToolRouteRecado screen={() => <p>Ainda não liberado</p>} />)
    const recado = screen.getByText('Ainda não liberado')
    expect(recado.parentElement?.className).toBe(TOOL_ROUTE_RECADO)
  })

  it('no celular a caixa desce por baixo da barra de abas, e a ÚLTIMA faixa devolve o espaço', () => {
    // O par: a caixa reserva 96px (`pb-24`) e desce por baixo da barra (`-mb-24`); a última
    // faixa devolve os 96px e os pinta (`last:-mb-24 last:pb-24`). Mexeu num lado, mexa no outro:
    // sem ele sobram 96px de rolagem à toa, ou a faixa lilás termina antes da barra.
    const tokens = TOOL_ROUTE_RECADO.split(' ')
    for (const token of ['-mb-24', 'pb-24', 'md:mb-0', 'md:pb-0']) {
      expect(tokens).toContain(token)
    }
    const { container } = render(
      <KidsBand tone="lilas">
        <p>fechamento</p>
      </KidsBand>,
    )
    const faixa = (container.firstElementChild as HTMLElement).className.split(' ')
    for (const token of ['last:-mb-24', 'last:pb-24', 'md:last:mb-0', 'md:last:pb-0']) {
      expect(faixa).toContain(token)
    }
  })

  it('nenhuma página de ferramenta devolve um recado sem a caixa', () => {
    let lidas = 0
    for (const pagina of PAGINAS) {
      const src = fonte(pagina)
      expect(src).toContain('export default async function')
      lidas++
      // Um recado solto (`return <KidsLockedPinta />`, também na forma entre parênteses)
      // ficaria direto no <main> travado, que corta sem rolar.
      expect({ pagina, solto: /return\s*\(?\s*<Kids/.test(src) }).toEqual({ pagina, solto: false })
      expect(src).toContain('<ToolRouteRecado screen={')
    }
    // Anti-vácuo: a varredura leu as cinco páginas.
    expect(lidas).toBe(PAGINAS.length)
  })

  it('a varredura MORDE: um recado solto é pego', () => {
    const solto = 'if (!hasAccess) return <KidsLockedPinta />'
    const entreParenteses = 'return (\n    <KidsLockedPinta />\n  )'
    expect(/return\s*\(?\s*<Kids/.test(solto)).toBe(true)
    expect(/return\s*\(?\s*<Kids/.test(entreParenteses)).toBe(true)
    expect(/return\s*\(?\s*<Kids/.test('return <ToolRouteRecado screen={KidsLockedPinta} />')).toBe(
      false,
    )
  })
})
