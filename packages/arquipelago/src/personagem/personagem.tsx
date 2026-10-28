import { useFrame } from '@react-three/fiber'
import {
  CapsuleCollider,
  type RapierCollider,
  type RapierRigidBody,
  RigidBody,
  useRapier,
} from '@react-three/rapier'
import type { QuartoDoJogo } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, MathUtils } from 'three'
import { type CipoVivo, type ModoDoCorpo, type TroncoVivo, useJogo } from '../estado/contexto'
import { dentroDaAgua } from '../mundo/bosque'
import { maisPerto } from '../mundo/interativos'
import {
  alturaDaIlha,
  CENTRO_DA_CASA,
  dentroDaCasa,
  INICIO,
  NIVEL_DA_AGUA,
  PORTA,
  QUARTO,
} from '../mundo/medidas'
import {
  bateuNoBalanco,
  CIPO,
  corpoNoBalanco,
  distanciaDaCorda,
  type Ponto,
  passoDoBalanco,
  pegarCipo,
  velocidadeAoSoltar,
} from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import {
  corpoNaEscalada,
  criarAgarrado,
  distanciaDaCasca,
  ESCALADA,
  grudar,
  naAlturaDoTronco,
  passoDaEscalada,
  saltoDaEscalada,
} from '../sistemas/escalada'
import type { EntradaDaLocomocao } from '../sistemas/locomocao'
import { ritmo } from '../sistemas/necessidades'
import { lugarLivreNoQuarto } from '../sistemas/ponto-de-partida'
import { AvatarDoJogo } from './avatar-do-jogo'
import { acharBracos, type BracosDoAvatar, levantarBracos } from './bracos'

const MEIA_ALTURA = CORPO.meiaAltura
const RAIO = CORPO.raio
const DO_CENTRO_AO_PE = CORPO.doCentroAoPe
const GRAVIDADE = -24
const PULO = 8.5
const ANDAR = CORPO.andar
const CORRER = CORPO.correr
const NADAR = 2.6
/**
 * O controlador do Rapier mantém esta folga entre a cápsula e o chão. O desenho desce o mesmo tanto
 * para o pé encostar no chão (sem ela o avatar anda flutuando).
 */
const FOLGA_DO_CONTROLADOR = 0.06
/** O quanto o avatar inclina para dentro da curva (radianos por radiano/segundo de giro). */
const INCLINACAO_NA_CURVA = 0.035
const INCLINACAO_MAXIMA = 0.14
/** O avatar nada quando a cintura passa da linha da água. */
const CINTURA = 0.55
/** No ar, com o embalo de um cipó ou de um pulo do tronco, a direção pedida só corrige um pouco. */
const CONTROLE_NO_AR = 0.45
/** O balanço bateu em algo sólido quando o corpo fica mais longe que isto de onde devia ir. */
const FOLGA_DO_BALANCO = 0.03
/** Soltar do tronco sem pular (tecla de usar, ou descer até o chão): um passinho para fora. */
const PASSO_PARA_FORA_DO_TRONCO = 1.5
/**
 * No cipó a câmera olha para um ponto abaixo do pivô, a esta fração da pegada: o balanço inteiro
 * cabe sem ela correr atrás.
 */
const FOCO_ABAIXO_DO_PIVO = 0.62

/**
 * Para onde ir quando o ponto pedido, dentro de casa, cai em cima de um móvel: o lugar livre mais
 * perto dele (ou a porta, com o quarto todo tomado). `null` quando o ponto já está livre.
 */
function lugarSeguro(
  quarto: QuartoDoJogo,
  pedido: { x: number; z: number },
): { x: number; y: number; z: number } | null {
  const noQuarto = { x: pedido.x - CENTRO_DA_CASA.x, z: pedido.z - CENTRO_DA_CASA.z }
  const livre = lugarLivreNoQuarto(quarto, noQuarto, QUARTO)
  if (livre === noQuarto) return null
  const x = livre ? CENTRO_DA_CASA.x + livre.x : CENTRO_DA_CASA.x + PORTA.x
  const z = livre ? CENTRO_DA_CASA.z + livre.z : CENTRO_DA_CASA.z + QUARTO.fundo / 2 + 1.2
  return { x, y: alturaDaIlha(x, z) + DO_CENTRO_AO_PE + 0.2, z }
}

/** O que o personagem mexe a cada quadro: objetos fixos, nada de alocar no laço da física. */
interface Vivo {
  modo: ModoDoCorpo
  cipo: CipoVivo | null
  tronco: TroncoVivo | null
  /** Segundos no modo atual (o encaixe suave depois de pegar ou grudar). */
  noModo: number
  /** A velocidade que vem do cipó ou do pulo do tronco, até pisar de novo. */
  embalo: Ponto
  alvo: Ponto
  inicio: Ponto
  maos: Ponto
  prox: Ponto
  desloc: Ponto
  agarrado: ReturnType<typeof criarAgarrado>
  contraOTronco: number
  soltouDoTronco: number
}

/**
 * O personagem: corpo cinemático com o controlador de personagem do Rapier (sobe degrau,
 * escorrega em rampa, para na parede). A gravidade e o nado são feitos aqui, e também o cipó
 * (`sistemas/cipo.ts`) e a escalada do tronco (`sistemas/escalada.ts`), que as ilhas completas
 * registram em `movimento`.
 */
export function Personagem() {
  const { controle, loja, rastro, interativos, pedidos, movimento } = useJogo()
  const { world } = useRapier()
  const corpo = useRef<RapierRigidBody>(null)
  const colisor = useRef<RapierCollider>(null)
  const visual = useRef<Group>(null)
  const velY = useRef(0)
  const noChao = useRef(false)
  const usosAtendidos = useRef(controle.usar)
  const pulosAtendidos = useRef(controle.pulos)
  const direcao = useRef(0)
  /** O que as animações leem (velocidade de verdade, chão, subida, nado), escrito a cada quadro. */
  const animacao = useRef<EntradaDaLocomocao>({
    velocidade: 0,
    noChao: true,
    velY: 0,
    nadando: false,
    pendurado: false,
  })
  const v = useRef<Vivo>({
    modo: 'chao',
    cipo: null,
    tronco: null,
    noModo: 0,
    embalo: { x: 0, y: 0, z: 0 },
    alvo: { x: 0, y: 0, z: 0 },
    inicio: { x: 0, y: 0, z: 0 },
    maos: { x: 0, y: 0, z: 0 },
    prox: { x: 0, y: 0, z: 0 },
    desloc: { x: 0, y: 0, z: 0 },
    agarrado: criarAgarrado(),
    contraOTronco: 0,
    soltouDoTronco: Number.NEGATIVE_INFINITY,
  }).current

  const inicial = useMemo(() => {
    const { salvamento, quarto } = loja.getState()
    const p = salvamento.posicao
    if (p && !dentroDaCasa(p.x, p.z)) return p
    // Dentro de casa (o começo de sempre ou uma posição salva): os móveis podem ter mudado.
    const pedido = p ?? {
      x: INICIO.x,
      y: alturaDaIlha(INICIO.x, INICIO.z) + DO_CENTRO_AO_PE + 0.2,
      z: INICIO.z,
    }
    return lugarSeguro(quarto, pedido) ?? pedido
  }, [loja])

  // A criança mudou o quarto com o jogo aberto: se um móvel caiu em cima dela, ela sai para o lado.
  useEffect(
    () =>
      loja.subscribe((s, antes) => {
        if (s.quarto === antes.quarto || !dentroDaCasa(rastro.x, rastro.z)) return
        const seguro = lugarSeguro(s.quarto, rastro)
        if (seguro) pedidos.teleporte = seguro
      }),
    [loja, rastro, pedidos],
  )

  const kcc = useMemo(() => {
    const c = world.createCharacterController(FOLGA_DO_CONTROLADOR)
    c.enableAutostep(0.45, 0.25, true)
    c.enableSnapToGround(0.35)
    c.setMaxSlopeClimbAngle((52 * Math.PI) / 180)
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180)
    c.setApplyImpulsesToDynamicBodies(false)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(kcc), [world, kcc])
  // No cipó, sem subir degrau nem grudar no chão: o balanço passa a `folgaDosPes` do chão, e o
  // grudar puxaria o corpo para baixo (o jogo acharia que bateu e frearia o balanço).
  const kccNoCipo = useMemo(() => {
    const c = world.createCharacterController(FOLGA_DO_CONTROLADOR)
    c.setApplyImpulsesToDynamicBodies(false)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(kccNoCipo), [world, kccNoCipo])

  // No cipó e no tronco os braços vão para cima, por cima da pose (os ossos aparecem quando o
  // avatar termina de carregar).
  const bracos = useRef<BracosDoAvatar | null>(null)
  /** Já procurou os ossos nesta ida ao cipó ou ao tronco (não procura de novo a cada quadro). */
  const procurouBracos = useRef(false)
  const depoisDaPose = useMemo(
    () => () => {
      const corpoVisivel = visual.current
      if (v.modo === 'chao' || !corpoVisivel) return
      if (!bracos.current && !procurouBracos.current) {
        procurouBracos.current = true
        bracos.current = acharBracos(corpoVisivel)
      }
      if (bracos.current) levantarBracos(bracos.current, corpoVisivel, v.modo)
    },
    [v],
  )

  // Trocas de modo (fora do quadro: criadas uma vez por montagem).
  const acoes = useMemo(() => {
    const mudarModo = (modo: ModoDoCorpo, agora: number) => {
      if (v.cipo && modo !== 'cipo') {
        v.cipo.seguro = false
        v.cipo.soltoEm = agora
        v.cipo = null
      }
      if (v.tronco && modo !== 'escalada') {
        v.soltouDoTronco = agora
        v.tronco = null
      }
      v.modo = modo
      v.noModo = 0
      procurouBracos.current = false
      movimento.modo = modo
      loja.getState().definirModo(modo)
    }
    /** Pegar o cipó com o corpo em `de`, trazendo a velocidade (vx, vy, vz). */
    const pegar = (c: CipoVivo, de: Ponto, vx: number, vy: number, vz: number, agora: number) => {
      v.maos.x = de.x
      v.maos.y = de.y + CIPO.maosAcimaDoCentro
      v.maos.z = de.z
      v.alvo.x = vx
      v.alvo.y = vy
      v.alvo.z = vz
      pegarCipo(c.balanco, c.pivo, v.maos, v.alvo, direcao.current, c.pegada)
      movimento.foco.x = c.pivo.x
      movimento.foco.y = c.pivo.y - c.pegada * FOCO_ABAIXO_DO_PIVO
      movimento.foco.z = c.pivo.z
      v.inicio.x = de.x
      v.inicio.y = de.y
      v.inicio.z = de.z
      mudarModo('cipo', agora)
      c.seguro = true
      v.cipo = c
      velY.current = 0
    }
    const agarrar = (t: TroncoVivo, de: Ponto, agora: number) => {
      grudar(t.tronco, de, v.agarrado, DO_CENTRO_AO_PE, CIPO.maosAcimaDoCentro)
      v.inicio.x = de.x
      v.inicio.y = de.y
      v.inicio.z = de.z
      v.contraOTronco = 0
      mudarModo('escalada', agora)
      v.tronco = t
      velY.current = 0
    }
    return { mudarModo, pegar, agarrar }
  }, [v, movimento, loja])

  useFrame((_, dtBruto) => {
    // Em aparelho lento o quadro é longo: o controlador varre o movimento inteiro (não
    // atravessa parede), então só limitamos para um tranco não virar um salto enorme.
    const dt = Math.min(dtBruto, 0.1)
    const b = corpo.current
    const col = colisor.current
    if (!b || !col) return
    const estado = loja.getState()
    const agora = performance.now()
    const parado =
      estado.menuAberto ||
      estado.painelAberto !== null ||
      estado.ferramentaAberta ||
      estado.tempoAcabou ||
      estado.tempoPausado ||
      estado.tempoSincronizando ||
      estado.resultado !== null

    if (pedidos.teleporte) {
      if (v.modo !== 'chao') acoes.mudarModo('chao', agora)
      b.setNextKinematicTranslation(pedidos.teleporte)
      velY.current = 0
      v.embalo.x = 0
      v.embalo.z = 0
      if (pedidos.olharPara !== null) {
        direcao.current = pedidos.olharPara
        // A câmera vai para as costas (ela olha para `-(sin g, cos g)`).
        rastro.giro = pedidos.olharPara + Math.PI
        if (visual.current) visual.current.rotation.y = pedidos.olharPara
        pedidos.olharPara = null
      }
      pedidos.teleporte = null
      return
    }
    if (pedidos.chaoChegando.size > 0) {
      velY.current = 0
      return
    }

    const p = b.translation()
    v.noModo += dt

    // Direção pedida, relativa ao giro da câmera.
    let ix = parado ? 0 : controle.eixoX
    let iz = parado ? 0 : controle.eixoZ
    const tam = Math.hypot(ix, iz)
    if (tam > 1) {
      ix /= tam
      iz /= tam
    }
    const g = rastro.giro
    const frenteX = -Math.sin(g)
    const frenteZ = -Math.cos(g)
    const ladoX = Math.cos(g)
    const ladoZ = -Math.sin(g)
    const pedidoX = frenteX * iz + ladoX * ix
    const pedidoZ = frenteZ * iz + ladoZ * ix
    const pulou = !parado && controle.pulos !== pulosAtendidos.current
    pulosAtendidos.current = controle.pulos
    let usou = controle.usar !== usosAtendidos.current
    usosAtendidos.current = controle.usar

    // Pedido de um interativo ("Pegar o cipó", "Escalar o tronco").
    const pedido = movimento.pedido
    movimento.pedido = null
    if (pedido && !parado && v.modo === 'chao') {
      if (pedido.tipo === 'cipo') {
        for (const c of movimento.cipos) {
          if (c.id === pedido.id && !c.seguro) acoes.pegar(c, p, 0, 0, 0, agora)
        }
      } else {
        for (const t of movimento.troncos) {
          if (t.id === pedido.id) acoes.agarrar(t, p, agora)
        }
      }
    }

    let vx = 0
    let vz = 0
    let nadando = false
    let afundar = 0
    const prox = v.prox

    if (v.modo === 'cipo' && v.cipo && movimento.cipos.includes(v.cipo)) {
      const c = v.cipo
      passoDoBalanco(c.balanco, pedidoX, pedidoZ, dt, true)
      corpoNoBalanco(c.balanco, c.pivo, v.alvo)
      // Logo depois de pegar, o corpo vai suave até o lugar do balanço (sobe ou escorrega).
      const t = Math.min(1, v.noModo / CIPO.encaixe)
      const k = t * t * (3 - 2 * t)
      v.desloc.x = v.inicio.x + (v.alvo.x - v.inicio.x) * k - p.x
      v.desloc.y = v.inicio.y + (v.alvo.y - v.inicio.y) * k - p.y
      v.desloc.z = v.inicio.z + (v.alvo.z - v.inicio.z) * k - p.z
      kccNoCipo.computeColliderMovement(col, v.desloc)
      const mov = kccNoCipo.computedMovement()
      prox.x = p.x + mov.x
      prox.y = p.y + mov.y
      prox.z = p.z + mov.z
      if (
        t >= 1 &&
        Math.hypot(mov.x - v.desloc.x, mov.y - v.desloc.y, mov.z - v.desloc.z) > FOLGA_DO_BALANCO
      ) {
        v.maos.x = prox.x
        v.maos.y = prox.y + CIPO.maosAcimaDoCentro
        v.maos.z = prox.z
        bateuNoBalanco(c.balanco, c.pivo, v.maos)
      }
      b.setNextKinematicTranslation(prox)
      direcao.current = c.balanco.rumo
      noChao.current = false
      if (pulou || (usou && !parado)) {
        velocidadeAoSoltar(c.balanco, v.embalo)
        velY.current = v.embalo.y
        acoes.mudarModo('chao', agora)
        usou = false
      }
    } else if (v.modo === 'escalada' && v.tronco && movimento.troncos.includes(v.tronco)) {
      const t = v.tronco.tronco
      const lado = v.agarrado.lado
      // Frente e trás só sobem e descem (a câmera não importa). Os lados seguem a tela: olhando
      // para o tronco, a direita dele é `(cos lado, −sin lado)`; se a câmera está do outro lado,
      // a direita da tela é a esquerda dele.
      const subir = iz
      const mesmaMao = ladoX * Math.cos(lado) - ladoZ * Math.sin(lado) >= 0 ? 1 : -1
      const deLado = ix * mesmaMao
      const fim = passoDaEscalada(
        t,
        v.agarrado,
        subir,
        deLado,
        dt,
        RAIO,
        DO_CENTRO_AO_PE,
        CIPO.maosAcimaDoCentro,
      )
      corpoNaEscalada(t, v.agarrado, RAIO, v.alvo)
      const k = Math.min(1, v.noModo / CIPO.encaixe)
      prox.x = v.inicio.x + (v.alvo.x - v.inicio.x) * k
      prox.y = v.inicio.y + (v.alvo.y - v.inicio.y) * k
      prox.z = v.inicio.z + (v.alvo.z - v.inicio.z) * k
      b.setNextKinematicTranslation(prox)
      direcao.current = v.agarrado.lado + Math.PI
      noChao.current = false
      if (pulou) {
        saltoDaEscalada(v.agarrado, pedidoX, pedidoZ, v.embalo)
        velY.current = v.embalo.y
        direcao.current = Math.atan2(v.embalo.x, v.embalo.z)
        acoes.mudarModo('chao', agora)
      } else if (fim === 'desceu' || (usou && !parado)) {
        velY.current = 0
        v.embalo.x = Math.sin(v.agarrado.lado) * PASSO_PARA_FORA_DO_TRONCO
        v.embalo.z = Math.cos(v.agarrado.lado) * PASSO_PARA_FORA_DO_TRONCO
        acoes.mudarModo('chao', agora)
        usou = false
      }
    } else {
      if (v.modo !== 'chao') acoes.mudarModo('chao', agora)
      // Nada no mar (a cintura passou da linha da água) e no lago raso das ilhas completas.
      let lagoY = Number.NaN
      for (const a of movimento.aguas) {
        if (dentroDaAgua(a, p.x, p.z) && p.y - DO_CENTRO_AO_PE < a.y + 0.3) lagoY = a.y
      }
      const noLago = !Number.isNaN(lagoY) && noChao.current
      nadando = (p.y - DO_CENTRO_AO_PE + CINTURA < NIVEL_DA_AGUA && !noChao.current) || noLago
      // O lago não tem fundo no desenho: o corpo fica no chão e o avatar afunda até a cintura.
      if (noLago) afundar = Math.max(0, p.y - (lagoY - CINTURA + DO_CENTRO_AO_PE) - 0.15)

      const velBase = nadando ? NADAR : controle.correr ? CORRER : ANDAR
      const vel = velBase * ritmo(estado.salvamento.necessidades)
      const comEmbalo = !noChao.current && (v.embalo.x !== 0 || v.embalo.z !== 0)
      const controleAqui = comEmbalo ? CONTROLE_NO_AR : 1
      vx = pedidoX * vel * controleAqui + (comEmbalo ? v.embalo.x : 0)
      vz = pedidoZ * vel * controleAqui + (comEmbalo ? v.embalo.z : 0)

      if (nadando && !noLago) {
        // A água freia o embalo de um cipó ou do tronco (nadando não se pisa para zerar).
        v.embalo.x = 0
        v.embalo.z = 0
        // Boia: puxa a cintura para a linha da água, devagar.
        const alvo = NIVEL_DA_AGUA - CINTURA + DO_CENTRO_AO_PE
        velY.current = MathUtils.lerp(velY.current, (alvo - p.y) * 3, 0.15)
      } else {
        velY.current += GRAVIDADE * dt
        if (noChao.current && controle.pular && !parado && !nadando) velY.current = PULO
      }

      v.desloc.x = vx * dt
      v.desloc.y = velY.current * dt
      v.desloc.z = vz * dt
      kcc.computeColliderMovement(col, v.desloc)
      const mov = kcc.computedMovement()
      noChao.current = kcc.computedGrounded()
      if (noChao.current) {
        if (velY.current < 0) velY.current = 0
        v.embalo.x = 0
        v.embalo.z = 0
      }
      prox.x = p.x + mov.x
      prox.y = p.y + mov.y
      prox.z = p.z + mov.z
      b.setNextKinematicTranslation(prox)
      if (Math.hypot(vx, vz) > 0.1) direcao.current = Math.atan2(vx, vz)

      if (!parado && !nadando) {
        // No ar, as mãos pegam o cipó que passar perto delas (de um cipó para o outro).
        if (!noChao.current) {
          v.maos.x = prox.x
          v.maos.y = prox.y + CIPO.maosAcimaDoCentro
          v.maos.z = prox.z
          for (const c of movimento.cipos) {
            if (c.seguro || agora - c.soltoEm < CIPO.esperaParaPegarDeNovo * 1000) continue
            if (distanciaDaCorda(c.balanco, c.pivo, c.corda, v.maos) < CIPO.raioDaPegadaNoAr) {
              acoes.pegar(c, prox, vx, velY.current, vz, agora)
              break
            }
          }
        }
        // Andando contra o tronco de escalar, o corpo gruda; pulando nele, gruda na hora.
        if (v.modo === 'chao' && agora - v.soltouDoTronco > ESCALADA.esperaDepoisDeSoltar * 1000) {
          let contra: TroncoVivo | null = null
          for (const t of movimento.troncos) {
            const tr = t.tronco
            if (!naAlturaDoTronco(tr, prox.y, DO_CENTRO_AO_PE, CIPO.maosAcimaDoCentro)) continue
            if (distanciaDaCasca(tr, prox, RAIO) > ESCALADA.distanciaParaGrudar) continue
            const ax = (tr.base.x + tr.topo.x) / 2 - prox.x
            const az = (tr.base.z + tr.topo.z) / 2 - prox.z
            const pedido = Math.hypot(pedidoX, pedidoZ)
            if (pedido < 0.2) continue
            const d = (Math.hypot(ax, az) || 1) * pedido
            if ((pedidoX * ax + pedidoZ * az) / d > 0.6) contra = t
          }
          v.contraOTronco = contra ? v.contraOTronco + dt : 0
          if (contra && (!noChao.current || v.contraOTronco >= ESCALADA.esperaParaGrudar)) {
            acoes.agarrar(contra, prox, agora)
          }
        }
      }
    }
    movimento.noChao = v.modo === 'chao' && noChao.current

    // Para onde o avatar olha (vira suave), a inclinação na curva e o que as animações leem. Os
    // passos, o balanço do corpo e a inclinação de quem corre vêm das animações (`avatar-do-jogo`).
    const m = animacao.current
    const real = v.modo === 'chao' ? Math.hypot(prox.x - p.x, prox.z - p.z) / dt : 0
    m.velocidade += (real - m.velocidade) * Math.min(1, dt * 14)
    m.noChao = v.modo !== 'chao' || noChao.current
    m.velY = velY.current
    m.nadando = nadando
    m.pendurado = v.modo !== 'chao'
    const vis = visual.current
    if (vis) {
      let delta = direcao.current - vis.rotation.y
      delta = Math.atan2(Math.sin(delta), Math.cos(delta))
      const giro = delta * Math.min(1, dt * 12)
      vis.rotation.y += giro
      vis.position.y = -DO_CENTRO_AO_PE - FOLGA_DO_CONTROLADOR - afundar
      // No cipó o corpo pende junto com a corda (as mãos para o pivô); nadando, deita.
      const inclinar = v.modo === 'cipo' && v.cipo ? -v.cipo.balanco.angulo : nadando ? 1.1 : 0
      vis.rotation.x = MathUtils.lerp(vis.rotation.x, inclinar, v.modo === 'cipo' ? 0.35 : 0.15)
      const curva =
        v.modo === 'chao' && !nadando
          ? MathUtils.clamp(
              (-giro / Math.max(dt, 1e-3)) * INCLINACAO_NA_CURVA * Math.min(1, m.velocidade / 3),
              -INCLINACAO_MAXIMA,
              INCLINACAO_MAXIMA,
            )
          : 0
      vis.rotation.z = MathUtils.lerp(vis.rotation.z, curva, Math.min(1, dt * 8))
    }

    rastro.x = prox.x
    rastro.y = prox.y
    rastro.z = prox.z
    rastro.direcao = direcao.current
    // O Zappy olha para onde ela vai: no cipó e no tronco ela está sempre "andando".
    rastro.velocidade = v.modo === 'chao' ? Math.hypot(vx, vz) : 1
    estado.definirLugar({ dentroDeCasa: dentroDaCasa(prox.x, prox.z), nadando })
    estado.definirAlvo(parado || v.modo !== 'chao' ? null : maisPerto(interativos, prox.x, prox.z))

    if (usou && v.modo === 'chao' && !parado) {
      const alvo = estado.alvo
      if (alvo) interativos.get(alvo.id)?.agir()
    }
  })

  return (
    <RigidBody
      ref={corpo}
      type="kinematicPosition"
      colliders={false}
      position={[inicial.x, inicial.y, inicial.z]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider ref={colisor} args={[MEIA_ALTURA, RAIO]} />
      <group
        ref={(g) => {
          visual.current = g
          // O giro primeiro e a inclinação no corpo: nadar e balançar inclinam para a frente dele.
          if (g) g.rotation.order = 'YXZ'
        }}
        position={[0, -DO_CENTRO_AO_PE - FOLGA_DO_CONTROLADOR, 0]}
      >
        <AvatarDoJogo movimento={animacao} depoisDaPose={depoisDaPose} />
      </group>
    </RigidBody>
  )
}
