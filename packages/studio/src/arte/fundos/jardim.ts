import type { DesenhoDeFundo } from '../pincel'

/** O mesmo jardim calmo do projeto preparado, para cenas que precisem de fundo procedural. */
export const desenharJardim: DesenhoDeFundo = (ctx, area, amb) => {
  const { w, h } = area
  ctx.save()
  ctx.fillStyle = '#c7effb'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#ffec9b'
  ctx.beginPath()
  ctx.arc(w * 0.873, h * 0.186, h * 0.1, 0, Math.PI * 2)
  ctx.fill()
  for (const [y, color, bump] of [
    [0.68, '#a9db8d', 0.1],
    [0.78, '#70bb75', 0.07],
    [0.89, '#54a96c', 0.035],
  ] as const) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, h * y)
    ctx.quadraticCurveTo(w * 0.2, h * (y - bump), w * 0.42, h * y)
    ctx.quadraticCurveTo(w * 0.65, h * (y - bump), w, h * y)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()
  }
  if (amb.detalhe !== 'calmo') {
    ctx.fillStyle = '#f7f4cf'
    for (const [x, y] of [
      [0.134, 0.758],
      [0.564, 0.758],
      [0.85, 0.833],
    ] as const) {
      ctx.beginPath()
      ctx.arc(w * x, h * y, Math.max(2, h * 0.011), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}
