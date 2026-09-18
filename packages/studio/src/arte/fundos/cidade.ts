import type { AreaDoFundo, DesenhoDeFundo } from '../pincel'
import { sorteioComSemente } from '../semente'

/**
 * O fundo de CIDADE da batalha de gorilas, portado do `createCity`/`drawCity` do
 * `runtime/arcadeKitsGorillas.ts`. Mesma conversão de estado mutável em derivado da floresta.
 *
 * ⚠️ As CRATERAS ficaram de fora: no jogo elas são estado de partida (a banana fura o prédio) e
 * são desenhadas com recortes empilhados. Uma cena de aula não tem partida em curso, e um furo
 * sem causa na tela seria um detalhe que a criança tentaria explicar.
 */

interface Predio {
  x: number
  w: number
  h: number
  cor: string
  luzes: boolean[]
}

const cache = new Map<string, Predio[]>()

function predios(area: AreaDoFundo): Predio[] {
  const chave = `${Math.round(area.w)}x${Math.round(area.h)}`
  const guardados = cache.get(chave)
  if (guardados) return guardados
  const sorteio = sorteioComSemente(6271 + Math.round(area.w) * 31 + Math.round(area.h))
  const W = area.w
  const H = area.h
  const lista: Predio[] = []
  const paleta = ['#3b3a5a', '#454168', '#2f3350', '#544b74', '#3a4a6b']
  let x = 0
  let bi = 0
  while (x < W) {
    let bw = 38 + Math.floor(sorteio() * 34)
    if (x + bw > W) bw = W - x
    // Prédios das pontas mais baixos (cabem os gorilas e dá pra mirar por cima).
    const edge = x < W * 0.22 || x > W * 0.74
    const minh = H * 0.28
    const maxh = edge ? H * 0.45 : H * 0.8
    const bh = Math.round(minh + sorteio() * (maxh - minh))
    const luzes: boolean[] = []
    for (let L = 0; L < 60; L++) luzes.push(sorteio() < 0.34)
    lista.push({ x, w: bw, h: bh, cor: paleta[bi % paleta.length] as string, luzes })
    x += bw
    bi++
  }
  cache.set(chave, lista)
  return lista
}

/** Desenha a cidade: céu + lua + prédios com janelas acesas. */
export const desenharCidade: DesenhoDeFundo = (ctx, area, amb) => {
  const W = area.w
  const H = area.h
  const calmo = amb.detalhe === 'calmo'
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#1b2a4a')
  sky.addColorStop(1, '#5a3b6b')
  ctx.save()
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(W - 60, 52, 22, 0, Math.PI * 2)
  ctx.fill()
  for (const b of predios(area)) {
    const top = H - b.h
    ctx.fillStyle = b.cor
    ctx.fillRect(b.x, top, b.w, b.h)
    // ⚠️ No modo calmo as janelas não são desenhadas: são dezenas de retângulos amarelos por
    // prédio, e uma régua da cena por cima deles fica ilegível.
    if (calmo) continue
    const gap = 10
    const ww = 7
    const wh = 9
    const cols = Math.floor((b.w - gap) / (ww + gap))
    const rows = Math.floor((b.h - gap) / (wh + gap))
    let li = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = b.luzes[li % b.luzes.length] ? '#ffd97a' : '#20203a'
        ctx.fillRect(b.x + gap + c * (ww + gap), top + gap + r * (wh + gap), ww, wh)
        li++
      }
    }
  }
  ctx.restore()
}
