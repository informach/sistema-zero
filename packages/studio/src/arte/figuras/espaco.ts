import type { CaixaDaFigura, DesenhoDeFigura } from '../pincel'

/**
 * As figuras do ESPAÇO, portadas do `runtime/arcadeKitsSpace.ts` e do `runtime/worldGroups.ts`.
 * Porte verbatim; o que era global virou parâmetro (ver o cabeçalho de `correDino.ts`).
 */

/** A nave do Desafio: 54 por 62, como o palco de cena sempre a desenhou. */
export const CAIXA_DA_NAVE: CaixaDaFigura = { w: 54, h: 62 }
/** O asteroide de fábrica (`spawnAsteroid`, `size` 36 antes do sorteio de variedade). */
export const CAIXA_DO_ASTEROIDE: CaixaDaFigura = { w: 36, h: 36 }
/** O tiro: a bolinha de luz que a criança monta no Dia 2. */
export const CAIXA_DO_TIRO: CaixaDaFigura = { w: 18, h: 18 }
/** A chama: a altura de uma figura de papel do elenco. */
export const CAIXA_DA_CHAMA: CaixaDaFigura = { w: 44, h: 62 }

/**
 * Desenha a nave centrada na caixa do sprite, na escala da largura (w=54 => 1:1
 * com o desenho de referência). O foguinho pulsa com o tempo (animação embutida);
 * o corpo usa a cor "body" e as asas a cor "wings"; cabine fixa.
 */
export const desenharNave: DesenhoDeFigura = (ctx, f, amb) => {
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  // Escala para a nave INTEIRA (ponta de asa a ponta de asa = 96 no desenho de
  // referência) caber na largura da caixa — assim ela fica proporcional aos
  // outros objetos (não estoura a própria caixa) e a colisão bate com o visual.
  const s = (f.w || 54) / 96
  const oy = -17 // desloca o desenho de referência p/ centralizar na caixa
  const flame = 22 + Math.sin(amb.t * 0.015) * 5
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  // foguinho (laranja)
  ctx.fillStyle = '#ffb13b'
  ctx.beginPath()
  ctx.moveTo(0, oy + 42)
  ctx.lineTo(-11, oy + 66)
  ctx.lineTo(11, oy + 66)
  ctx.closePath()
  ctx.fill()
  // foguinho (vermelho, pulsando)
  ctx.fillStyle = '#ff5d3d'
  ctx.beginPath()
  ctx.moveTo(0, oy + 45)
  ctx.lineTo(-7, oy + flame + 58)
  ctx.lineTo(7, oy + flame + 58)
  ctx.closePath()
  ctx.fill()
  // corpo (cor customizada)
  ctx.fillStyle = f.cor || '#35e8ff'
  ctx.beginPath()
  ctx.moveTo(0, oy - 32)
  ctx.lineTo(-28, oy + 38)
  ctx.quadraticCurveTo(0, oy + 58, 28, oy + 38)
  ctx.closePath()
  ctx.fill()
  // asas (cor customizada)
  ctx.fillStyle = f.corSecundaria || '#2568ff'
  ctx.beginPath()
  ctx.moveTo(-20, oy + 16)
  ctx.lineTo(-48, oy + 46)
  ctx.lineTo(-18, oy + 42)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(20, oy + 16)
  ctx.lineTo(48, oy + 46)
  ctx.lineTo(18, oy + 42)
  ctx.closePath()
  ctx.fill()
  // cabine
  ctx.fillStyle = '#dffcff'
  ctx.beginPath()
  ctx.ellipse(0, oy + 2, 13, 19, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
  ctx.beginPath()
  ctx.ellipse(-4, oy - 4, 4, 7, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Desenha o asteroide: polígono irregular (com "calombos") girando + crateras. */
export const desenharAsteroide: DesenhoDeFigura = (ctx, f, amb) => {
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  const radius = Math.min(f.w, f.h) / 2
  const sides = f.lados || 8
  const angle = (f.fase || 0) + amb.t * (f.giroPorMs || 0)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.fillStyle = f.cor || '#8d8f9b'
  ctx.strokeStyle = '#d6d7df'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const a = ((Math.PI * 2) / sides) * i
    const bump = 0.78 + Math.sin(i * 12.98 + radius) * 0.22
    const r = radius * bump
    const px = Math.cos(a) * r
    const py = Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.beginPath()
  ctx.arc(-radius * 0.25, -radius * 0.1, radius * 0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(radius * 0.25, radius * 0.18, radius * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * O TIRO: a bolinha de luz.
 *
 * ⚠️ O brilho do jogo é `shadowBlur`, e não um halo desenhado à mão. O pincel de SVG o traduz
 * num `feDropShadow` com metade do desvio — tratar a sombra como "detalhe que dá para largar"
 * deixaria a bolinha chapada, e ela é o objeto mais luminoso da tela do Desafio.
 */
export const desenharTiro: DesenhoDeFigura = (ctx, f) => {
  const r = (f.w || 10) / 2
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  const col = f.cor || '#9cff57'
  ctx.save()
  ctx.fillStyle = col
  ctx.shadowColor = col
  ctx.shadowBlur = 14
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()
}

/**
 * A CHAMA.
 *
 * ⚠️ Não existia no runtime: o jogo só tem fogo como foguinho da nave e como partícula. Ela nasce
 * aqui nas MESMAS três cores do foguinho (laranja por fora, vermelho no meio, miolo claro) e com
 * o mesmo pulso — a criança de O Jogo do Meu Jeito tem que reconhecer o fogo do motor que ela já
 * viu. Fica disponível para a extensão usar.
 */
export const desenharChama: DesenhoDeFigura = (ctx, f, amb) => {
  const cx = f.x + f.w / 2
  const base = f.y + f.h
  const alt = f.h
  const lar = f.w
  const pulso = 1 + Math.sin(amb.t * 0.015) * 0.06
  ctx.save()
  ctx.translate(cx, base)
  ctx.scale(1, pulso)
  // língua externa (laranja)
  ctx.fillStyle = '#ffb13b'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-lar * 0.5, -alt * 0.3, -lar * 0.22, -alt * 0.62)
  ctx.quadraticCurveTo(-lar * 0.08, -alt * 0.9, 0, -alt)
  ctx.quadraticCurveTo(lar * 0.16, -alt * 0.84, lar * 0.26, -alt * 0.58)
  ctx.quadraticCurveTo(lar * 0.5, -alt * 0.28, 0, 0)
  ctx.closePath()
  ctx.fill()
  // miolo (vermelho)
  ctx.fillStyle = '#ff5d3d'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-lar * 0.3, -alt * 0.24, -lar * 0.13, -alt * 0.44)
  ctx.quadraticCurveTo(-lar * 0.04, -alt * 0.64, 0, -alt * 0.72)
  ctx.quadraticCurveTo(lar * 0.1, -alt * 0.6, lar * 0.16, -alt * 0.42)
  ctx.quadraticCurveTo(lar * 0.3, -alt * 0.22, 0, 0)
  ctx.closePath()
  ctx.fill()
  // coração (claro)
  ctx.fillStyle = '#ffe06b'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-lar * 0.15, -alt * 0.16, -lar * 0.06, -alt * 0.3)
  ctx.quadraticCurveTo(0, -alt * 0.4, lar * 0.07, -alt * 0.28)
  ctx.quadraticCurveTo(lar * 0.15, -alt * 0.14, 0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
