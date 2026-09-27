import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { usePensaGuideCollapsed } from '../src/components/kids/use-pensa-guide-collapsed'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const CHAVE = (id: string) => `sz:kids:pensa-guia-recolhido:${id}`

/** Sonda: mostra o valor e deixa o teste acionar o `setCollapsed`. */
function Sonda({ viewerId }: { viewerId: string | null }) {
  const { collapsed, setCollapsed } = usePensaGuideCollapsed(viewerId)
  return (
    <button type="button" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
      seta
    </button>
  )
}

function lido(container: HTMLElement): string | null {
  return container.querySelector('button')?.getAttribute('aria-expanded') ?? null
}

test('a preferência é lida DEPOIS do mount: o primeiro quadro nunca lê o localStorage', () => {
  // ⚠️⚠️ Esta é a regra load-bearing: ler `localStorage` no inicializador do `useState` dá
  // mismatch de hidratação (React #418), e isso já custou caro no modo foco. O preço é o
  // primeiro quadro sair ABERTO mesmo com a preferência gravada — e é por isso que o hook mora
  // nos clients, que montam muito antes dos módulos pesados das ferramentas.
  localStorage.setItem(CHAVE('ana'), '1')
  let container: HTMLElement | null = null
  act(() => {
    container = render(<Sonda viewerId="ana" />).container
  })
  if (!container) throw new Error('sonda esperada')
  // Depois do efeito, já veio recolhido.
  expect(lido(container)).toBe('false')
})

test('recolher grava 1 e ABRIR grava 0: a volta atravessa a sessão', () => {
  // ⚠️ O lado que faltava. Sem ele, um `gravar` que só escrevesse quando `valor` é verdadeiro
  // passaria: a criança recolheria uma vez e nunca mais conseguiria deixar o guia aberto
  // entre sessões (achado do full review de 18/09/2026).
  const { container } = render(<Sonda viewerId="ana" />)
  act(() => {
    container.querySelector('button')?.click()
  })
  expect(localStorage.getItem(CHAVE('ana'))).toBe('1')
  expect(lido(container)).toBe('false')
  act(() => {
    container.querySelector('button')?.click()
  })
  expect(localStorage.getItem(CHAVE('ana'))).toBe('0')
  expect(lido(container)).toBe('true')

  // E a montagem seguinte respeita o '0' (não cai no default por engano).
  cleanup()
  const volta = render(<Sonda viewerId="ana" />)
  expect(lido(volta.container)).toBe('true')
})

test('uma criança NÃO herda o gosto da outra no mesmo navegador', () => {
  // ⚠️ O teste antigo afirmava `getItem('...:outra') === null` sem NUNCA montar com "outra":
  // passaria com o arquivo de produção deletado. Agora a segunda criança é montada de verdade.
  render(<Sonda viewerId="ana" />)
  act(() => {
    document.querySelector('button')?.click()
  })
  expect(localStorage.getItem(CHAVE('ana'))).toBe('1')
  cleanup()
  const outra = render(<Sonda viewerId="bento" />)
  expect(lido(outra.container)).toBe('true')
  expect(localStorage.getItem(CHAVE('bento'))).toBeNull()
})

test('trocar de perfil relê a preferência do perfil novo', () => {
  localStorage.setItem(CHAVE('ana'), '1')
  const view = render(<Sonda viewerId="ana" />)
  expect(lido(view.container)).toBe('false')
  view.rerender(<Sonda viewerId="bento" />)
  expect(lido(view.container)).toBe('true')
})

test('sem perfil, nada é gravado e o guia nasce aberto', () => {
  const { container } = render(<Sonda viewerId={null} />)
  expect(lido(container)).toBe('true')
  act(() => {
    container.querySelector('button')?.click()
  })
  // O estado da sessão muda (a seta responde), mas nada vai para o disco.
  expect(lido(container)).toBe('false')
  expect(Object.keys(localStorage)).toEqual([])
})

test('localStorage indisponível não derruba o guia', () => {
  // Modo privado, cota estourada: o hook cai no padrão e a criança segue desenhando.
  const proto = Object.getPrototypeOf(localStorage)
  const getItem = proto.getItem
  const setItem = proto.setItem
  proto.getItem = () => {
    throw new Error('sem armazenamento')
  }
  proto.setItem = () => {
    throw new Error('sem armazenamento')
  }
  try {
    const { container } = render(<Sonda viewerId="ana" />)
    expect(lido(container)).toBe('true')
    act(() => {
      container.querySelector('button')?.click()
    })
    expect(lido(container)).toBe('false')
  } finally {
    proto.getItem = getItem
    proto.setItem = setItem
  }
})
