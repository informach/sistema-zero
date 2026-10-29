import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  writable: true,
  configurable: true,
})
const React = await import('react')
const { act } = React
const { createRoot } = await import('react-dom/client')
const { PintaArtSlotFields, StudioArtSlotsFields } = await import(
  '../src/components/editor/art-slot-fields'
)

/** Os campos das vagas de arte nos blocos de Pinta e de Estúdio (etapa 6). */

async function montar(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  return { container, root }
}

function mudar(el: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set?.call(el, value)
  el.dispatchEvent(
    new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
  )
}

test('Pinta: ligar a vaga, escolher a imagem do jogo e o nome é sugerido', async () => {
  let estado = { name: '', replaces: '' }
  const render = () =>
    React.createElement(PintaArtSlotFields, {
      name: estado.name,
      replaces: estado.replaces,
      gameImages: ['chave-dourada', 'farol'],
      onChange: (next: typeof estado) => {
        estado = next
      },
    })
  const { container, root } = await montar(render())
  const caixa = container.querySelector('input[type="checkbox"]') as HTMLInputElement
  expect(container.querySelector('select') === null).toBe(true)
  await act(async () => caixa.click())
  await act(async () => root.render(render()))
  const select = container.querySelector('select') as HTMLSelectElement
  expect([...select.options].map((o) => o.textContent)).toEqual([
    'Nenhuma',
    'chave-dourada',
    'farol',
    'Outra imagem (digitar o nome)',
  ])
  await act(async () => mudar(select, 'chave-dourada'))
  expect(estado).toEqual({ name: 'minha-chave', replaces: 'chave-dourada' })

  // Desligar a vaga limpa os dois campos.
  await act(async () => root.render(render()))
  await act(async () =>
    (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click(),
  )
  expect(estado).toEqual({ name: '', replaces: '' })
  await act(async () => root.unmount())
})

test('Pinta: o nome da vaga é normalizado ao sair do campo', async () => {
  let estado = { name: 'Minha Chave!', replaces: '' }
  const { container, root } = await montar(
    React.createElement(PintaArtSlotFields, {
      name: estado.name,
      replaces: estado.replaces,
      gameImages: [],
      onChange: (next: typeof estado) => {
        estado = next
      },
    }),
  )
  const campo = container.querySelector('input[placeholder="ex.: minha-chave"]') as HTMLInputElement
  await act(async () => {
    campo.focus()
    campo.blur()
  })
  expect(estado.name).toBe('minha-chave')
  await act(async () => root.unmount())
})

test('Estúdio: importa as vagas desta aula, escolhe o modo e acrescenta de outra aula', async () => {
  let estado: { name: string; mode: 'add' | 'replace' }[] = []
  const render = () =>
    React.createElement(StudioArtSlotsFields, {
      value: estado,
      candidates: [{ name: 'minha-chave', replaces: 'chave-dourada' }],
      onChange: (next: typeof estado) => {
        estado = next
      },
    })
  const { container, root } = await montar(render())
  expect(container.textContent).toContain('substitui chave-dourada')
  const marcar = container.querySelector('li input[type="checkbox"]') as HTMLInputElement
  await act(async () => marcar.click())
  expect(estado).toEqual([{ name: 'minha-chave', mode: 'add' }])

  await act(async () => root.render(render()))
  const modo = container.querySelector(
    'select[aria-label="Como o desenho minha-chave entra no jogo"]',
  ) as HTMLSelectElement
  await act(async () => mudar(modo, 'replace'))
  expect(estado).toEqual([{ name: 'minha-chave', mode: 'replace' }])

  await act(async () => root.render(render()))
  const outra = container.querySelector('input[placeholder="ex.: minha-chave"]') as HTMLInputElement
  await act(async () => mudar(outra, 'Meu Farol'))
  const botao = [...container.querySelectorAll('button')].find(
    (b) => b.textContent === 'Acrescentar vaga',
  ) as HTMLButtonElement
  await act(async () => botao.click())
  expect(estado).toEqual([
    { name: 'minha-chave', mode: 'replace' },
    { name: 'meu-farol', mode: 'add' },
  ])
  await act(async () => root.render(render()))
  expect(container.textContent).toContain('de outra aula')
  await act(async () => root.unmount())
})
