import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { PAINEL_DO_CADERNO } from '../src/estado/cartas'
import { criarLoja } from '../src/estado/loja'
import { PAINEL_DAS_VISITAS_ADULTAS } from '../src/estado/visitas-adultas'
import { PAINEL_DO_ALBUM } from '../src/interface/album'
import { PAINEL_DO_DIARIO } from '../src/interface/diario'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { PAINEL_DO_MAPA } from '../src/sistemas/mapa'
import { PAINEIS_DO_MENU } from '../src/sistemas/paineis-do-menu'
import { PAINEL_DAS_VISITAS } from '../src/sistemas/visitas'
import { PAINEL_DOS_CONVIDADOS } from '../src/sistemas/visitas-dos-moradores'

/**
 * Os painéis do menu abrem dentro dele (31/10/2026, pedido da dona): diário, álbum, caderno, mapa,
 * moradores em casa e visitas viram seções do menu, de onde quer que sejam pedidos.
 */
function montar() {
  return criarLoja({
    salvamento: criarSalvamentoInicial(new Date()),
    jornada: 2,
    quarto: QUARTO_DE_EXEMPLO,
    avatar: { modelo: null } as never,
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      contabilizaTempo: false,
    },
    aoMudar: () => {},
  })
}

const DO_MENU = [
  PAINEL_DO_DIARIO,
  PAINEL_DO_ALBUM,
  PAINEL_DO_CADERNO,
  PAINEL_DO_MAPA,
  PAINEL_DOS_CONVIDADOS,
  PAINEL_DAS_VISITAS,
  PAINEL_DAS_VISITAS_ADULTAS,
]

test('a lista dos painéis do menu é a dos painéis de cada um', () => {
  expect([...PAINEIS_DO_MENU].sort()).toEqual([...DO_MENU].sort())
})

test('pedir um painel do menu abre o menu nessa seção; fechar o menu volta ao começo', () => {
  const loja = montar()
  for (const painel of DO_MENU) {
    loja.getState().abrirPainel(painel)
    expect(loja.getState()).toMatchObject({
      menuAberto: true,
      secaoDoMenu: painel,
      painelAberto: null,
    })
    loja.getState().abrirMenu(false)
    expect(loja.getState()).toMatchObject({ menuAberto: false, secaoDoMenu: null })
  }
})

test('os outros painéis continuam por cima do jogo', () => {
  const loja = montar()
  loja.getState().abrirPainel('feira-da-vila')
  expect(loja.getState()).toMatchObject({ menuAberto: false, painelAberto: 'feira-da-vila' })
})
