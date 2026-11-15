import { useFrame, useThree } from '@react-three/fiber'
import { type RapierRigidBody, useRapier } from '@react-three/rapier'
import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react'
import { DoubleSide, type Mesh, type MeshBasicMaterial, Vector3 } from 'three'
import { useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import {
  type ChaoNoPonto,
  caminhoAteObjeto,
  caminhoDoToque,
  criarIda,
  destinoDaIda,
  FALA_SEM_CAMINHO_ATE_A_TAREFA,
  foiUmToque,
  IR_TOCANDO,
  interativoDoLembrete,
  interativoNoToque,
} from '../sistemas/ir-tocando'
import { CINTURA, superficieDaAgua } from '../sistemas/modos/chao'
import { jogoPausado } from '../sistemas/pausa'
import { GRUPOS_DO_RAIO_DA_CAMERA } from './grupos'
import { NIVEL_DA_AGUA } from './medidas'

/** O chão tocado precisa ser de pisar: a normal dele aponta para cima pelo menos isto. */
const CHAO_DE_PISAR = 0.6
/**
 * O corpo que se confere em cada casa: do degrau que ele sobe sozinho para cima (o que é mais baixo
 * que isso ele sobe andando).
 */
const CORPO_DA_CONFERENCIA = { doChao: CORPO.degrau, raio: CORPO.raio * 0.85 } as const
/** Levando até uma tarefa, até onde (m, acima e abaixo dos pés) se procura o chão do caminho. */
const DESNIVEL_ATE_A_TAREFA = 4
/** Quanto tempo a marca cinza de "aí não chego andando" fica na tela (s). */
const RECUSA_NA_TELA = 0.9
const COR_DA_IDA = '#ffd23f'
const COR_DA_RECUSA = '#8a94a6'

/**
 * Ir tocando: um toque (ou clique) no chão e o avatar vai até lá sozinho, andando pelo caminho que
 * desvia dos obstáculos (`sistemas/ir-tocando.ts`); num objeto (o banco, a placa, um morador), vai
 * até ele e usa. Arrastar continua girando a câmera. A marca amarela mostra o destino; a cinza, por
 * um instante, o lugar a que não se chega andando. O "Agora" do HUD pede o mesmo por
 * `movimento.levarAte` (os lugares de uma tarefa): o avatar vai até o objeto dela.
 *
 * O toque vira um raio da câmera contra o mundo da física (o que a câmera enxerga como sólido: o
 * chão, as paredes, os troncos). A grade do caminho é montada na hora, só em volta do trecho, com
 * um raio para baixo (a altura do chão) e uma cápsula (o corpo cabe?) por casa.
 */
export function IrTocando({ corpo }: { corpo: RefObject<RapierRigidBody | null> }) {
  const { loja, movimento, rastro, interativos } = useJogo()
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

  /**
   * O que o mundo diz de cada ponto entre os pés dela (`pes`) e um ponto a `yAlvo`: a altura do chão
   * e se o corpo cabe ali de pé e seco.
   */
  const chaoEntre = useCallback(
    (eu: RapierRigidBody, pes: number, yAlvo: number) => {
      const topo = Math.max(pes, yAlvo) + CORPO.medidas.height
      const fundo = Math.min(pes, yAlvo) - 2
      return (x: number, z: number): ChaoNoPonto => {
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
    },
    [world, rapier, ferramentas, movimento],
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
      if (!hit) return
      const alvo = {
        x: ponto.x + rumo.x * hit.timeOfImpact,
        y: ponto.y + rumo.y * hit.timeOfImpact,
        z: ponto.z + rumo.z * hit.timeOfImpact,
      }
      // Tocou num objeto (o banco, a placa, um morador): vai até ele e usa. Vale tocar no próprio
      // objeto (a normal pode ser de lado) ou no chão bem junto dele.
      const objeto = estado.visita ? null : interativoNoToque(interativos, alvo)
      // Parede, tronco, céu, sem objeto: não é lugar de ir.
      if (!objeto && hit.normal.y < CHAO_DE_PISAR) return
      const de = eu.translation()
      const chao = chaoEntre(eu, de.y - CORPO.doCentroAoPe, alvo.y)
      const daqui = { x: de.x, z: de.z }
      const m = lugar.current
      m.x = objeto?.x ?? alvo.x
      m.z = objeto?.z ?? alvo.z
      // A marca fica no chão (tocando num objeto, o raio bate no alto dele: o encosto, a cabeça).
      m.y = objeto ? (chao(m.x, m.z).y ?? alvo.y) : alvo.y
      if (objeto) {
        const caminho = caminhoAteObjeto(daqui, objeto, chao)
        movimento.ida = caminho ? criarIda(caminho, daqui, objeto.id) : null
        m.recusa = caminho ? 0 : RECUSA_NA_TELA
        return
      }
      const resultado = caminhoDoToque(daqui, { x: alvo.x, z: alvo.z }, chao)
      if ('caminho' in resultado) {
        movimento.ida = criarIda(resultado.caminho, daqui)
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
  }, [gl, camera, world, rapier, loja, movimento, corpo, ferramentas, interativos, chaoEntre])

  // A ida acaba com a montagem (trocar de cena, fechar o jogo).
  useEffect(
    () => () => {
      movimento.ida = null
      movimento.levarAte = null
    },
    [movimento],
  )

  useFrame((_, dt) => {
    // O "Agora" pediu para levar até uma tarefa: acha o objeto dela e vai, como num toque nele.
    const pedido = movimento.levarAte
    if (pedido) {
      movimento.levarAte = null
      const eu = corpo.current
      const estado = loja.getState()
      if (eu && !jogoPausado(estado) && movimento.modo === 'chao' && !estado.visita) {
        const de = eu.translation()
        const daqui = { x: de.x, z: de.z }
        const pes = de.y - CORPO.doCentroAoPe
        const objeto = interativoDoLembrete(interativos, pedido, daqui)
        // A tarefa pode estar morro acima ou abaixo: a busca do chão olha um bom desnível.
        const chao = chaoEntre(eu, pes - DESNIVEL_ATE_A_TAREFA, pes + DESNIVEL_ATE_A_TAREFA)
        const caminho = objeto ? caminhoAteObjeto(daqui, objeto, chao) : null
        if (objeto && caminho) {
          movimento.ida = criarIda(caminho, daqui, objeto.id)
          const m = lugar.current
          m.x = objeto.x
          m.y = chao(objeto.x, objeto.z).y ?? pes
          m.z = objeto.z
          m.recusa = 0
        } else estado.dizer(FALA_SEM_CAMINHO_ATE_A_TAREFA)
      }
    }

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
