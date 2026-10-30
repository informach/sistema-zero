import assert from 'node:assert/strict'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { AcessoSchema, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { criarControle } from '../../src/controles/controle'
import { abrirAbertura, lerAberturaVista } from '../../src/estado/abertura'
import { Contexto, type ContextoDoJogo, criarMovimento } from '../../src/estado/contexto'
import { criarLoja } from '../../src/estado/loja'
import { Abertura } from '../../src/interface/abertura'
import { criarRegistro } from '../../src/mundo/interativos'
import { criarPlataformaFalsa } from '../../src/plataforma/falsa'
import {
  chaveDaAbertura,
  PAINEL_DA_ABERTURA,
  SAIDA_DA_ABERTURA_MS,
} from '../../src/sistemas/abertura'

GlobalRegistrator.register()
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
const plataforma = criarPlataformaFalsa()
const loja = criarLoja({
  salvamento: criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z')),
  jornada: 1,
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
const host = document.createElement('div')
document.body.append(host)
const root = createRoot(host)
async function montar() {
  await act(async () =>
    root.render(
      <StrictMode>
        <Contexto.Provider value={contexto}>
          <Abertura />
        </Contexto.Provider>
      </StrictMode>,
    ),
  )
}
async function desmontar() {
  await act(async () => root.render(null))
}
try {
  abrirAbertura(loja, 'primeira')
  await montar()
  await desmontar()
  assert.equal(
    lerAberturaVista(plataforma.publico, plataforma.perfil.id),
    false,
    'desmontar a página antes de terminar não significa ter visto a abertura',
  )
  assert.equal(loja.getState().dica, null)

  abrirAbertura(loja, 'primeira')
  await montar()
  // O fechamento explícito por Esc é a transição do painel para null no HUD real.
  await act(async () => loja.getState().abrirPainel(null))
  await desmontar()
  assert.equal(lerAberturaVista(plataforma.publico, plataforma.perfil.id), true)
  assert.ok(loja.getState().dica?.texto.startsWith('Oi,'))

  for (const motivo of ['tempoPausado', 'tempoAcabou', 'conflito'] as const) {
    localStorage.removeItem(chaveDaAbertura(plataforma.publico, plataforma.perfil.id))
    abrirAbertura(loja, 'primeira')
    await montar()
    await act(async () =>
      loja.setState({
        painelAberto: null,
        tempoPausado: motivo === 'tempoPausado',
        tempoAcabou: motivo === 'tempoAcabou',
        salvamentoSituacao: motivo === 'conflito' ? 'conflito' : 'ok',
      }),
    )
    await desmontar()
    assert.equal(lerAberturaVista(plataforma.publico, plataforma.perfil.id), false, motivo)
    loja.setState({ tempoPausado: false, tempoAcabou: false, salvamentoSituacao: 'ok' })
  }

  abrirAbertura(loja, 'rever')
  await montar()
  const pular = host.querySelector<HTMLButtonElement>('.arq-abertura-pular')
  assert.ok(pular)
  await act(async () => pular.click())
  await desmontar()
  abrirAbertura(loja, 'rever')
  await act(async () => {
    await new Promise((r) => setTimeout(r, SAIDA_DA_ABERTURA_MS + 100))
  })
  assert.equal(
    loja.getState().painelAberto,
    PAINEL_DA_ABERTURA,
    'o timer de uma abertura descartada não pode fechar uma nova abertura',
  )
  console.log('PASS descarte, fechamento explícito e timer encerrado')
} finally {
  await act(async () => root.unmount())
  await GlobalRegistrator.unregister()
}
