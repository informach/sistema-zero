/**
 * O cipó como pêndulo (regras puras, sem three nem física). O balanço acontece num plano em pé
 * que passa pelo pivô (o galho) e aponta para `rumo`; o personagem pendura pelas mãos a
 * `comprimento` do pivô. Nada aqui aloca: cada função escreve no objeto que recebe.
 *
 * Convenção de direção: um `rumo` `r` aponta para `(sin r, cos r)` no chão, a mesma do giro do
 * avatar (`rastro.direcao`). O `angulo` é medido da vertical; positivo é para o lado do `rumo`.
 */

/** A gravidade do personagem (a mesma de `personagem.tsx`). */
export const GRAVIDADE_DO_CIPO = 24

export const CIPO = {
  /** Do centro do corpo até as mãos, com os braços para cima. */
  maosAcimaDoCentro: 0.3,
  /** No ponto mais baixo do balanço, os pés passam a esta altura do chão. */
  folgaDosPes: 0.35,
  /** O cipó nunca fica mais curto que isto (um pêndulo curto demais balança nervoso). */
  comprimentoMinimo: 1.6,
  /** Quanto a direção pedida empurra o balanço (m/s² ao longo do arco). */
  bombear: 9,
  /** O balanço perde isto por segundo enquanto a criança segura (quase nada). */
  amortecimento: 0.12,
  /** Sozinho, o cipó para aos poucos depois que a criança solta. */
  amortecimentoSolto: 0.8,
  /** O maior ângulo do balanço (63°): mais que isto vira cambalhota. */
  anguloMaximo: 1.1,
  /** Quanto o lado pedido vira o plano do balanço, por segundo. */
  giroDoBalanco: 1,
  /** Segundos até o corpo chegar ao lugar do balanço depois de pegar (sobe ou escorrega). */
  encaixe: 0.22,
  /** Soltar lança com a velocidade do balanço vezes isto (um pouco mais longe, como nos jogos). */
  impulsoAoSoltar: 1.15,
  /** E um pulinho para cima ao soltar, para soltar no meio do balanço ainda subir. */
  subidaAoSoltar: 3.2,
  /** No ar, as mãos pegam o cipó que passar a esta distância delas. */
  raioDaPegadaNoAr: 0.65,
  /** Segundos antes de pegar de novo o cipó que acabou de soltar. */
  esperaParaPegarDeNovo: 0.45,
  /** No chão, a dica de pegar aparece a esta distância (no chão) da corda. */
  raioDaDica: 1.3,
} as const

/** Passo máximo da conta (o quadro longo de um aparelho lento vira vários passos curtos). */
const PASSO_MAXIMO = 1 / 120

export interface Ponto {
  x: number
  y: number
  z: number
}

export interface Balanco {
  /** Da vertical, em radianos; positivo é para o lado do `rumo`. */
  angulo: number
  /** Radianos por segundo. */
  velocidade: number
  /** Para onde o plano do balanço aponta (a frente do balanço). */
  rumo: number
  /** Do pivô até as mãos. */
  comprimento: number
}

export function criarBalanco(): Balanco {
  return { angulo: 0, velocidade: 0, rumo: 0, comprimento: CIPO.comprimentoMinimo }
}

/**
 * Onde as mãos seguram: o mais longe do pivô que deixa os pés `folgaDosPes` acima do chão no
 * ponto mais baixo, sem passar do fim da corda.
 */
export function comprimentoDaPegada(
  alturaDoPivo: number,
  alturaDoChao: number,
  corda: number,
  doCentroAoPe: number,
): number {
  const cabe =
    alturaDoPivo - alturaDoChao - CIPO.folgaDosPes - doCentroAoPe - CIPO.maosAcimaDoCentro
  return Math.max(CIPO.comprimentoMinimo, Math.min(corda, cabe))
}

/**
 * Pegar o cipó: o balanço começa de onde as mãos estão e com a velocidade que o corpo traz (quem
 * pula no cipó já sai balançando). `rumoDoCorpo` vale quando o corpo está quase parado.
 */
export function pegarCipo(
  b: Balanco,
  pivo: Ponto,
  corpo: Ponto,
  velocidade: Ponto,
  rumoDoCorpo: number,
  comprimento: number,
): void {
  const mx = corpo.x - pivo.x
  const mz = corpo.z - pivo.z
  const rapido = Math.hypot(velocidade.x, velocidade.z) > 1
  b.rumo = rapido
    ? Math.atan2(velocidade.x, velocidade.z)
    : Math.hypot(mx, mz) > 0.25
      ? Math.atan2(mx, mz)
      : rumoDoCorpo
  b.comprimento = comprimento
  const dx = Math.sin(b.rumo)
  const dz = Math.cos(b.rumo)
  const aoLado = mx * dx + mz * dz
  b.angulo = limitar(Math.asin(limitar(aoLado / comprimento, 1)), CIPO.anguloMaximo)
  // A parte da velocidade que segue o arco (a tangente do balanço) vira velocidade de giro.
  const c = Math.cos(b.angulo)
  const s = Math.sin(b.angulo)
  const aoLongo = (velocidade.x * dx + velocidade.z * dz) * c + velocidade.y * s
  b.velocidade = aoLongo / comprimento
}

/**
 * Um quadro de balanço. `pedidoX`/`pedidoZ` é a direção pedida no chão do mundo (o joystick já
 * girado pela câmera), de tamanho até 1; solto, o cipó só volta a parar.
 *
 * Bombear como no balanço do parquinho: pedir para o lado em que o balanço já vai dá impulso;
 * pedir para o outro lado não freia (só espera a volta). Parado, pedir dá o primeiro empurrão.
 * O lado pedido (de través) vira o plano do balanço devagar.
 */
export function passoDoBalanco(
  b: Balanco,
  pedidoX: number,
  pedidoZ: number,
  dt: number,
  segurado: boolean,
): void {
  const dx = Math.sin(b.rumo)
  const dz = Math.cos(b.rumo)
  const frente = segurado ? pedidoX * dx + pedidoZ * dz : 0
  if (segurado) b.rumo += (pedidoX * dz - pedidoZ * dx) * CIPO.giroDoBalanco * dt
  const amortecimento = segurado ? CIPO.amortecimento : CIPO.amortecimentoSolto
  const w2 = GRAVIDADE_DO_CIPO / b.comprimento
  let resta = dt
  while (resta > 1e-6) {
    const h = Math.min(resta, PASSO_MAXIMO)
    resta -= h
    const lado = Math.abs(b.velocidade) < 0.05 ? Math.sign(frente) : Math.sign(b.velocidade)
    const impulso = frente * lado > 0 ? (CIPO.bombear * Math.abs(frente) * lado) / b.comprimento : 0
    b.velocidade +=
      (-w2 * Math.sin(b.angulo) - amortecimento * b.velocidade + impulso * Math.cos(b.angulo)) * h
    b.angulo += b.velocidade * h
    if (Math.abs(b.angulo) > CIPO.anguloMaximo) {
      b.angulo = Math.sign(b.angulo) * CIPO.anguloMaximo
      if (b.velocidade * b.angulo > 0) b.velocidade = 0
    }
  }
}

/** Onde ficam as mãos no balanço. */
export function maosNoBalanco(b: Balanco, pivo: Ponto, saida: Ponto): Ponto {
  const s = Math.sin(b.angulo) * b.comprimento
  saida.x = pivo.x + Math.sin(b.rumo) * s
  saida.y = pivo.y - Math.cos(b.angulo) * b.comprimento
  saida.z = pivo.z + Math.cos(b.rumo) * s
  return saida
}

/** Onde fica o centro do corpo no balanço (as mãos menos `maosAcimaDoCentro`). */
export function corpoNoBalanco(b: Balanco, pivo: Ponto, saida: Ponto): Ponto {
  maosNoBalanco(b, pivo, saida)
  saida.y -= CIPO.maosAcimaDoCentro
  return saida
}

/**
 * Depois de bater em algo sólido no balanço: o ângulo volta a ser o de onde o corpo ficou, e o
 * balanço devolve um pouquinho (sem quicar longe).
 */
export function bateuNoBalanco(b: Balanco, pivo: Ponto, corpo: Ponto): void {
  const mx = corpo.x - pivo.x
  const mz = corpo.z - pivo.z
  const aoLado = mx * Math.sin(b.rumo) + mz * Math.cos(b.rumo)
  b.angulo = limitar(Math.asin(limitar(aoLado / b.comprimento, 1)), CIPO.anguloMaximo)
  b.velocidade *= -0.3
}

/**
 * A velocidade ao soltar: a do balanço (tangente ao arco) vezes `impulsoAoSoltar`, mais o
 * pulinho para cima.
 */
export function velocidadeAoSoltar(b: Balanco, saida: Ponto): Ponto {
  const v = b.velocidade * b.comprimento * CIPO.impulsoAoSoltar
  const c = Math.cos(b.angulo)
  saida.x = Math.sin(b.rumo) * c * v
  saida.y = Math.sin(b.angulo) * v + CIPO.subidaAoSoltar
  saida.z = Math.cos(b.rumo) * c * v
  return saida
}

/**
 * Distância de um ponto até a corda (do pivô até o fim dela, na pose do balanço). Para o pegar
 * no ar e para a dica no chão.
 */
export function distanciaDaCorda(b: Balanco, pivo: Ponto, corda: number, p: Ponto): number {
  const s = Math.sin(b.angulo)
  const ux = Math.sin(b.rumo) * s
  const uy = -Math.cos(b.angulo)
  const uz = Math.cos(b.rumo) * s
  const px = p.x - pivo.x
  const py = p.y - pivo.y
  const pz = p.z - pivo.z
  const t = Math.max(0, Math.min(corda, px * ux + py * uy + pz * uz))
  return Math.hypot(px - ux * t, py - uy * t, pz - uz * t)
}

function limitar(v: number, maximo: number): number {
  return Math.max(-maximo, Math.min(maximo, v))
}
