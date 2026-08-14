/**
 * A caixa de colisão tirada do DESENHO (08/2026).
 *
 * O pedido nasceu de um caso concreto: uma nave de 128x32 num quadro 128x128
 * levava 96px de vazio para o jogo, e no Estúdio o vazio encostava sem encostar.
 */
import { describe, expect, it } from 'bun:test'
import type { PintaPixelLayer } from '../core/project'
import { createBitmap, createPixelLayer, type PintaBitmap } from '../core/project'
import type { VectorShape } from '../vector/model'
import { pixelSpriteHitbox, vectorSpriteHitbox } from './spriteHitbox'

const CAMADA: PintaPixelLayer[] = [createPixelLayer(0)]

/** Bitmap com um retângulo opaco pintado dentro. */
function pintado(
  w: number,
  h: number,
  caixa: { x: number; y: number; w: number; h: number },
): PintaBitmap {
  const bmp = createBitmap(w, h)
  for (let y = caixa.y; y < caixa.y + caixa.h; y += 1) {
    for (let x = caixa.x; x < caixa.x + caixa.w; x += 1) bmp.data[y * w + x] = 1
  }
  return bmp
}

function rect(caixa: { x: number; y: number; w: number; h: number }): VectorShape {
  return {
    id: `s${caixa.x}-${caixa.y}`,
    type: 'rect',
    ...caixa,
    rx: 0,
    fill: '#ff2121',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }
}

describe('pixelSpriteHitbox', () => {
  it('⭐ a nave deitada num quadro quadrado: a caixa é só a faixa pintada', () => {
    // O caso dela: 128 de largura, 32 de altura, centrada num quadro 128x128.
    const frame = [pintado(128, 128, { x: 0, y: 48, w: 128, h: 32 })]
    expect(pixelSpriteHitbox([frame], CAMADA, 128, 128)).toEqual({
      x: 0,
      y: 0.375,
      w: 1,
      h: 0.25,
    })
  })

  it('⚠️ ANTI-VÁCUO: sem a caixa, o vazio seria 4x a área da nave', () => {
    // Se o cálculo devolvesse o quadro inteiro (ou null por engano), a colisão
    // continuaria sendo 128x128 — a régua que prova que a medição fez algo.
    const caixa = pixelSpriteHitbox(
      [[pintado(128, 128, { x: 0, y: 48, w: 128, h: 32 })]],
      CAMADA,
      128,
      128,
    )
    if (!caixa) throw new Error('a nave deitada TEM que apertar a caixa')
    expect(caixa.w * caixa.h).toBeCloseTo(0.25, 5)
  })

  it('⭐⭐ UNIÃO de todos os quadros: a caixa não pulsa com a animação', () => {
    // ⚠️ O par é de propósito assimétrico: o braço estica para a ESQUERDA num
    // quadro e para a DIREITA no outro. Assim NENHUM quadro sozinho produz a
    // caixa certa — "o primeiro vence" e "o último vence" reprovam junto com
    // "por quadro". Um par que crescesse só para um lado deixaria passar.
    const golpeEsquerda = [pintado(16, 16, { x: 2, y: 4, w: 6, h: 4 })]
    const golpeDireita = [pintado(16, 16, { x: 8, y: 4, w: 6, h: 4 })]
    expect(pixelSpriteHitbox([golpeEsquerda], CAMADA, 16, 16)).toMatchObject({ x: 0.125, w: 0.375 })
    expect(pixelSpriteHitbox([golpeDireita], CAMADA, 16, 16)).toMatchObject({ x: 0.5, w: 0.375 })
    expect(pixelSpriteHitbox([golpeEsquerda, golpeDireita], CAMADA, 16, 16)).toMatchObject({
      x: 0.125,
      w: 0.75,
    })
  })

  it('desenho que PREENCHE o quadro não declara caixa (payload igual ao de antes)', () => {
    const cheio = [pintado(16, 16, { x: 0, y: 0, w: 16, h: 16 })]
    expect(pixelSpriteHitbox([cheio], CAMADA, 16, 16)).toBeNull()
  })

  it('quadro em branco não declara caixa', () => {
    expect(pixelSpriteHitbox([[createBitmap(16, 16)]], CAMADA, 16, 16)).toBeNull()
    expect(pixelSpriteHitbox([], CAMADA, 16, 16)).toBeNull()
  })

  it('⚠️ camada ESCONDIDA não conta — a colisão segue o que se vê', () => {
    const escondida: PintaPixelLayer[] = [{ ...createPixelLayer(0), visible: false }]
    const frame = [pintado(16, 16, { x: 2, y: 2, w: 4, h: 4 })]
    expect(pixelSpriteHitbox([frame], escondida, 16, 16)).toBeNull()
  })

  it('a fração cabe no quadro mesmo com o desenho encostado na borda', () => {
    const canto = [pintado(16, 16, { x: 12, y: 12, w: 4, h: 4 })]
    const caixa = pixelSpriteHitbox([canto], CAMADA, 16, 16)
    if (!caixa) throw new Error('caixa esperada')
    expect(caixa.x + caixa.w).toBeLessThanOrEqual(1)
    expect(caixa.y + caixa.h).toBeLessThanOrEqual(1)
    expect(caixa).toEqual({ x: 0.75, y: 0.75, w: 0.25, h: 0.25 })
  })
})

describe('vectorSpriteHitbox', () => {
  it('mede as formas VISÍVEIS, em fração do quadro', () => {
    const frame: VectorShape[] = [rect({ x: 16, y: 32, w: 32, h: 16 })]
    expect(vectorSpriteHitbox([frame], 64, 64)).toEqual({
      x: 0.25,
      y: 0.5,
      w: 0.5,
      h: 0.25,
    })
  })

  it('forma ESCONDIDA fica de fora', () => {
    const visivel = rect({ x: 16, y: 16, w: 16, h: 16 })
    const oculta: VectorShape = { ...rect({ x: 0, y: 0, w: 64, h: 64 }), id: 'o', hidden: true }
    const caixa = vectorSpriteHitbox([[visivel, oculta]], 64, 64)
    expect(caixa).toEqual({ x: 0.25, y: 0.25, w: 0.25, h: 0.25 })
  })

  it('quadro vetorial vazio não declara caixa', () => {
    expect(vectorSpriteHitbox([[]], 64, 64)).toBeNull()
  })

  it('⭐⭐ a forma GIRADA cresce a caixa (o svg.ts renderiza o rotate)', () => {
    // Achado do full review: `shapeBounds` ignora a rotação e o `svg.ts` a
    // desenha. Uma espada girada 45 graus ficava com caixa ~30% menor que o
    // desenho, e o golpe passava por dentro do inimigo.
    const reto: VectorShape[] = [rect({ x: 16, y: 24, w: 32, h: 16 })]
    const girado: VectorShape[] = [{ ...rect({ x: 16, y: 24, w: 32, h: 16 }), rotation: 45 }]
    const semGiro = vectorSpriteHitbox([reto], 64, 64)
    const comGiro = vectorSpriteHitbox([girado], 64, 64)
    if (!semGiro || !comGiro) throw new Error('caixas esperadas')
    // 32x16 a 45 graus ocupa (32+16)/√2 ≈ 33,94 nos dois eixos.
    expect(comGiro.w * 64).toBeCloseTo(33.94, 1)
    expect(comGiro.h * 64).toBeCloseTo(33.94, 1)
    // ⚠️ ANTI-VÁCUO: a caixa CRESCEU na altura (16 → 33,94) e o centro não andou.
    expect(comGiro.h).toBeGreaterThan(semGiro.h)
    expect(comGiro.x + comGiro.w / 2).toBeCloseTo(semGiro.x + semGiro.w / 2, 5)
    expect(comGiro.y + comGiro.h / 2).toBeCloseTo(semGiro.y + semGiro.h / 2, 5)
  })

  it('girar 180 graus não muda a caixa; 90 troca os lados', () => {
    const meia: VectorShape[] = [{ ...rect({ x: 16, y: 24, w: 32, h: 16 }), rotation: 180 }]
    const quarto: VectorShape[] = [{ ...rect({ x: 16, y: 24, w: 32, h: 16 }), rotation: 90 }]
    expect(vectorSpriteHitbox([meia], 64, 64)).toEqual(
      vectorSpriteHitbox([[rect({ x: 16, y: 24, w: 32, h: 16 })]], 64, 64),
    )
    const q = vectorSpriteHitbox([quarto], 64, 64)
    expect([q?.w, q?.h]).toEqual([0.25, 0.5])
  })

  it('⭐ a mesma UNIÃO vale no vetor', () => {
    const a: VectorShape[] = [rect({ x: 16, y: 16, w: 16, h: 16 })]
    const b: VectorShape[] = [rect({ x: 32, y: 16, w: 16, h: 16 })]
    expect(vectorSpriteHitbox([a, b], 64, 64)).toEqual({
      x: 0.25,
      y: 0.25,
      w: 0.5,
      h: 0.25,
    })
  })
})
