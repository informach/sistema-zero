import { useFrame, useThree } from '@react-three/fiber'
import { type RapierRigidBody, useRapier } from '@react-three/rapier'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { DoubleSide, type Mesh, type MeshBasicMaterial, Vector3 } from 'three'
import { useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import {
  type ChaoNoPonto,
  caminhoDoToque,
  criarIda,
  destinoDaIda,
  foiUmToque,
  IR_TOCANDO,
} from '../sistemas/ir-tocando'
import { CINTURA, superficieDaAgua } from '../sistemas/modos/chao'
import { jogoPausado } from '../sistemas/pausa'
import { GRUPOS_DO_RAIO_DA_CAMERA } from './grupos'
import { NIVEL_DA_AGUA } from './medidas'

/** O chão tocado precisa ser de pisar: a normal dele aponta para cima pelo menos isto. */
const CHAO_DE_PISAR = 0.6
/** O corpo que se confere em cada casa: do joelho para cima (o degrau baixo se sobe andando). */
const CORPO_DA_CONFERENCIA = { doChao: 0.5, raio: CORPO.raio * 0.85 } as const
/** Quanto tempo a marca cinza de "aí não chego andando" fica na tela (s). */
const RECUSA_NA_TELA = 0.9
const COR_DA_IDA = '#ffd23f'
const COR_DA_RECUSA = '#8a94a6'

/**
 * Ir tocando: um toque (ou clique) no chão e o avatar vai até lá sozinho, andando pelo caminho que
 * desvia dos obstáculos (`sistemas/ir-tocando.ts`). Arrastar continua girando a câmera. A marca
 * amarela mostra o destino; a cinza, por um instante, o lugar a que não se chega andando.
 *
 * O toque vira um raio da câmera contra o mundo da física (o que a câmera enxerga como sólido: o
 * chão, as paredes, os troncos). A grade do caminho é montada na hora, só em volta do trecho, com
 * um raio para baixo (a altura do chão) e uma cápsula (o corpo cabe?) por casa.
 */
export function IrTocando({ corpo }: { corpo: RefObject<RapierRigidBody | null> }) {
  const { loja, movimento, rastro } = useJogo()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()
  const marca = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)
  /** Onde a marca está e, numa recusa, quanto tempo ainda fica (s). */
  const lugar = useRef({ x: 0, y: 0, z: 0, recusa: 0, altura: 0 })

  const ferramentas = useMemo(
    () => ({
      raio: new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }),
      paraBaixo: new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }),
      capsula: new rapier.Capsule(
        Math.max(
          0.05,
          (CORPO.medidas.height - CORPO_DA_CONFERENCIA.doChao) / 2 - CORPO_DA_CONFERENCIA.raio,
        ),
        CORPO_DA_CONFERENCIA.raio,
      ),
      semGiro: { x: 0, y: 0, z: 0, w: 1 },
      ponto: new Vector3(),
      rumo: new Vector3(),
    }),
    [rapier],
  )

  useEffect(() => {
    const el = gl.domElement
    let desceu: { id: number; x: number; y: number; em: number } | null = null
    const desce = (e: PointerEvent) => {
      // Só o botão principal do mouse, a caneta e um dedo só (dois dedos é a pinça da câmera).
      desceu =
        e.isPrimary && e.button === 0
          ? { id: e.pointerId, x: e.clientX, y: e.clientY, em: performance.now() }
          : null
    }
    const sobe = (e: PointerEvent) => {
      const d = desceu
      desceu = null
      if (!d || d.id !== e.pointerId) return
      if (!foiUmToque(e.clientX - d.x, e.clientY - d.y, performance.now() - d.em)) return
      tocar(e.clientX, e.clientY)
    }
    const cancela = () => {
      desceu = null
    }

    function tocar(telaX: number, telaY: number) {
      const estado = loja.getState()
      const eu = corpo.current
      // Nadando, no cipó, sentada: o toque não manda (o personagem também cancela a ida aí).
      if (!eu || jogoPausado(estado) || movimento.modo !== 'chao') return
      const caixa = el.getBoundingClientRect()
      if (caixa.width <= 0 || caixa.height <= 0) return
      const { raio, ponto, rumo } = ferramentas
      // Do olho da câmera, pelo ponto tocado, até o que a câmera enxerga como sólido.
      camera.getWorldPosition(ponto)
      rumo
        .set(
          ((telaX - caixa.left) / caixa.width) * 2 - 1,
          -((telaY - caixa.top) / caixa.height) * 2 + 1,
          0.5,
        )
        .unproject(camera)
        .sub(ponto)
        .normalize()
      raio.origin = { x: ponto.x, y: ponto.y, z: ponto.z }
      raio.dir = { x: rumo.x, y: rumo.y, z: rumo.z }
      const hit = world.castRayAndGetNormal(
        raio,
        IR_TOCANDO.alcance * 3,
        true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        GRUPOS_DO_RAIO_DA_CAMERA,
        undefined,
        eu,
      )
      // Parede, tronco, céu: não é lugar de ir.
      if (!hit || hit.normal.y < CHAO_DE_PISAR) return
      const alvo = {
        x: ponto.x + rumo.x * hit.timeOfImpact,
        y: ponto.y + rumo.y * hit.timeOfImpact,
        z: ponto.z + rumo.z * hit.timeOfImpact,
      }
      const de = eu.translation()
      const pes = de.y - CORPO.doCentroAoPe
      // De cima do mais alto dos dois (ela ou o ponto tocado) até bem abaixo do mais baixo.
      const topo = Math.max(pes, alvo.y) + CORPO.medidas.height
      const fundo = Math.min(pes, alvo.y) - 2
      const chao = (x: number, z: number): ChaoNoPonto => {
        const { paraBaixo, capsula, semGiro } = ferramentas
        paraBaixo.origin = { x, y: topo, z }
        const piso = world.castRay(
          paraBaixo,
          topo - fundo,
          true,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          undefined,
          eu,
        )
        if (!piso) return { y: null, cabe: false }
        const y = topo - piso.timeOfImpact
        // Água acima da cintura é nadar: ali não se vai andando.
        if (superficieDaAgua(movimento.aguas, NIVEL_DA_AGUA, x, z) - y > CINTURA)
          return { y, cabe: false }
        const meio =
          y + CORPO_DA_CONFERENCIA.doChao + (CORPO.medidas.height - CORPO_DA_CONFERENCIA.doChao) / 2
        const encosta = world.intersectionWithShape(
          { x, y: meio, z },
          semGiro,
          capsula,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          undefined,
          eu,
        )
        return { y, cabe: encosta === null }
      }
      const resultado = caminhoDoToque({ x: de.x, z: de.z }, { x: alvo.x, z: alvo.z }, chao)
      const m = lugar.current
      m.x = alvo.x
      m.y = alvo.y
      m.z = alvo.z
      if ('caminho' in resultado) {
        movimento.ida = criarIda(resultado.caminho, { x: de.x, z: de.z })
        m.recusa = 0
      } else {
        movimento.ida = null
        m.recusa = RECUSA_NA_TELA
      }
    }

    el.addEventListener('pointerdown', desce)
    el.addEventListener('pointerup', sobe)
    el.addEventListener('pointercancel', cancela)
    return () => {
      el.removeEventListener('pointerdown', desce)
      el.removeEventListener('pointerup', sobe)
      el.removeEventListener('pointercancel', cancela)
    }
  }, [gl, camera, world, rapier, loja, movimento, corpo, ferramentas])

  // A ida acaba com a montagem (trocar de cena, fechar o jogo).
  useEffect(
    () => () => {
      movimento.ida = null
    },
    [movimento],
  )

  useFrame((_, dt) => {
    const malha = marca.current
    const tinta = material.current
    if (!malha || !tinta) return
    const m = lugar.current
    const ida = movimento.ida
    if (ida) {
      const destino = destinoDaIda(ida)
      malha.position.set(destino.x, m.y + 0.06, destino.z)
      tinta.color.set(COR_DA_IDA)
      // Pulsa devagar enquanto ela vai.
      m.altura += dt
      const pulso = 1 + 0.12 * Math.sin(m.altura * 6)
      malha.scale.setScalar(pulso)
      tinta.opacity = 0.9
      malha.visible = true
    } else if (m.recusa > 0) {
      m.recusa = Math.max(0, m.recusa - dt)
      malha.position.set(m.x, m.y + 0.06, m.z)
      tinta.color.set(COR_DA_RECUSA)
      malha.scale.setScalar(1)
      tinta.opacity = 0.8 * (m.recusa / RECUSA_NA_TELA)
      malha.visible = true
    } else malha.visible = false
    // Longe dela a marca não diz nada (ela foi levada para outro lugar).
    if (malha.visible && Math.hypot(malha.position.x - rastro.x, malha.position.z - rastro.z) > 80)
      malha.visible = false
  })

  return (
    <mesh ref={marca} name="marca-do-ir-tocando" rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.28, 0.42, 32]} />
      <meshBasicMaterial
        ref={material}
        color={COR_DA_IDA}
        transparent
        opacity={0.9}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}
