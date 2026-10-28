import { expect, test } from 'bun:test'
import { criarControle, ligarTeclado } from '../src/controles/controle'
import { aplicarPedido, lerPedido } from '../src/controles/gamepad'

function teclado() {
  const alvo = new EventTarget()
  const enviar = (tipo: string, code: string) =>
    alvo.dispatchEvent(Object.assign(new Event(tipo), { code, repeat: false }))
  return { alvo, enviar }
}

test('soltar o analógico não cancela W ainda pressionado', () => {
  const c = criarControle()
  const t = teclado()
  const desligar = ligarTeclado(c, t.alvo as Window)
  try {
    t.enviar('keydown', 'KeyW')
    const direito = lerPedido({ axes: [1, 0], buttons: [] })
    const solto = lerPedido({ axes: [], buttons: [] })
    aplicarPedido(c, direito, null, () => {})
    expect(c.eixoX).toBe(1)
    aplicarPedido(c, solto, direito, () => {})
    expect(c.eixoX).toBe(0)
    expect(c.eixoZ).toBe(1)
  } finally {
    desligar()
  }
})

test('soltar o pulo no gamepad preserva a barra de espaço pressionada', () => {
  const c = criarControle()
  const t = teclado()
  const desligar = ligarTeclado(c, t.alvo as Window)
  try {
    t.enviar('keydown', 'Space')
    const pulando = lerPedido({ axes: [], buttons: [{ pressed: true, value: 1 }] })
    const solto = lerPedido({ axes: [], buttons: [] })
    aplicarPedido(c, pulando, null, () => {})
    aplicarPedido(c, solto, pulando, () => {})
    expect(c.pular).toBe(true)
    expect(c.pulos).toBe(2)
    t.enviar('keyup', 'Space')
    expect(c.pular).toBe(false)
  } finally {
    desligar()
  }
})

test('desligar o teclado libera somente os seus comandos', () => {
  const c = criarControle()
  const t = teclado()
  const desligar = ligarTeclado(c, t.alvo as Window)
  t.enviar('keydown', 'KeyW')
  t.enviar('keydown', 'Space')
  desligar()
  expect(c.eixoZ).toBe(0)
  expect(c.pular).toBe(false)
})
