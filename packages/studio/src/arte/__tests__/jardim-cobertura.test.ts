import { describe, expect, test } from 'bun:test'
import {
  JARDIM_ASSETS,
  JARDIM_BICHOS,
  JARDIM_ESCONDERIJOS,
  type JardimBicho,
  type JardimEsconderijo,
  jardimSpriteRect,
} from '../jardim-assets'
import { caixaDasFormas, lerFormas, mascara } from './silhuetaSvg'

/**
 * ⭐⭐ A regra do Cadê Todo Mundo? que não pode falhar: QUALQUER esconderijo cobre QUALQUER bicho
 * por inteiro, na silhueta, quando os dois estão no mesmo `centroX` e cada um no Y do seu tipo.
 * É isso que deixa a criança trocar a imagem de um sprite sem um bichinho aparecer antes da hora.
 *
 * A conta é feita numa grade de meio pixel, no tamanho do jogo, e exige folga: o bicho, engordado
 * em 1,5 px para todo lado, ainda tem de caber no que o esconderijo pinta (o navegador suaviza a
 * borda e pode desenhar em meio pixel). Conferido também no Chromium em 05/10/2026: 0 pixel fora
 * nos 42 pares, com folga mínima de 3 px.
 */
const PASSO = 0.5
const FOLGA_PX = 1.5

function grade() {
  const e = jardimSpriteRect(JARDIM_ESCONDERIJOS[0], 0)
  return { x0: e.x, y0: e.y, colunas: e.w / PASSO, linhas: e.h / PASSO, passo: PASSO }
}

const G = grade()
const mascaras = new Map<string, Uint8Array>()
function mascaraDe(
  nome: JardimBicho | JardimEsconderijo,
  sprite: { viewBox: string; body: string } = JARDIM_ASSETS[nome],
) {
  const chave = `${nome}|${sprite.viewBox}|${sprite.body}`
  let m = mascaras.get(chave)
  if (!m) {
    m = mascara(sprite, jardimSpriteRect(nome, 0), G)
    mascaras.set(chave, m)
  }
  return m
}

/** Quantos pontos do bicho (engordado pela folga) ficam fora do que o esconderijo pinta. */
function pontosDeFora(bicho: Uint8Array, esconderijo: Uint8Array, deslocamentoY = 0) {
  const raio = Math.round(FOLGA_PX / PASSO)
  const dy0 = Math.round(deslocamentoY / PASSO)
  let fora = 0
  for (let j = 0; j < G.linhas; j++)
    for (let i = 0; i < G.colunas; i++) {
      if (!bicho[j * G.colunas + i]) continue
      for (let dy = -raio; dy <= raio; dy++)
        for (let dx = -raio; dx <= raio; dx++) {
          const ii = i + dx
          const jj = j + dy + dy0
          if (
            ii < 0 ||
            jj < 0 ||
            ii >= G.colunas ||
            jj >= G.linhas ||
            !esconderijo[jj * G.colunas + ii]
          )
            fora++
        }
    }
  return fora
}

describe('todo esconderijo cobre todo bicho', () => {
  test('a caixa do esconderijo contém a do bicho, com o mesmo centroX', () => {
    for (const b of JARDIM_BICHOS)
      for (const e of JARDIM_ESCONDERIJOS)
        for (const centroX of [137, 310, 483, 200.5]) {
          const rb = jardimSpriteRect(b, centroX)
          const re = jardimSpriteRect(e, centroX)
          expect(re.x).toBeLessThanOrEqual(rb.x)
          expect(re.y).toBeLessThanOrEqual(rb.y)
          expect(re.x + re.w).toBeGreaterThanOrEqual(rb.x + rb.w)
          expect(re.y + re.h).toBeGreaterThanOrEqual(rb.y + rb.h)
        }
  })

  test('os 42 pares, pela silhueta e com folga: nenhum ponto do bicho escapa', () => {
    const falhas: string[] = []
    let pares = 0
    for (const b of JARDIM_BICHOS)
      for (const e of JARDIM_ESCONDERIJOS) {
        pares++
        const fora = pontosDeFora(mascaraDe(b), mascaraDe(e))
        if (fora) falhas.push(`${b} atrás de ${e}: ${fora} pontos de fora`)
      }
    expect(pares).toBe(42)
    expect(falhas).toEqual([])
  })

  test('anti-vácuo: os bichos têm desenho de verdade na grade', () => {
    for (const b of JARDIM_BICHOS) {
      const pintados = mascaraDe(b).reduce((s, v) => s + v, 0) * PASSO * PASSO
      // o menor (a tartaruga) pinta ~1.540 px²; um desenho que sumisse passaria em tudo
      expect(pintados).toBeGreaterThan(1000)
    }
  })

  test('a régua MORDE: com o bicho 40 px mais alto, todo esconderijo deixa escapar', () => {
    for (const e of JARDIM_ESCONDERIJOS)
      expect(pontosDeFora(mascaraDe('coelho'), mascaraDe(e), -40)).toBeGreaterThan(0)
  })

  test('sem a folhagem de trás, a coruja aparece entre as tulipas (era assim até 05/10/2026)', () => {
    const flores = JARDIM_ASSETS.flores
    const folhagem = flores.body.match(/^<path [^>]*fill="#1b555b"\/>/)?.[0]
    expect(folhagem).toBeDefined()
    const semFolhagem = { ...flores, body: flores.body.slice(folhagem?.length ?? 0).trim() }
    expect(pontosDeFora(mascaraDe('coruja'), mascaraDe('flores', semFolhagem))).toBeGreaterThan(0)
    expect(pontosDeFora(mascaraDe('coruja'), mascaraDe('flores'))).toBe(0)
  })

  test('com o arbusto no tamanho antigo (3,5 px por unidade), a coruja escapa pelos lados', () => {
    const antigo = { ...JARDIM_ASSETS.arbusto, viewBox: '8.95 9.928 46 41.143' }
    expect(pontosDeFora(mascaraDe('coruja'), mascaraDe('arbusto', antigo))).toBeGreaterThan(0)
  })
})

describe('cada desenho centralizado na caixa, apoiado na mesma linha', () => {
  /** A caixa do que é pintado, em pixels da caixa do sprite. */
  function caixaPintada(nome: JardimBicho | JardimEsconderijo) {
    const { viewBox, body, width, height } = JARDIM_ASSETS[nome]
    const [vx, vy, vw, vh] = viewBox.split(' ').map(Number) as [number, number, number, number]
    const escala = Math.min(width / vw, height / vh)
    const ox = (width - vw * escala) / 2
    const oy = (height - vh * escala) / 2
    const u = caixaDasFormas(lerFormas(body))
    return {
      x0: ox + (u.x0 - vx) * escala,
      x1: ox + (u.x1 - vx) * escala,
      y0: oy + (u.y0 - vy) * escala,
      y1: oy + (u.y1 - vy) * escala,
      largura: width,
      altura: height,
    }
  }

  for (const [tipo, nomes] of [
    ['bichos', JARDIM_BICHOS],
    ['esconderijos', JARDIM_ESCONDERIJOS],
  ] as const) {
    test(`${tipo}: nada é cortado, o meio do desenho é o meio da caixa e a base é uma só`, () => {
      const bases: number[] = []
      for (const nome of nomes) {
        const c = caixaPintada(nome)
        expect(c.x0, nome).toBeGreaterThanOrEqual(1)
        expect(c.y0, nome).toBeGreaterThanOrEqual(1)
        expect(c.x1, nome).toBeLessThanOrEqual(c.largura - 1)
        expect(c.y1, nome).toBeLessThanOrEqual(c.altura - 1)
        expect(Math.abs((c.x0 + c.x1) / 2 - c.largura / 2), nome).toBeLessThan(0.75)
        bases.push(c.y1)
      }
      expect(Math.max(...bases) - Math.min(...bases)).toBeLessThan(1)
    })
  }
})
