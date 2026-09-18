import type { AreaDoFundo, DesenhoDeFundo, Pincel } from '../pincel'
import { sorteioComSemente } from '../semente'

/**
 * O fundo de FLORESTA do Corre Dino, portado do `drawForest` do `runtime/arcadeKitsDino.ts`.
 *
 * ⭐⭐ Uma mudança DELIBERADA em relação ao runtime, e é a única: o estado do parallax deixou de
 * ser mutável e passou a ser DERIVADO. No runtime, `_forest` é uma variável de módulo sorteada
 * com `Math.random()` no primeiro quadro e as nuvens andam por `c.x -= c.s * sp` a cada quadro.
 * Isso não serve a uma cena de aula por dois motivos: a cena renderiza no servidor e nos testes
 * por `renderToStaticMarkup`, onde um sorteio dá um céu diferente a cada execução; e o React
 * re-renderiza o palco a cada gesto, onde mutar no render é defeito.
 *
 * Aqui a posição é função de `(semente, área, deslocamento)`, e o deslocamento sai do relógio —
 * o mesmo caminho que o palco de cena já usava para as estrelas dele, e pelo mesmo motivo
 * (sortear 80 estrelas por quadro era trabalho jogado fora, e um céu que pisca a cada toque é o
 * contrário do "fundo" que ele é).
 *
 * ⚠️ O que se perde: no runtime, a nuvem que sai pela esquerda reaparece numa ALTURA nova. Aqui
 * ela volta na mesma altura. É invisível em jogo e é o preço de não ter sorteio no meio do
 * desenho — registrado para ninguém "consertar" isso trazendo `Math.random` de volta.
 */

/** Quantos quadros cabem no tempo dado. O parallax do runtime anda por QUADRO, não por segundo. */
const QUADRO_MS = 1000 / 60

interface Nuvem {
  x0: number
  y: number
  s: number
  escala: number
}
interface Morro {
  x0: number
  w: number
  h: number
}

interface Floresta {
  nuvens: Nuvem[]
  morros: Morro[]
}

const cache = new Map<string, Floresta>()

/**
 * As nuvens e os morros de uma área, sempre os MESMOS para a mesma área.
 *
 * ⚠️ Guardados por tamanho, como as estrelas do palco de cena: o relógio redesenha o fundo
 * dezenas de vezes por segundo e sortear tudo de novo a cada quadro é trabalho jogado fora. Os
 * tamanhos são poucos (os enquadramentos das famílias de cena mais o palco do jogo), então o
 * mapa não cresce.
 */
function floresta(area: AreaDoFundo): Floresta {
  const chave = `${Math.round(area.w)}x${Math.round(area.h)}`
  const guardada = cache.get(chave)
  if (guardada) return guardada
  const sorteio = sorteioComSemente(4177 + Math.round(area.w) * 31 + Math.round(area.h))
  const nuvens: Nuvem[] = []
  const morros: Morro[] = []
  for (let i = 0; i < 5; i++) {
    nuvens.push({
      x0: sorteio() * area.w,
      y: 20 + sorteio() * (area.h * 0.3),
      s: 0.2 + sorteio() * 0.35,
      escala: 0.7 + sorteio() * 0.7,
    })
  }
  for (let j = 0; j < 4; j++) {
    morros.push({
      x0: j * (area.w / 3),
      w: area.w * (0.42 + sorteio() * 0.3),
      h: area.h * (0.16 + sorteio() * 0.14),
    })
  }
  const nova = { nuvens, morros }
  cache.set(chave, nova)
  return nova
}

/** Dá a volta no intervalo, sem laço (velocidade grande não pode travar a thread). */
const volta = (v: number, min: number, max: number) => {
  const faixa = max - min
  if (!(faixa > 0)) return min
  return min + ((((v - min) % faixa) + faixa) % faixa)
}

/** Nuvenzinha fofa (o `drawCloud` do runtime, sem uma vírgula de mudança). */
export function desenharNuvem(ctx: Pincel, x: number, y: number, escala: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(escala, escala)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(14, 14, 13, 0, Math.PI * 2)
  ctx.arc(30, 9, 17, 0, Math.PI * 2)
  ctx.arc(48, 15, 12, 0, Math.PI * 2)
  ctx.arc(32, 20, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * Fundo de FLORESTA com parallax: céu, sol, nuvens (lentas), morros (médios) e
 * uma faixa de grama/chão que ROLA (rápida). O dino corre sobre a grama (`area.chao`).
 */
export const desenharFloresta: DesenhoDeFundo = (ctx, area, amb) => {
  const sp = Number.isFinite(amb.velocidade) ? (amb.velocidade as number) : 4
  const w = area.w
  const h = area.h
  const gy = area.chao
  const calmo = amb.detalhe === 'calmo'
  const desloc = (amb.t / QUADRO_MS) * sp
  ctx.save()
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#8fe7ff')
  sky.addColorStop(0.55, '#c7fff2')
  sky.addColorStop(1, '#fff0b3')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  // sol
  ctx.fillStyle = '#ffe06b'
  ctx.beginPath()
  ctx.arc(w - 64, 58, 26, 0, Math.PI * 2)
  ctx.fill()
  const F = floresta(area)
  // ⚠️ No modo calmo sobram duas nuvens: o palco de cena escreve réguas e rótulos em cima do
  // céu, e cinco nuvens brancas atrás de um número o deixam ilegível.
  const zonas = amb.semDetalhe ?? []
  const nuvens = calmo ? F.nuvens.slice(0, 2) : F.nuvens
  for (const c of nuvens) {
    const cx = volta(c.x0 - c.s * desloc, -90, w + 30)
    // A nuvem é larga: basta um canto dela invadir a zona do número para o número sumir nela.
    const invade = zonas.some(
      (z) =>
        cx + 66 * c.escala >= z.x &&
        cx <= z.x + z.w &&
        c.y + 34 * c.escala >= z.y &&
        c.y <= z.y + z.h,
    )
    if (!invade) desenharNuvem(ctx, cx, c.y, c.escala)
  }
  for (let k = 0; k < F.morros.length; k++) {
    const hl = F.morros[k]
    if (!hl) continue
    ctx.fillStyle = k % 2 === 0 ? '#91dc7a' : '#74cf77'
    const hx = volta(hl.x0 - desloc * 0.4, -hl.w, w)
    const altura = calmo ? hl.h * 0.6 : hl.h
    ctx.beginPath()
    ctx.moveTo(hx, gy)
    ctx.quadraticCurveTo(hx + hl.w / 2, gy - altura, hx + hl.w, gy)
    ctx.closePath()
    ctx.fill()
  }
  // grama + chão
  const band = h - gy
  ctx.fillStyle = '#75cc63'
  ctx.fillRect(0, gy, w, band)
  ctx.fillStyle = '#57b850'
  ctx.fillRect(0, gy, w, Math.max(4, band * 0.2))
  ctx.fillStyle = '#9d7346'
  ctx.fillRect(0, gy + band * 0.55, w, h - (gy + band * 0.55))
  // tracinhos do chão rolando (sensação de velocidade)
  if (!calmo) {
    const gx0 = -volta(desloc, 0, 40)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 3
    for (let gx = gx0; gx < w; gx += 40) {
      ctx.beginPath()
      ctx.moveTo(gx, gy + band * 0.34)
      ctx.lineTo(gx + 16, gy + band * 0.34)
      ctx.stroke()
    }
  }
  ctx.restore()
}
