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
import { useJogo } from '../estado/contexto'
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
import type { EntradaDaLocomocao } from '../sistemas/locomocao'
import { ritmo } from '../sistemas/necessidades'
import { lugarLivreNoQuarto } from '../sistemas/ponto-de-partida'
import { AvatarDoJogo } from './avatar-do-jogo'

const MEIA_ALTURA = 0.55
const RAIO = 0.35
const DO_CENTRO_AO_PE = MEIA_ALTURA + RAIO
/**
 * O controlador do Rapier mantém esta folga entre a cápsula e o chão. O desenho desce o mesmo tanto
 * para o pé encostar no chão (sem ela o avatar anda flutuando).
 */
const FOLGA_DO_CONTROLADOR = 0.06
/** O quanto o avatar inclina para dentro da curva (radianos por radiano/segundo de giro). */
const INCLINACAO_NA_CURVA = 0.035
const INCLINACAO_MAXIMA = 0.14
const GRAVIDADE = -24
const PULO = 8.5
/**
 * Velocidades casadas com as pernas do avatar (curtas, de 0,5 m): andando o passo é o do clipe
 * "Andar" misturado com o "Correr"; correndo, o "Correr" no ritmo certo, sem o pé patinar.
 */
const ANDAR = 2.2
const CORRER = 4.6
const NADAR = 2.6
/** O avatar nada quando a cintura passa da linha da água. */
const CINTURA = 0.55

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

/**
 * O personagem: corpo cinemático com o controlador de personagem do Rapier (sobe degrau,
 * escorrega em rampa, para na parede). A gravidade e o nado são feitos aqui.
 */
export function Personagem() {
  const { controle, loja, rastro, interativos, pedidos } = useJogo()
  const { world } = useRapier()
  const corpo = useRef<RapierRigidBody>(null)
  const colisor = useRef<RapierCollider>(null)
  const visual = useRef<Group>(null)
  const velY = useRef(0)
  const noChao = useRef(false)
  const usosAtendidos = useRef(controle.usar)
  const direcao = useRef(0)
  /** O que as animações leem (velocidade de verdade, chão, subida e nado), escrito a cada quadro. */
  const movimento = useRef<EntradaDaLocomocao>({
    velocidade: 0,
    noChao: true,
    velY: 0,
    nadando: false,
  })

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
  // Giro no mundo primeiro; o deitar do nado e a inclinação da curva ficam no corpo dela.
  useEffect(() => {
    if (visual.current) visual.current.rotation.order = 'YXZ'
  }, [])

  useFrame((_, dtBruto) => {
    // Em aparelho lento o quadro é longo: o controlador varre o movimento inteiro (não
    // atravessa parede), então só limitamos para um tranco não virar um salto enorme.
    const dt = Math.min(dtBruto, 0.1)
    const b = corpo.current
    const col = colisor.current
    if (!b || !col) return
    const estado = loja.getState()
    const parado =
      estado.menuAberto ||
      estado.painelAberto !== null ||
      estado.ferramentaAberta ||
      estado.tempoAcabou ||
      estado.tempoPausado

    if (pedidos.teleporte) {
      b.setNextKinematicTranslation(pedidos.teleporte)
      velY.current = 0
      pedidos.teleporte = null
      return
    }
    if (pedidos.chaoChegando.size > 0) {
      velY.current = 0
      return
    }

    const p = b.translation()
    const nadando = p.y - DO_CENTRO_AO_PE + CINTURA < NIVEL_DA_AGUA && !noChao.current

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
    const velBase = nadando ? NADAR : controle.correr ? CORRER : ANDAR
    const vel = velBase * ritmo(estado.salvamento.necessidades)
    const vx = (frenteX * iz + ladoX * ix) * vel
    const vz = (frenteZ * iz + ladoZ * ix) * vel

    if (nadando) {
      // Boia: puxa a cintura para a linha da água, devagar.
      const alvo = NIVEL_DA_AGUA - CINTURA + DO_CENTRO_AO_PE
      velY.current = MathUtils.lerp(velY.current, (alvo - p.y) * 3, 0.15)
    } else {
      velY.current += GRAVIDADE * dt
      if (noChao.current && controle.pular && !parado) velY.current = PULO
    }

    kcc.computeColliderMovement(col, { x: vx * dt, y: velY.current * dt, z: vz * dt })
    const mov = kcc.computedMovement()
    noChao.current = kcc.computedGrounded()
    if (noChao.current && velY.current < 0) velY.current = 0
    const prox = { x: p.x + mov.x, y: p.y + mov.y, z: p.z + mov.z }
    b.setNextKinematicTranslation(prox)

    // Para onde o avatar olha (vira suave) e a inclinação para dentro da curva. Os passos, o
    // balanço do corpo e a inclinação de quem corre vêm das animações (`avatar-do-jogo.tsx`).
    const movendo = Math.hypot(vx, vz) > 0.1
    if (movendo) direcao.current = Math.atan2(vx, vz)
    const real = Math.hypot(mov.x, mov.z) / dt
    const m = movimento.current
    m.velocidade += (real - m.velocidade) * Math.min(1, dt * 14)
    m.noChao = noChao.current
    m.velY = velY.current
    m.nadando = nadando
    const v = visual.current
    if (v) {
      let delta = direcao.current - v.rotation.y
      delta = Math.atan2(Math.sin(delta), Math.cos(delta))
      const giro = delta * Math.min(1, dt * 12)
      v.rotation.y += giro
      const curva = MathUtils.clamp(
        (-giro / Math.max(dt, 1e-3)) * INCLINACAO_NA_CURVA * Math.min(1, m.velocidade / 3),
        -INCLINACAO_MAXIMA,
        INCLINACAO_MAXIMA,
      )
      v.rotation.z = MathUtils.lerp(v.rotation.z, nadando ? 0 : curva, Math.min(1, dt * 8))
      v.rotation.x = MathUtils.lerp(v.rotation.x, nadando ? 1.1 : 0, Math.min(1, dt * 6))
    }

    rastro.x = prox.x
    rastro.y = prox.y
    rastro.z = prox.z
    rastro.direcao = direcao.current
    rastro.velocidade = Math.hypot(vx, vz)
    estado.definirLugar({ dentroDeCasa: dentroDaCasa(prox.x, prox.z), nadando })
    estado.definirAlvo(parado ? null : maisPerto(interativos, prox.x, prox.z))

    if (controle.usar !== usosAtendidos.current) {
      usosAtendidos.current = controle.usar
      const alvo = estado.alvo
      if (alvo && !parado) interativos.get(alvo.id)?.agir()
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
      <group ref={visual} position={[0, -DO_CENTRO_AO_PE - FOLGA_DO_CONTROLADOR, 0]}>
        <AvatarDoJogo movimento={movimento} />
      </group>
    </RigidBody>
  )
}
