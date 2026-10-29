import type { CipoVivo } from '../../estado/contexto'
import {
  bateuNoBalanco,
  CIPO,
  corpoNoBalanco,
  distanciaDaCorda,
  type Ponto,
  passoDoBalanco,
  pegarCipo as pegarOBalanco,
  velocidadeAoSoltar,
} from '../cipo'
import type { AvisoDeModo, EstadoDoCorpo, ModoDeMovimento, MundoDoMovimento } from './tipos'
import { mudarModo } from './trocas'

/** O balanço bateu em algo sólido quando o corpo fica mais longe que isto de onde devia ir. */
export const FOLGA_DO_BALANCO = 0.03
/**
 * No cipó a câmera olha para um ponto abaixo do pivô, a esta fração da pegada: o balanço inteiro
 * cabe sem ela correr atrás.
 */
export const FOCO_ABAIXO_DO_PIVO = 0.62

/**
 * Entra no cipó com o corpo em `de`, trazendo a velocidade (vx, vy, vz): o balanço começa com ela
 * (pegar correndo ou no ar já balança) e a câmera passa a olhar para o meio da corda.
 */
export function pegarCipo(
  c: EstadoDoCorpo,
  cipo: CipoVivo,
  de: Ponto,
  vx: number,
  vy: number,
  vz: number,
  agora: number,
  mundo: MundoDoMovimento,
  aviso: AvisoDeModo,
): void {
  c.maos.x = de.x
  c.maos.y = de.y + CIPO.maosAcimaDoCentro
  c.maos.z = de.z
  c.alvo.x = vx
  c.alvo.y = vy
  c.alvo.z = vz
  pegarOBalanco(cipo.balanco, cipo.pivo, c.maos, c.alvo, c.direcao, cipo.pegada)
  mundo.foco.x = cipo.pivo.x
  mundo.foco.y = cipo.pivo.y - cipo.pegada * FOCO_ABAIXO_DO_PIVO
  mundo.foco.z = cipo.pivo.z
  c.inicio.x = de.x
  c.inicio.y = de.y
  c.inicio.z = de.z
  mudarModo(c, 'cipo', agora, aviso)
  cipo.seguro = true
  c.cipo = cipo
  c.velY = 0
}

/**
 * Pode pegar algum cipó no ar? As mãos (acima de `prox`) passando perto de uma corda que ninguém
 * segura e que não acabou de ser solta. Devolve o primeiro.
 */
export function cipoAoAlcance(
  c: EstadoDoCorpo,
  mundo: MundoDoMovimento,
  agora: number,
): CipoVivo | null {
  c.maos.x = c.prox.x
  c.maos.y = c.prox.y + CIPO.maosAcimaDoCentro
  c.maos.z = c.prox.z
  for (const cipo of mundo.cipos) {
    if (cipo.seguro || agora - cipo.soltoEm < CIPO.esperaParaPegarDeNovo * 1000) continue
    if (distanciaDaCorda(cipo.balanco, cipo.pivo, cipo.corda, c.maos) < CIPO.raioDaPegadaNoAr) {
      return cipo
    }
  }
  return null
}

/**
 * O cipó, o pêndulo controlado (`sistemas/cipo.ts`): pedir para o lado do balanço bombeia, de
 * través vira o plano. Logo depois de pegar, o corpo vai suave até o lugar do balanço (`encaixe`).
 * O controlador do cipó não gruda no chão; batendo em algo, o balanço perde o embalo. Pular ou
 * usar solta com a velocidade do balanço.
 */
export const MODO_CIPO: ModoDeMovimento = {
  id: 'cipo',
  valendo: (c, mundo) => c.cipo !== null && mundo.cipos.includes(c.cipo),
  passo(c, e) {
    const cipo = c.cipo
    if (!cipo) return 'direto'
    passoDoBalanco(cipo.balanco, e.pedidoX, e.pedidoZ, e.dt, true)
    corpoNoBalanco(cipo.balanco, cipo.pivo, c.alvo)
    const t = Math.min(1, c.noModo / CIPO.encaixe)
    const k = t * t * (3 - 2 * t)
    c.desloc.x = c.inicio.x + (c.alvo.x - c.inicio.x) * k - e.p.x
    c.desloc.y = c.inicio.y + (c.alvo.y - c.inicio.y) * k - e.p.y
    c.desloc.z = c.inicio.z + (c.alvo.z - c.inicio.z) * k - e.p.z
    return 'cipo'
  },
  depois(c, e, _mundo, mov, _pisou, aviso) {
    const cipo = c.cipo
    if (!cipo || !mov) return false
    c.prox.x = e.p.x + mov.x
    c.prox.y = e.p.y + mov.y
    c.prox.z = e.p.z + mov.z
    const encaixou = c.noModo >= CIPO.encaixe
    if (
      encaixou &&
      Math.hypot(mov.x - c.desloc.x, mov.y - c.desloc.y, mov.z - c.desloc.z) > FOLGA_DO_BALANCO
    ) {
      c.maos.x = c.prox.x
      c.maos.y = c.prox.y + CIPO.maosAcimaDoCentro
      c.maos.z = c.prox.z
      bateuNoBalanco(cipo.balanco, cipo.pivo, c.maos)
    }
    c.direcao = cipo.balanco.rumo
    c.noChao = false
    c.nadando = false
    c.velPedida = 1
    if (e.pulou || (e.usou && !e.parado)) {
      velocidadeAoSoltar(cipo.balanco, c.embalo)
      c.velY = c.embalo.y
      mudarModo(c, 'chao', e.agora, aviso)
      return true
    }
    return false
  },
}
