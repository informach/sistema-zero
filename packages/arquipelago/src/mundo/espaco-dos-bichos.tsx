import {
  CapsuleCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from '@react-three/rapier'
import { FLOOR_HALF_Z } from '@sistemazero/avatar-quarto/quarto/coords'
import { Pet3D, type PetAvoid } from '@sistemazero/avatar-quarto/quarto/pet-3d'
import { useMemo, useRef } from 'react'
import type { Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import {
  BICHO_QUE_SEGURA,
  capsulaDoEspaco,
  criarEmpurrao,
  ESPACO,
  type EspacoDoBicho,
  empurrando,
  espacoDoBicho,
  passaroNoAlto,
  passoDoEmpurrao,
  pedidoNoChao,
  subidaDoPassaro,
} from '../sistemas/espaco-dos-bichos'
import { jogoPausado } from '../sistemas/pausa'
import { GRUPO_SO_DO_CORPO } from './grupos'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA, PASSO_DA_FISICA } from './medidas'

/**
 * A cápsula do espaço de um bicho, dentro do `RigidBody` dele: só segura o corpo da criança (grupo
 * 1, que o raio da câmera não enxerga) e o corpo do bicho leva `BICHO_QUE_SEGURA` no `userData`
 * (o controlador dela aceita esse cinemático, `cinematicoQueSegura`). `pe` é a altura do pé do
 * bicho em relação ao meio do corpo do Rapier.
 */
export function ColisorDoEspaco({ espaco, pe = 0 }: { espaco: EspacoDoBicho; pe?: number }) {
  const c = capsulaDoEspaco(espaco)
  return (
    <CapsuleCollider
      args={[c.meiaAltura, c.raio]}
      position={[0, pe + c.y, 0]}
      collisionGroups={GRUPO_SO_DO_CORPO}
    />
  )
}

/** O chão do quarto no mundo (o mesmo `BASE` de `mundo/casa.tsx`). */
const CHAO_DO_QUARTO = ALTURA_DA_TERRA + 0.02
/** O voo de sempre do passarinho do quarto (o `Pet3D` o põe a 0,7 do chão). */
const VOO_DO_QUARTO = 0.7
const LONGE = 1e4

/**
 * O bichinho do quarto com espaço próprio: o mesmo `Pet3D` da plataforma (com as props opcionais
 * de posição e ponto a evitar) e uma cápsula cinemática que segue a posição que ele informa. A
 * criança, perto e à frente dele, faz ele parar e virar; empurrando por meio segundo, ele dá um
 * passinho; o passarinho sobe acima da cabeça dela (a cápsula sobe junto).
 */
export function PetDoQuartoComEspaco({
  petId,
  occupied,
  reducedMotion,
  paused,
}: {
  petId: string | null
  occupied: ReadonlySet<string>
  reducedMotion: boolean
  paused: boolean
}) {
  const { loja, rastro, controle } = useJogo()
  const corpo = useRef<RapierRigidBody>(null)
  const lugar = useRef({ x: 0, z: FLOOR_HALF_Z - 1.5 })
  const evitar = useRef<PetAvoid>({ x: LONGE, z: LONGE, radius: ESPACO.raioDeDesvio, nudge: 0 })
  const empurrao = useRef(criarEmpurrao())
  const pedido = useRef({ x: 0, z: 0 })
  const noAlto = useRef(false)
  const subida = useRef(0)
  const voa = petId === 'pet-passaro'
  const espaco = espacoDoBicho(petId ?? 'pet-cachorro')
  const cap = capsulaDoEspaco(espaco)
  /** Um marcador vazio no lugar dele (o medidor o lê em `__arquipelagoLerQuarto`). */
  const marca = useRef<Object3D>(null)
  const aoMudarDeLugar = useMemo(
    () => (x: number, z: number, rumo: number) => {
      lugar.current.x = x
      lugar.current.z = z
      marca.current?.position.set(x, 0, z)
      if (marca.current) marca.current.rotation.y = rumo
    },
    [],
  )

  useBeforePhysicsStep(() => {
    const b = corpo.current
    if (!b) return
    const dt = PASSO_DA_FISICA
    const a = evitar.current
    const peDela = rastro.y - CORPO.doCentroAoPe
    const aqui = Math.abs(peDela - CHAO_DO_QUARTO) < ESPACO.mesmoAndar
    a.x = aqui ? rastro.x - CENTRO_DA_CASA.x : LONGE
    a.z = aqui ? rastro.z - CENTRO_DA_CASA.z : LONGE
    if (!jogoPausado(loja.getState())) {
      const bicho = { x: lugar.current.x, z: lugar.current.z, pe: CHAO_DO_QUARTO }
      const crianca = { x: a.x, z: a.z, pe: peDela }
      if (voa) {
        noAlto.current = passaroNoAlto(
          noAlto.current,
          Math.hypot(bicho.x - crianca.x, bicho.z - crianca.z),
        )
        a.lift = noAlto.current ? ESPACO.passaroAcimaDoPe - VOO_DO_QUARTO : 0
        subida.current = subidaDoPassaro(subida.current, a.lift, dt)
      } else {
        pedidoNoChao(controle.eixoX, controle.eixoZ, rastro.giro, pedido.current)
        const agora = empurrando(bicho, cap.raio, crianca, pedido.current)
        if (passoDoEmpurrao(empurrao.current, agora, dt)) a.nudge = (a.nudge ?? 0) + 1
      }
    }
    b.setNextKinematicTranslation({
      x: CENTRO_DA_CASA.x + lugar.current.x,
      y: CHAO_DO_QUARTO + (voa ? VOO_DO_QUARTO + subida.current : 0),
      z: CENTRO_DA_CASA.z + lugar.current.z,
    })
  })

  return (
    <>
      <Pet3D
        petId={petId}
        occupied={occupied}
        reducedMotion={reducedMotion}
        paused={paused}
        onPosition={aoMudarDeLugar}
        avoid={evitar}
      />
      <object3D ref={marca} name="pet-do-quarto" />
      {petId ? (
        // Dentro do grupo do quarto (que já está no centro da casa e no chão): a posição inicial
        // é a do quarto; depois o passo põe a do mundo.
        <RigidBody
          key={petId}
          ref={corpo}
          type="kinematicPosition"
          colliders={false}
          userData={BICHO_QUE_SEGURA}
          position={[lugar.current.x, voa ? VOO_DO_QUARTO : 0, lugar.current.z]}
        >
          <ColisorDoEspaco espaco={espaco} />
        </RigidBody>
      ) : null}
    </>
  )
}
