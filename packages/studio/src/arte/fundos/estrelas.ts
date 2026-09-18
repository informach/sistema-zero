import type { AreaDoFundo, DesenhoDeFundo } from '../pincel'
import { sorteioComSemente } from '../semente'

/**
 * O fundo de ESTRELAS do Desafio, portado do `drawStarfield` do `runtime/arcadeKitsHud.ts`.
 * Mesma conversão de estado mutável em derivado da floresta — o porquê está lá.
 */

const QUADRO_MS = 1000 / 60

interface Estrela {
  x: number
  y0: number
  r: number
  s: number
  alpha: number
  fase: number
}

const cache = new Map<string, Estrela[]>()

function estrelas(area: AreaDoFundo): Estrela[] {
  const chave = `${Math.round(area.w)}x${Math.round(area.h)}`
  const guardadas = cache.get(chave)
  if (guardadas) return guardadas
  const sorteio = sorteioComSemente(9173 + Math.round(area.w) * 31 + Math.round(area.h))
  const novas: Estrela[] = []
  for (let i = 0; i < 100; i++) {
    novas.push({
      x: sorteio() * area.w,
      y0: sorteio() * area.h,
      r: sorteio() * 1.8 + 0.4,
      s: sorteio() * 0.7 + 0.2,
      alpha: sorteio() * 0.6 + 0.4,
      fase: sorteio() * Math.PI * 2,
    })
  }
  cache.set(chave, novas)
  return novas
}

/**
 * Fundo espacial completo: gradiente vertical do céu + 100 estrelas que ROLAM para baixo e
 * CINTILAM. Ele já pinta o fundo todo.
 *
 * ⚠️ No modo calmo o número de estrelas cai à metade e o cintilar para. O palco de cena escreve
 * o placar e as réguas por cima do céu, e uma estrela que pisca ao lado de um número compete com
 * ele — o palco antigo já tinha a mesma preocupação, com as zonas `semEstrelas`.
 */
export const desenharEstrelas: DesenhoDeFundo = (ctx, area, amb) => {
  const sp = Number.isFinite(amb.velocidade) ? (amb.velocidade as number) : 1
  const w = area.w
  const h = area.h
  const calmo = amb.detalhe === 'calmo'
  const desloc = (amb.t / QUADRO_MS) * sp
  ctx.save()
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#071b3a')
  grad.addColorStop(0.55, '#06101f')
  grad.addColorStop(1, '#020611')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  const zonas = amb.semDetalhe ?? []
  const livre = (cx: number, cy: number) =>
    !zonas.some((z) => cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h)
  const todas = estrelas(area)
  const lista = calmo ? todas.filter((_, i) => i % 2 === 0) : todas
  for (const st of lista) {
    const y = h > 0 ? (((st.y0 + st.s * desloc) % h) + h) % h : st.y0
    // ⚠️ A checagem vem ANTES de abrir o caminho: saindo no meio, o `beginPath` ficaria pendurado.
    if (!livre(st.x, y)) continue
    const tw = calmo ? st.alpha : st.alpha + Math.sin(amb.t * 0.003 + st.fase) * 0.25
    ctx.globalAlpha = Math.max(0.1, Math.min(1, tw))
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(st.x, y, st.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
}
