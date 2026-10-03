import type { DesenhoDeFundo } from '../pincel'
import { pintarFarol } from './farol.generated'

/** Mesmos vetores do cenário limpo, com recorte central em palcos de outra proporção. */
export const desenharFarol: DesenhoDeFundo = (ctx, { w, h }, amb) => {
  const escala = Math.max(w / 480, h / 360)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.clip()
  ctx.translate((w - 480 * escala) / 2, (h - 360 * escala) / 2)
  ctx.scale(escala, escala)
  pintarFarol(ctx, amb.detalhe !== 'calmo')
  ctx.restore()
}
