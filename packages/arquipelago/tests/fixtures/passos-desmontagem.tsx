import { setSystemTime } from 'bun:test'
import assert from 'node:assert/strict'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { AcessoSchema, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { criarControle } from '../../src/controles/controle'
import { Contexto, type ContextoDoJogo, criarMovimento } from '../../src/estado/contexto'
import { criarLoja } from '../../src/estado/loja'
import { guiaDoZappy, lojaDosPassos } from '../../src/estado/primeiros-passos'
import { PrimeirosPassos } from '../../src/interface/primeiros-passos'
import { criarRegistro } from '../../src/mundo/interativos'
import { criarPlataformaFalsa } from '../../src/plataforma/falsa'

GlobalRegistrator.register()
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
const plataforma = criarPlataformaFalsa()
const loja = criarLoja({
  salvamento: criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z')),
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
const passos = lojaDosPassos(loja, plataforma)
passos.setState({
  situacao: 'andando',
  indice: 0,
  aberta: true,
  fila: [{ id: 'quadro', rever: true }],
})
const host = document.createElement('div')
const root = createRoot(host)
async function montar() {
  await act(async () =>
    root.render(
      <StrictMode>
        <Contexto.Provider value={contexto}>
          <PrimeirosPassos />
        </Contexto.Provider>
      </StrictMode>,
    ),
  )
}
const progresso = () => {
  const s = passos.getState()
  return {
    situacao: s.situacao,
    indice: s.indice,
    fase: s.fase,
    fila: s.fila,
    obraPendente: s.obraPendente,
  }
}
try {
  setSystemTime(new Date('2026-10-30T12:00:00Z'))
  await montar()
  assert.equal(passos.getState().tela.cartao, true)
  await act(async () => loja.getState().dizer('A ponte ficou pronta.'))
  assert.ok(host.textContent?.includes('A ponte ficou pronta.'))
  const antes = structuredClone(progresso())
  const salvo = JSON.stringify(loja.getState().salvamento)
  await act(async () => root.render(null))
  assert.deepEqual(passos.getState().tela, { anel: null, dica: false, cartao: false })
  assert.equal(guiaDoZappy(loja).alvo, null)
  assert.equal(guiaDoZappy(loja).circulo, null)
  assert.deepEqual(progresso(), antes, 'desmontar não conclui nem apaga a fila')
  assert.equal(JSON.stringify(loja.getState().salvamento), salvo)
  setSystemTime(new Date('2026-10-30T12:00:08Z'))
  await montar()
  assert.equal(passos.getState().tela.cartao, true)
  assert.deepEqual(progresso(), antes, 'remontar retoma a mesma fala e fila')
  assert.ok(
    !host.textContent?.includes('A ponte ficou pronta.'),
    'recado vencido não ganha novo prazo ao voltar',
  )
  await act(async () => loja.getState().dizer('Uma fala nova.'))
  assert.ok(host.textContent?.includes('Uma fala nova.'), 'um novo recado continua aparecendo')
  console.log('PASS retomada, fila e salvamento preservados')
} finally {
  await act(async () => root.unmount())
  setSystemTime()
  GlobalRegistrator.unregister()
}
