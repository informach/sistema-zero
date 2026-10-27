import { useFrame } from '@react-three/fiber'
import {
  CapsuleCollider,
  type RapierCollider,
  type RapierRigidBody,
  RigidBody,
  useRapier,
} from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, MathUtils } from 'three'
import { useJogo } from '../estado/contexto'
import { maisPerto } from '../mundo/interativos'
import { alturaDaIlha, dentroDaCasa, INICIO, NIVEL_DA_AGUA } from '../mundo/medidas'
import { ritmo } from '../sistemas/necessidades'
import { AvatarDoJogo } from './avatar-do-jogo'

const MEIA_ALTURA = 0.55
const RAIO = 0.35
const DO_CENTRO_AO_PE = MEIA_ALTURA + RAIO
const GRAVIDADE = -24
const PULO = 8.5
const ANDAR = 4.2
const CORRER = 7.2
const NADAR = 2.6
/** O avatar nada quando a cintura passa da linha da água. */
const CINTURA = 0.55

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
  const passo = useRef(0)

  const inicial = useMemo(() => {
    const p = loja.getState().salvamento.posicao
    if (p) return p
    return { x: INICIO.x, y: alturaDaIlha(INICIO.x, INICIO.z) + DO_CENTRO_AO_PE + 0.2, z: INICIO.z }
  }, [loja])

  const kcc = useMemo(() => {
    const c = world.createCharacterController(0.06)
    c.enableAutostep(0.45, 0.25, true)
    c.enableSnapToGround(0.35)
    c.setMaxSlopeClimbAngle((52 * Math.PI) / 180)
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180)
    c.setApplyImpulsesToDynamicBodies(false)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(kcc), [world, kcc])

  useFrame((_, dtBruto) => {
    // Em aparelho lento o quadro é longo: o controlador varre o movimento inteiro (não
    // atravessa parede), então só limitamos para um tranco não virar um salto enorme.
    const dt = Math.min(dtBruto, 0.1)
    const b = corpo.current
    const col = colisor.current
    if (!b || !col) return
    const estado = loja.getState()
    const parado =
      estado.menuAberto || estado.ferramentaAberta || estado.tempoAcabou || estado.tempoPausado

    if (pedidos.teleporte) {
      b.setNextKinematicTranslation(pedidos.teleporte)
      velY.current = 0
      pedidos.teleporte = null
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

    // Para onde o avatar olha, e um balanço simples enquanto anda (as animações de andar
    // entram na próxima fase; por enquanto o avatar usa as poses que a plataforma já tem).
    const movendo = Math.hypot(vx, vz) > 0.1
    if (movendo) direcao.current = Math.atan2(vx, vz)
    passo.current += movendo ? dt * (controle.correr ? 14 : 9) : 0
    const v = visual.current
    if (v) {
      let delta = direcao.current - v.rotation.y
      delta = Math.atan2(Math.sin(delta), Math.cos(delta))
      v.rotation.y += delta * Math.min(1, dt * 12)
      v.position.y =
        -DO_CENTRO_AO_PE + (movendo && !nadando ? Math.abs(Math.sin(passo.current)) * 0.07 : 0)
      v.rotation.x = MathUtils.lerp(
        v.rotation.x,
        nadando ? 1.1 : movendo && controle.correr ? 0.12 : 0,
        0.15,
      )
    }

    rastro.x = prox.x
    rastro.y = prox.y
    rastro.z = prox.z
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
      <group ref={visual} position={[0, -DO_CENTRO_AO_PE, 0]}>
        <AvatarDoJogo pose="Idle" />
      </group>
    </RigidBody>
  )
}
