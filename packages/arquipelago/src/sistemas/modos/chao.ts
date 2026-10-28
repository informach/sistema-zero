import { dentroDaAgua } from '../agua'
import { CORPO } from '../corpo'
import { ESCALADA } from '../escalada'
import { aproximarVelocidade, PERFIS, passoDoPulo } from '../movimento'
import { cipoAoAlcance, pegarCipo } from './cipo'
import { eixoSobOsPes, entrarNoEquilibrio } from './equilibrio'
import { escadaParaPegar, pegarEscada } from './escada'
import { agarrarTronco, troncoContra } from './escalada'
import type { ModoDeMovimento } from './tipos'

/** O avatar nada quando a cintura (esta altura acima dos pés) passa da linha da água. */
export const CINTURA = 0.55
/**
 * Em pé no fundo, começa a nadar quando a água passa da cintura por isto; nadando, só volta a andar
 * quando pisa e a cintura sai da água por `SAIR_DO_NADO`. A folga entre as duas evita trocar de nado
 * para andar a cada passo na beira.
 */
export const ENTRAR_NO_NADO = 0.12
export const SAIR_DO_NADO = 0.02
/** No ar, com o embalo de um cipó ou de um pulo do tronco, a direção pedida só corrige um pouco. */
export const CONTROLE_NO_AR = 0.45
/** Nadando, a cintura é puxada para a linha da água com esta rapidez (por passo, suave). */
const BOIAR = { rapidez: 3, suavidade: 0.15 } as const

/**
 * A superfície da água sobre (x, z): o mar ou o lago mais alto em volta (os lagos das ilhas
 * completas têm fundo na colisão, então a mesma regra vale nos dois).
 */
export function superficieDaAgua(
  aguas: readonly { x: number; z: number; raioX: number; raioZ: number; giro: number; y: number }[],
  nivelDoMar: number,
  x: number,
  z: number,
): number {
  let superficie = nivelDoMar
  for (const a of aguas) if (dentroDaAgua(a, x, z)) superficie = Math.max(superficie, a.y)
  return superficie
}

/**
 * Nada ou anda? Quanto a água passa da cintura (`naAgua`, em metros), pisando ou não, e se já
 * estava nadando (a folga entre entrar e sair).
 */
export function decidirNado(nadando: boolean, noChao: boolean, naAgua: number): boolean {
  return nadando ? !(noChao && naAgua < -SAIR_DO_NADO) : naAgua > (noChao ? ENTRAR_NO_NADO : 0)
}

/**
 * Chão, ar e água (o nado é parte deste modo, `nadando`): anda e corre com peso relativo à câmera,
 * pula com tolerância, cai com a gravidade, boia na linha da água. No ar com embalo (depois do cipó
 * ou do tronco) a direção pedida só corrige. Depois do controlador: pegar um cipó no ar, grudar no
 * tronco empurrando (ou pulando nele), equilibrar no tronco caído andando ao longo dele.
 */
export const MODO_CHAO: ModoDeMovimento = {
  id: 'chao',
  valendo: () => true,
  passo(c, e, mundo) {
    const superficie = superficieDaAgua(mundo.aguas, e.nivelDoMar, e.p.x, e.p.z)
    const naAgua = superficie - (e.p.y - CORPO.doCentroAoPe + CINTURA)
    const nadando = decidirNado(c.nadando, c.noChao, naAgua)

    const velBase = nadando ? CORPO.nadar : e.correr ? CORPO.correr : CORPO.andar
    const vel = velBase * e.ritmo
    let vx: number
    let vz: number
    const comEmbalo = !c.noChao && (c.embalo.x !== 0 || c.embalo.z !== 0)
    if (comEmbalo) {
      vx = e.pedidoX * vel * CONTROLE_NO_AR + c.embalo.x
      vz = e.pedidoZ * vel * CONTROLE_NO_AR + c.embalo.z
      c.vel.x = vx
      c.vel.z = vz
    } else {
      // Com peso: a velocidade vai até a pedida pelo perfil do modo (`sistemas/movimento.ts`).
      const perfil = nadando ? PERFIS.agua : c.noChao ? PERFIS.chao : PERFIS.ar
      aproximarVelocidade(c.vel, e.pedidoX * vel, e.pedidoZ * vel, perfil, e.dt)
      vx = c.vel.x
      vz = c.vel.z
    }

    if (nadando) {
      // A água freia o embalo de um cipó ou do tronco (nadando não se pisa para zerar).
      c.embalo.x = 0
      c.embalo.z = 0
      const alvo = superficie - CINTURA + CORPO.doCentroAoPe
      c.velY += ((alvo - e.p.y) * BOIAR.rapidez - c.velY) * BOIAR.suavidade
    } else {
      c.velY -= e.gravidade * e.dt
      // Um toque, um pulo, com tolerância: logo depois de sair da beirada (coyote) ou logo antes
      // de pousar (buffer) ainda vale.
      if (passoDoPulo(c.pulo, c.noChao, e.pulou, e.dt)) c.velY = CORPO.pulo
    }

    c.nadando = nadando
    c.velDoPasso.x = vx
    c.velDoPasso.z = vz
    c.desloc.x = vx * e.dt
    c.desloc.y = c.velY * e.dt
    c.desloc.z = vz * e.dt
    return 'chao'
  },
  depois(c, e, mundo, mov, pisou, aviso) {
    c.noChao = pisou
    if (pisou) {
      if (c.velY < 0) c.velY = 0
      c.embalo.x = 0
      c.embalo.z = 0
    }
    c.prox.x = e.p.x + (mov?.x ?? 0)
    c.prox.y = e.p.y + (mov?.y ?? 0)
    c.prox.z = e.p.z + (mov?.z ?? 0)
    const vx = c.velDoPasso.x
    const vz = c.velDoPasso.z
    if (Math.hypot(vx, vz) > 0.1) c.direcao = Math.atan2(vx, vz)
    // Conversando (jogo parado com a conversa aberta), vira para quem fala com ela.
    if (e.conversa && e.parado) c.direcao = Math.atan2(e.conversa.x - e.p.x, e.conversa.z - e.p.z)
    c.velPedida = Math.hypot(vx, vz)

    if (!e.parado && !c.nadando) {
      // No ar, as mãos pegam o cipó que passar perto delas (de um cipó para o outro).
      if (!c.noChao) {
        const cipo = cipoAoAlcance(c, mundo, e.agora)
        if (cipo) pegarCipo(c, cipo, c.prox, vx, c.velY, vz, e.agora, mundo, aviso)
      }
      // Andando contra o tronco de escalar, o corpo gruda; pulando nele, gruda na hora.
      if (c.modo === 'chao' && e.agora - c.soltouDoTronco > ESCALADA.esperaDepoisDeSoltar * 1000) {
        const contra = troncoContra(c, e, mundo)
        c.contraOTronco = contra ? c.contraOTronco + e.dt : 0
        if (contra && (!c.noChao || c.contraOTronco >= ESCALADA.esperaParaGrudar)) {
          agarrarTronco(c, contra, c.prox, e.agora, aviso)
        }
      }
      // Pisando no tampo de um tronco caído estreito, andando ao longo dele: equilíbrio.
      if (c.modo === 'chao') {
        const sob = eixoSobOsPes(c, mundo)
        if (sob) entrarNoEquilibrio(c, sob.eixo, sob.s, e.agora, aviso)
      }
      // Andando contra a escada embaixo (ou para ela, do deque, em cima): pega nela.
      if (c.modo === 'chao') {
        const esc = escadaParaPegar(c, e, mundo)
        if (esc) pegarEscada(c, esc.escada, esc.altura, e.agora, aviso)
      }
    }
    return false
  },
}
