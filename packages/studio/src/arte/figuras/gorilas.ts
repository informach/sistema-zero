import type { CaixaDaFigura, DesenhoDeFigura } from '../pincel'

/**
 * As figuras da BATALHA DE GORILAS, portadas do `runtime/arcadeKitsGorillas.ts`.
 * Porte verbatim; o que era global virou parâmetro (ver o cabeçalho de `correDino.ts`).
 */

/** O gorila de fábrica (`placeThrower`: 30 por 36). */
export const CAIXA_DO_GORILA: CaixaDaFigura = { w: 30, h: 36 }
/** A banana: o desenho de referência mede 14 por 13, com folga na caixa. */
export const CAIXA_DA_BANANA: CaixaDaFigura = { w: 18, h: 16 }
/** Um prédio recortado da cidade, na altura de uma figura de cenário. */
export const CAIXA_DO_PREDIO: CaixaDaFigura = { w: 62, h: 138 }

/** Desenha um gorila (braços levantados prontos pra lançar + carinha). */
export const desenharGorila: DesenhoDeFigura = (ctx, f) => {
  const x = f.x
  const y = f.y
  const w = f.w
  const h = f.h
  const col = f.cor || '#6b4a2b'
  const dark = '#4a3220'
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h - 1, w * 0.5, h * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = col
  ctx.lineWidth = Math.max(5, w * 0.22)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + w * 0.3, y + h * 0.5)
  ctx.lineTo(x + w * 0.12, y + h * 0.12)
  ctx.moveTo(x + w * 0.7, y + h * 0.5)
  ctx.lineTo(x + w * 0.88, y + h * 0.12)
  ctx.stroke()
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h * 0.66, w * 0.42, h * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w / 2, y + h * 0.32, w * 0.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#caa884'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h * 0.37, w * 0.2, h * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = dark
  const er = Math.max(1.5, w * 0.05)
  ctx.beginPath()
  ctx.arc(x + w * 0.4, y + h * 0.31, er, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w * 0.6, y + h * 0.31, er, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * A BANANA, o projétil da batalha.
 *
 * ⚠️ O `drawBanana` do runtime desenha o RASTRO junto (os pontinhos amarelos do voo) e gira pelo
 * ângulo de voo. Aqui fica só a fruta, centrada na caixa: rastro é estado de trajetória, não
 * figura, e uma banana parada na cena com pontinhos atrás mentiria sobre movimento.
 */
export const desenharBanana: DesenhoDeFigura = (ctx, f) => {
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  // O desenho de referência tem 14 de largura; a caixa escala em cima disso.
  const s = f.w / 18
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.rotate(f.fase || 0)
  ctx.fillStyle = '#ffd23f'
  ctx.strokeStyle = '#caa400'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-7, -2)
  ctx.quadraticCurveTo(0, 11, 7, -2)
  ctx.quadraticCurveTo(0, 3, -7, -2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/**
 * UM PRÉDIO, recortado do vocabulário da cidade.
 *
 * ⚠️ Nasce aqui porque o cenário `gorilas` precisa de uma figura de PAPEL — a cena `layers`
 * pergunta quem fica na frente de quem, e o fundo inteiro não serve de peça. É o mesmo prédio do
 * `desenharCidade`: mesma paleta, mesma grade de janelas, mesmo tom de janela apagada. Dois
 * desenhos diferentes de prédio na mesma tela é o tipo de coisa que a criança nota.
 */
export const desenharPredio: DesenhoDeFigura = (ctx, f) => {
  const { x, y, w, h } = f
  ctx.save()
  ctx.fillStyle = f.cor || '#454168'
  ctx.fillRect(x, y, w, h)
  const gap = 10
  const ww = 7
  const wh = 9
  const cols = Math.floor((w - gap) / (ww + gap))
  const rows = Math.floor((h - gap) / (wh + gap))
  // A mesma sequência de janelas acesas em toda parte: a figura não sorteia (ver `semente.ts`).
  let li = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (li * 7 + 3) % 13 < 4 ? '#ffd97a' : '#20203a'
      ctx.fillRect(x + gap + c * (ww + gap), y + gap + r * (wh + gap), ww, wh)
      li++
    }
  }
  ctx.restore()
}
