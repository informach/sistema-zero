import type { DesenhoDeFundo } from '../pincel'

/** A paleta e o traçado do mapa preparado de A Chave do Farol, para palcos genéricos. */
export const desenharFarol: DesenhoDeFundo = (ctx, area, amb) => {
  const { w, h } = area
  ctx.save()
  ctx.fillStyle = '#b9dfd0'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#a6d5ea'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(w, 0)
  ctx.lineTo(w, h * 0.26)
  ctx.quadraticCurveTo(w * 0.73, h * 0.37, w * 0.49, h * 0.26)
  ctx.quadraticCurveTo(w * 0.2, h * 0.21, 0, h * 0.26)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#96c98d'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.75)
  ctx.quadraticCurveTo(w * 0.22, h * 0.71, w * 0.42, h * 0.77)
  ctx.quadraticCurveTo(w * 0.72, h * 0.8, w, h * 0.75)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#5ba9c1'
  ctx.beginPath()
  ctx.moveTo(w * 0.78, 0)
  ctx.lineTo(w, 0)
  ctx.lineTo(w, h)
  ctx.lineTo(w * 0.82, h)
  ctx.quadraticCurveTo(w * 0.85, h * 0.82, w * 0.79, h * 0.68)
  ctx.quadraticCurveTo(w * 0.75, h * 0.53, w * 0.8, h * 0.4)
  ctx.quadraticCurveTo(w * 0.83, h * 0.26, w * 0.78, 0)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#e8d7a8'
  ctx.lineWidth = Math.max(8, h * 0.061)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.46)
  ctx.quadraticCurveTo(w * 0.25, h * 0.42, w * 0.49, h * 0.44)
  ctx.quadraticCurveTo(w * 0.65, h * 0.38, w * 0.71, h * 0.49)
  ctx.stroke()

  if (amb.detalhe !== 'calmo') {
    ctx.fillStyle = '#fff5ca'
    for (const [x, y] of [
      [0.144, 0.356],
      [0.334, 0.636],
      [0.589, 0.267],
    ] as const) {
      ctx.beginPath()
      ctx.arc(w * x, h * y, Math.max(2, h * 0.012), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}
