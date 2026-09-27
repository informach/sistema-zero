import type { CaixaDaFigura, DesenhoDeFigura } from '../pincel'

/**
 * As figuras do CORRE DINO, portadas do `runtime/arcadeKitsDino.ts`.
 *
 * ⭐⭐ O porte é VERBATIM: cada linha saiu da string do runtime sem uma vírgula de ajuste. A
 * disciplina não é zelo, é o que faz o teste de paridade valer alguma coisa — transcrever
 * primeiro e melhorar depois foi o que deixou a consolidação dos comportamentos de inimigo passar
 * sem uma edição, e é o que autoriza o runtime a passar a ser gerado daqui.
 *
 * ⚠️ O que mudou, e só isso: o que era global virou parâmetro. `now()` virou `amb.t`,
 * `dinoGround(ctx)` e `_visibleWorldRect(ctx).top` viraram `amb.chao`, `_gravityPullsUp(
 * world.gravity)` virou `amb.gravidadeParaCima`, e o `sprite.skin` virou os campos da `Figura`.
 */

/** O Dino de fábrica: 64 de altura, largura 0,95 disso (`createDino`). */
export const CAIXA_DO_DINO: CaixaDaFigura = { w: 61, h: 64 }
/** O cacto de fábrica: `size` 44, largura 0,7 e altura 1,3 (`spawnObstacle`). */
export const CAIXA_DO_CACTO: CaixaDaFigura = { w: 31, h: 57 }
/** A pedra de fábrica: `size` 44 por 0,72 de altura. */
export const CAIXA_DA_PEDRA: CaixaDaFigura = { w: 44, h: 32 }
/** O pássaro de fábrica: 1,3 de largura por 0,8 de altura. */
export const CAIXA_DO_PASSARO: CaixaDaFigura = { w: 57, h: 35 }
/** O ovo de bônus (`spawnEgg`). */
export const CAIXA_DO_OVO: CaixaDaFigura = { w: 30, h: 38 }
/** A árvore do cenário. Alta como a do palco de cena, que sempre teve 138. */
export const CAIXA_DA_ARVORE: CaixaDaFigura = { w: 86, h: 138 }

/** Desenha o dinossauro (corpo, cabeça, espinhos, perninhas que correm). */
export const desenharDino: DesenhoDeFigura = (ctx, f, amb) => {
  const x = f.x
  const y = f.y
  const w = f.w
  const h = f.h
  const col = f.cor || '#5fb45f'
  const dark = '#3f8f49'
  const belly = '#d6f3b4'
  const ducking = !!f.agachado
  const jumping = !!f.noAr
  const swing = !ducking && !jumping ? Math.sin(amb.t * 0.02) * (h * 0.09) : jumping ? -h * 0.05 : 0
  ctx.save()
  // sombra: FICA na linha do chão (não sobe com o pulo, como acontecia quando era
  // desenhada nos pés) e encolhe/clareia conforme o dino ganha altura — dá
  // profundidade sem "grudar" no dino.
  const invertedGravity = !!amb.gravidadeParaCima
  const groundY = amb.chao
  let airborne = invertedGravity ? y - groundY : groundY - (y + h)
  if (airborne < 0) airborne = 0
  let shadowScale = 1 - airborne / 260
  if (shadowScale < 0.4) shadowScale = 0.4
  ctx.fillStyle = `rgba(32,65,92,${(0.16 * shadowScale).toFixed(3)})`
  ctx.beginPath()
  ctx.ellipse(
    x + w * 0.52,
    groundY + (invertedGravity ? 1 : -1),
    w * 0.42 * shadowScale,
    h * 0.06 * shadowScale,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  // cauda
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.moveTo(x + w * 0.18, y + h * 0.52)
  ctx.quadraticCurveTo(x - w * 0.06, y + h * 0.46, x + w * 0.02, y + h * 0.74)
  ctx.quadraticCurveTo(x + w * 0.16, y + h * 0.7, x + w * 0.28, y + h * 0.58)
  ctx.closePath()
  ctx.fill()
  // perninhas (duas, alternando)
  ctx.strokeStyle = dark
  ctx.lineWidth = Math.max(4, w * 0.1)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + w * 0.42, y + h * 0.78)
  ctx.lineTo(x + w * 0.38 - swing * 0.4, y + h - 1)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + w * 0.6, y + h * 0.78)
  ctx.lineTo(x + w * 0.64 + swing * 0.4, y + h - 1)
  ctx.stroke()
  // corpo
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.ellipse(x + w * 0.52, y + h * 0.58, w * 0.3, h * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  // barriga
  ctx.fillStyle = belly
  ctx.beginPath()
  ctx.ellipse(x + w * 0.56, y + h * 0.66, w * 0.16, h * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  // espinhos nas costas
  ctx.fillStyle = dark
  for (let i = 0; i < 3; i++) {
    const spx = x + w * (0.34 + i * 0.12)
    ctx.beginPath()
    ctx.moveTo(spx, y + h * 0.4)
    ctx.lineTo(spx + w * 0.05, y + h * 0.28)
    ctx.lineTo(spx + w * 0.1, y + h * 0.4)
    ctx.closePath()
    ctx.fill()
  }
  // cabeça
  const hx = x + w * 0.74
  const hy = y + h * (ducking ? 0.5 : 0.36)
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.ellipse(hx, hy, w * 0.2, h * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  // focinho
  ctx.beginPath()
  ctx.ellipse(hx + w * 0.14, hy + h * 0.04, w * 0.1, h * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  // olho
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(hx + w * 0.06, hy - h * 0.03, Math.max(2, w * 0.045), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#20415c'
  ctx.beginPath()
  ctx.arc(hx + w * 0.08, hy - h * 0.03, Math.max(1, w * 0.022), 0, Math.PI * 2)
  ctx.fill()
  // bracinho
  ctx.strokeStyle = dark
  ctx.lineWidth = Math.max(3, w * 0.06)
  ctx.beginPath()
  ctx.moveTo(x + w * 0.66, y + h * 0.6)
  ctx.lineTo(x + w * 0.74, y + h * 0.68)
  ctx.stroke()
  ctx.restore()
}

/** Desenha o obstáculo conforme a forma (cacto, pedra ou pássaro batendo asas). */
export const desenharObstaculo: DesenhoDeFigura = (ctx, f, amb) => {
  const x = f.x
  const y = f.y
  const w = f.w
  const h = f.h
  ctx.save()
  if (f.variante === 'rock') {
    ctx.fillStyle = '#8f7d70'
    ctx.strokeStyle = '#66564c'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + w * 0.06, y + h)
    ctx.lineTo(x + w * 0.2, y + h * 0.25)
    ctx.lineTo(x + w * 0.55, y + h * 0.05)
    ctx.lineTo(x + w * 0.85, y + h * 0.3)
    ctx.lineTo(x + w, y + h)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (f.variante === 'bird') {
    const flap = Math.sin(amb.t * 0.02 + (f.fase || 0)) * (h * 0.35)
    ctx.fillStyle = '#5b6b8c'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.5, y + h * 0.55, w * 0.28, h * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    // asas
    ctx.beginPath()
    ctx.moveTo(x + w * 0.45, y + h * 0.5)
    ctx.lineTo(x + w * 0.05, y + h * 0.5 - flap)
    ctx.lineTo(x + w * 0.42, y + h * 0.68)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + w * 0.55, y + h * 0.5)
    ctx.lineTo(x + w * 0.95, y + h * 0.5 - flap)
    ctx.lineTo(x + w * 0.58, y + h * 0.68)
    ctx.closePath()
    ctx.fill()
    // bico + olho
    ctx.fillStyle = '#ffb13b'
    ctx.beginPath()
    ctx.moveTo(x + w * 0.74, y + h * 0.52)
    ctx.lineTo(x + w * 0.92, y + h * 0.56)
    ctx.lineTo(x + w * 0.74, y + h * 0.62)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x + w * 0.66, y + h * 0.48, Math.max(2, w * 0.05), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#20415c'
    ctx.beginPath()
    ctx.arc(x + w * 0.67, y + h * 0.48, Math.max(1, w * 0.025), 0, Math.PI * 2)
    ctx.fill()
  } else {
    // cacto
    ctx.fillStyle = '#24a05a'
    ctx.strokeStyle = '#157940'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x + w * 0.36, y, w * 0.28, h, w * 0.14)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(x, y + h * 0.32, w * 0.3, h * 0.5, w * 0.14)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(x + w * 0.66, y + h * 0.46, w * 0.3, h * 0.42, w * 0.14)
    ctx.fill()
    ctx.stroke()
    // florzinha no topo
    ctx.fillStyle = '#ff7aa8'
    ctx.beginPath()
    ctx.arc(x + w * 0.5, y + h * 0.04, Math.max(2, w * 0.08), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** O cacto: a variante de fábrica do obstáculo. */
export const desenharCacto: DesenhoDeFigura = (p, f, amb) =>
  desenharObstaculo(p, { ...f, variante: 'cactus' }, amb)

/** A pedra: a variante `rock` do obstáculo, que nos cursos faz o papel do asteroide caído. */
export const desenharPedra: DesenhoDeFigura = (p, f, amb) =>
  desenharObstaculo(p, { ...f, variante: 'rock' }, amb)

/** O pássaro que passa no alto. */
export const desenharPassaro: DesenhoDeFigura = (p, f, amb) =>
  desenharObstaculo(p, { ...f, variante: 'bird' }, amb)

/** Desenha o ovo (casca clara com manchinhas e um brilho que pisca). */
export const desenharOvo: DesenhoDeFigura = (ctx, f, amb) => {
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  ctx.save()
  ctx.fillStyle = '#fff5c8'
  ctx.strokeStyle = '#e0b352'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, cy, f.w * 0.44, f.h * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#8fd6ff'
  ctx.beginPath()
  ctx.arc(cx - f.w * 0.14, cy, f.w * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff93b5'
  ctx.beginPath()
  ctx.arc(cx + f.w * 0.12, cy + f.h * 0.12, f.w * 0.08, 0, Math.PI * 2)
  ctx.fill()
  const shine = 0.4 + Math.sin(amb.t * 0.006 + (f.fase || 0)) * 0.3
  ctx.globalAlpha = Math.max(0.1, Math.min(0.9, shine))
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(cx - f.w * 0.1, cy - f.h * 0.2, f.w * 0.08, f.h * 0.12, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * A ÁRVORE do cenário.
 *
 * ⚠️ É a única figura do Corre Dino que não existia no runtime: o `drawForest` desenha MORROS,
 * não árvores, e o palco de cena sempre teve uma árvore de 138 no papel de cenário. Ela nasce
 * aqui no vocabulário de cor da floresta (as duas cores dos morros e o marrom do chão), e não
 * numa paleta nova — a cena e o fundo precisam parecer o mesmo lugar. Fica disponível para a
 * extensão usar quando o jogo quiser árvores de verdade.
 */
export const desenharArvore: DesenhoDeFigura = (ctx, f) => {
  const cx = f.x + f.w / 2
  const base = f.y + f.h
  const alt = f.h
  ctx.save()
  // tronco
  ctx.fillStyle = '#9d7346'
  ctx.beginPath()
  ctx.rect(cx - f.w * 0.07, base - alt * 0.53, f.w * 0.14, alt * 0.53)
  ctx.fill()
  ctx.fillStyle = '#7d5a35'
  ctx.beginPath()
  ctx.rect(cx - f.w * 0.07, base - alt * 0.53, f.w * 0.05, alt * 0.53)
  ctx.fill()
  // três camadas de copa, a de baixo mais larga e mais escura
  // ⚠️ A variante ESCURA é a árvore do meio da `layers`, que precisa se distinguir das outras
  // duas para a criança ver quem está na frente de quem. Mesmas cores da floresta, um tom abaixo.
  const escura = f.variante === 'escura'
  const copas = escura
    ? [
        { y: 0.2, w: 0.5, h: 0.26, cor: '#4f9f5c' },
        { y: 0.44, w: 0.4, h: 0.24, cor: '#5fb163' },
        { y: 0.66, w: 0.28, h: 0.22, cor: '#74cf77' },
      ]
    : [
        { y: 0.2, w: 0.5, h: 0.26, cor: '#74cf77' },
        { y: 0.44, w: 0.4, h: 0.24, cor: '#91dc7a' },
        { y: 0.66, w: 0.28, h: 0.22, cor: '#a8e88c' },
      ]
  for (const c of copas) {
    ctx.fillStyle = c.cor
    ctx.beginPath()
    ctx.moveTo(cx - f.w * c.w, base - alt * c.y)
    ctx.quadraticCurveTo(cx, base - alt * (c.y + c.h * 1.6), cx + f.w * c.w, base - alt * c.y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}
