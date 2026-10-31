import { beforeEach, expect, test } from 'bun:test'
import { criarSalvamentoInicial, type Plataforma } from '@sistemazero/arquipelago-contracts'
import { criarLoja } from '../src/estado/loja'
import {
  arrumarOQuarto,
  esquecerLeiturasDoQuarto,
  FALA_DO_QUARTO_FECHADO,
  RELER_O_QUARTO_A_CADA_MS,
  relerOQuarto,
} from '../src/estado/quarto'
import { criarPlataformaFalsa, QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'

/** O quarto nos dois sentidos (§6.28, A10). */

const AGORA = new Date('2026-10-31T12:00:00Z')

function lojaDoQuarto(somenteLeitura = false) {
  return criarLoja({
    salvamento: criarSalvamentoInicial(AGORA),
    jornada: 2,
    quarto: QUARTO_DE_EXEMPLO,
    avatar: {} as never,
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      contabilizaTempo: false,
      ...(somenteLeitura ? { somenteLeitura: true } : {}),
    },
    aoMudar: () => {},
  })
}

beforeEach(() => esquecerLeiturasDoQuarto())

test('o quarto mudado na plataforma aparece no jogo, sem reler a cada passo', async () => {
  const loja = lojaDoQuarto()
  const p = criarPlataformaFalsa({ persistir: false, agora: () => AGORA })
  const novo = { ...QUARTO_DE_EXEMPLO, pet: 'pet-cachorro', floor: 'piso-azul' }
  await p.salvarQuarto(novo)
  await relerOQuarto(loja, p, 1000)
  expect(loja.getState().quarto).toEqual(novo)

  await p.salvarQuarto({ ...novo, pet: 'pet-gato' })
  await relerOQuarto(loja, p, 1000 + RELER_O_QUARTO_A_CADA_MS - 1)
  expect(loja.getState().quarto.pet).toBe('pet-cachorro')
  await relerOQuarto(loja, p, 1000 + RELER_O_QUARTO_A_CADA_MS)
  expect(loja.getState().quarto.pet).toBe('pet-gato')
})

test('um quarto estranho vindo da plataforma não estraga o que o jogo tem', async () => {
  const loja = lojaDoQuarto()
  const p = criarPlataformaFalsa({ persistir: false, agora: () => AGORA })
  const estranha = {
    ...p,
    lerQuarto: async () => ({ placedItems: 'nada' }),
  } as unknown as Plataforma
  await relerOQuarto(loja, estranha, 1000)
  expect(loja.getState().quarto).toEqual(QUARTO_DE_EXEMPLO)
})

test('arrumar no jogo abre o editor da plataforma e traz o quarto de volta', async () => {
  const loja = lojaDoQuarto()
  const p = criarPlataformaFalsa({ persistir: false, agora: () => AGORA })
  const antes = QUARTO_DE_EXEMPLO.placedItems[0]!.rot ?? 0
  await arrumarOQuarto(loja, p)
  expect(loja.getState().quarto.placedItems[0]!.rot).toBe(((antes + 1) % 4) as 0 | 1 | 2 | 3)
  expect(loja.getState().ferramentaAberta).toBe(false)
  // A plataforma guardou o mesmo quarto que o jogo mostra.
  expect(await p.lerQuarto()).toEqual(loja.getState().quarto)
})

test('quando o editor não abre, o Zappy avisa e o quarto fica como estava', async () => {
  const loja = lojaDoQuarto()
  const p = criarPlataformaFalsa({ persistir: false, agora: () => AGORA })
  const fechada = {
    ...p,
    abrirFerramenta: async () => ({ situacao: 'indisponivel', motivo: 'rede' }) as const,
  } as Plataforma
  await arrumarOQuarto(loja, fechada)
  expect(loja.getState().quarto).toEqual(QUARTO_DE_EXEMPLO)
  expect(JSON.stringify(loja.getState())).toContain(FALA_DO_QUARTO_FECHADO)
  expect(FALA_DO_QUARTO_FECHADO).not.toMatch(/[—!]/)
})

test('quem só olha não arruma o quarto', async () => {
  const loja = lojaDoQuarto(true)
  let abriu = false
  const p = criarPlataformaFalsa({ persistir: false, agora: () => AGORA })
  const espia = {
    ...p,
    abrirFerramenta: async (pedido: Parameters<Plataforma['abrirFerramenta']>[0]) => {
      abriu = true
      return p.abrirFerramenta(pedido)
    },
  } as Plataforma
  await arrumarOQuarto(loja, espia)
  expect(abriu).toBe(false)
})
