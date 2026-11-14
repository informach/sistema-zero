import assert from 'node:assert/strict'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { AcessoSchema, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { criarControle } from '../../src/controles/controle'
import { Contexto, type ContextoDoJogo, criarMovimento } from '../../src/estado/contexto'
import { criarLoja } from '../../src/estado/loja'
import { createCasaMoradaStore, PAINEL_DA_MORADA } from '../../src/estado/morada'
import { Relogios } from '../../src/estado/relogios'
import { criarRegistro } from '../../src/mundo/interativos'
import { criarPlataformaFalsa } from '../../src/plataforma/falsa'

GlobalRegistrator.register()
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
const plataforma = criarPlataformaFalsa()
const initial = criarSalvamentoInicial(new Date('2026-11-14T12:00:00Z'))
initial.necessidades.energia = 50
const loja = criarLoja({
  salvamento: initial,
  jornada: 8,
  quarto: await plataforma.lerQuarto(),
  avatar: await plataforma.lerAvatar(),
  acesso: AcessoSchema.parse((await plataforma.servico.buscar('/acesso')).corpo),
  aoMudar() {},
})
const contexto: ContextoDoJogo = {
  loja,
  plataforma,
  gerenteTempo: null,
  controle: criarControle(),
  interativos: criarRegistro(),
  rastro: {
    x: 0,
    y: 0,
    z: 0,
    giro: 0,
    inclinacao: 0,
    direcao: 0,
    velocidade: 0,
    zappy: { x: 0, y: 0, z: 0 },
  },
  ambiente: { luz: 1, noite: false },
  pedidos: { teleporte: null, chaoChegando: new Set(), olharPara: null, conversa: null },
  movimento: criarMovimento(),
}
const realSet = globalThis.setInterval
const realClear = globalThis.clearInterval
const callbacks = new Map<number, () => void>()
let nextId = 1
const intervals = new Map<number, number>()
// Only the clock boundary is controlled: the real component and actual game store run unchanged.
Reflect.set(globalThis, 'setInterval', (callback: () => void, period: number) => {
  const id = nextId++
  callbacks.set(id, callback)
  intervals.set(period, id)
  return id
})
Reflect.set(globalThis, 'clearInterval', (id: number) => callbacks.delete(id))
const root = createRoot(document.createElement('div'))
try {
  await act(async () =>
    root.render(
      <Contexto.Provider value={contexto}>
        <Relogios />
      </Contexto.Provider>,
    ),
  )
  const tick = () => {
    const callback = callbacks.get(intervals.get(1000)!)
    assert.ok(callback)
    callback()
  }
  loja.setState({ painelAberto: PAINEL_DA_MORADA, descanso: 'sentar' })
  tick()
  tick()
  assert.ok(
    loja.getState().salvamento.necessidades.energia > 50,
    'painel Morada permite o benefício real do descanso',
  )
  const before = loja.getState().salvamento.necessidades.energia
  loja.setState({ menuAberto: true })
  tick()
  tick()
  assert.equal(loja.getState().salvamento.necessidades.energia, before, 'menu pausa energia')
  loja.setState({ menuAberto: false, descanso: 'deitar' })
  loja.getState().mudar((s) => ({ ...s, necessidades: { ...s.necessidades, energia: 99 } }))
  tick()
  tick()
  assert.equal(loja.getState().salvamento.necessidades.energia, 100)
  assert.equal(loja.getState().descanso, null, 'soneca cheia nativa levanta')
  assert.equal(
    contexto.movimento.pedido,
    null,
    'não deixa pedido para o corpo da ilha consumir depois',
  )
  const casa = createCasaMoradaStore(loja, plataforma, null)
  await casa.getState().enter()
  loja.setState({ descanso: 'sentar' })
  casa.getState().setEditing(true)
  assert.equal(loja.getState().descanso, null, 'construir encerra benefício de descanso')
  casa.getState().setEditing(false)
  loja.setState({ descanso: 'deitar' })
  await casa.getState().close()
  assert.equal(loja.getState().descanso, null, 'voltar à ilha encerra o descanso nativo')
  console.log('PASS relógio real, soneca cheia, pausa e saída Morada')
} finally {
  await act(async () => root.unmount())
  globalThis.setInterval = realSet
  globalThis.clearInterval = realClear
  await GlobalRegistrator.unregister()
}
