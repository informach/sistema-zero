import type { Pincel } from './pincel'

/**
 * O HUD do Jogo 2D: coração, barra e as medidas do placar.
 *
 * ⭐⭐ Nasceu do relato dela em 18/09/2026, depois que as FIGURAS já vinham daqui: *"o placar, por
 * exemplo, você não fez igual ao da extensão Jogo 2D, você fez um outro nada a ver com o estilo do
 * jogo"*. Estava certa — a cena tinha inventado DUAS linguagens de placar que não existem no jogo:
 * um cartão de 176×92 com borda de 2px (as cenas de número) e um número solto alinhado à direita
 * (a `lives`). Nenhum dos dois aparece em jogo nenhum que a criança monte.
 *
 * ⚠️ Portado VERBATIM de `official-extensions/game-2d/runtime/arcadeKitsHud.ts`, como as figuras:
 * transcrever primeiro, ajustar nunca. O teste de paridade compara operação a operação.
 */

/** O tamanho de fábrica do coração no jogo (`drawSpriteHealth`), e o vão entre eles. */
export const CORACAO = { lado: 22, vao: 6 } as const

/** As cores que o jogo usa de fábrica no HUD. */
export const CORES_DO_HUD = {
  /** `drawScore`/`drawLabel`/`drawPixelText`. */
  tinta: '#ffffff',
  /** `drawSpriteHealth` em corações, e o preenchimento da vida na gk. */
  vida: '#ff5d5d',
  /** O trilho da barra (`drawBar`). */
  trilho: 'rgba(255,255,255,0.2)',
  /** O preenchimento da barra. */
  barra: '#9cff57',
} as const

/**
 * SÓ o caminho do coração — quatro beziers, canto superior-esquerdo em (x, y), lado `s`.
 *
 * ⚠️ Separado do preenchimento para a cena poder desenhar a vida PERDIDA como contorno (o
 * `lives` faz isso), sem inventar outra geometria. O `top = s * 0.3` é o que dá a covinha.
 */
export function caminhoDoCoracao(p: Pincel, { x, y, s }: { x: number; y: number; s: number }) {
  const top = s * 0.3
  p.beginPath()
  p.moveTo(x + s / 2, y + top)
  p.bezierCurveTo(x + s / 2, y, x, y, x, y + top)
  p.bezierCurveTo(x, y + (s + top) / 2, x + s / 2, y + (s + top) / 2, x + s / 2, y + s)
  p.bezierCurveTo(x + s / 2, y + (s + top) / 2, x + s, y + (s + top) / 2, x + s, y + top)
  p.bezierCurveTo(x + s, y, x + s / 2, y, x + s / 2, y + top)
  p.closePath()
}

/** UM coração cheio. É o `drawHeart` do runtime, linha por linha: caminho + `fill`, sem contorno. */
export function desenharCoracao(p: Pincel, alvo: { x: number; y: number; s: number }) {
  caminhoDoCoracao(p, alvo)
  p.fill()
}

/**
 * Os corações em linha, com o passo do jogo (`s + 6`). É o `_drawHeartsVisual`.
 *
 * ⚠️ O teto de 20 é do runtime, e vale aqui pelo mesmo motivo: o HUD não pode virar uma tira
 * infinita quando alguém escreve um número grande.
 */
export function desenharCoracoes(
  p: Pincel,
  {
    quantos,
    x,
    y,
    s = CORACAO.lado,
    cor,
  }: { quantos: number; x: number; y: number; s?: number; cor?: string },
) {
  const n = Math.max(0, Math.min(Math.floor(quantos), 20))
  p.save()
  p.fillStyle = cor || CORES_DO_HUD.vida
  for (let i = 0; i < n; i++) desenharCoracao(p, { x: x + i * (s + CORACAO.vao), y, s })
  p.restore()
}

/**
 * A barra de vida/progresso: trilho + preenchimento proporcional.
 *
 * ⚠️ Sem borda e sem cantos, como no jogo (`_drawBarVisual`). A gk desenha a dela com contorno
 * branco; esta é a do Jogo 2D básico, que é o que os cursos ensinam.
 *
 * ⚠️ Ainda SEM consumidor: nenhuma das 45 cenas mostra barra de vida (a `lives` mostra corações).
 * Ela veio junto porque o HUD é uma unidade e porque é a outra forma do `drawSpriteHealth` — e o
 * teste de paridade a cobre desde já, para o dia em que uma cena precisar dela.
 */
export function desenharBarra(
  p: Pincel,
  {
    valor,
    maximo,
    x,
    y,
    w,
    h,
    cor,
  }: { valor: number; maximo: number; x: number; y: number; w: number; h: number; cor?: string },
) {
  const m = maximo > 0 ? maximo : 1
  const frac = Math.max(0, Math.min(valor / m, 1))
  p.save()
  p.fillStyle = CORES_DO_HUD.trilho
  p.fillRect(x, y, w, h)
  p.fillStyle = cor || CORES_DO_HUD.barra
  p.fillRect(x, y, w * frac, h)
  p.restore()
}
