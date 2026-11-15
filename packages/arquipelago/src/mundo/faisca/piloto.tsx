import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  CylinderCollider,
  type RapierRigidBody,
  RigidBody,
  TrimeshCollider,
} from '@react-three/rapier'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AnimationMixer,
  type Group,
  type InstancedMesh,
  type Matrix4,
  type Mesh,
  Object3D,
  Vector3,
} from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useEstado, useJogo } from '../../estado/contexto'
import { assentamentoDaPeca, pisoDaFaisca } from '../../sistemas/assentamento-da-faisca'
import {
  COMPOSICAO_DA_FAISCA,
  IRIS_DE_ESTUDO,
  type PecaNaFaisca,
} from '../../sistemas/composicao-faisca'
import { alturaDoArquipelago } from '../../sistemas/geografia-do-arquipelago'
import { jogoPausado } from '../../sistemas/pausa'
import { PECAS_DO_ACERVO, PECAS_DO_CAMINHO } from '../../sistemas/prova-curadoria-faisca'
import { useInterativo } from '../interativos'
import { AmbienteDaVila } from './ambiente'
import { ARTE_DA_FAISCA } from './arte.generated'
import { type ArteDoPiloto, carregarPiloto } from './carregar-piloto'
import { preencherInstancias } from './instancias'

type IdDaPeca = keyof typeof ARTE_DA_FAISCA.pecas
const itens = COMPOSICAO_DA_FAISCA
const assentamentos = new Map(itens.map((p) => [p.id, assentamentoDaPeca(p)]))
for (const p of itens)
  if (p.apoio) {
    const base = assentamentos.get(p.apoio)
    if (!base) throw Error(`Apoio ausente: ${p.apoio}`)
    assentamentos.get(p.id)!.y = base.y + (p.deslocamentoY ?? 0)
  }
const assentar = (p: PecaNaFaisca) => {
  if (!assentamentos.has(p.id)) assentamentos.set(p.id, assentamentoDaPeca(p))
  return assentamentos.get(p.id)!
}
const altura = (p: PecaNaFaisca) => assentar(p).y
export interface SituacaoDoPiloto {
  estado: 'longe' | 'carregando' | 'pronto' | 'erro'
  erro?: string
  modelos: number
}

function Instancias({ mesh, matrizes }: { mesh: Mesh; matrizes: Matrix4[] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    preencherInstancias(m, mesh, matrizes)
    return () => m.dispose()
  }, [matrizes, mesh])
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, matrizes.length]}
      dispose={null}
      castShadow
      receiveShadow
    />
  )
}
function Decoracao({ arte, colecao }: { arte: ArteDoPiloto; colecao: PecaNaFaisca[] }) {
  const partes = useMemo(() => {
    const lista: { id: string; mesh: Mesh; matrizes: Matrix4[] }[] = []
    for (const [id, g] of arte.modelos) {
      const copias = colecao.filter((p) => p.peca === id)
      if (!copias.length) continue
      g.scene.updateMatrixWorld(true)
      g.scene.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        const matrizes = copias.map((p) => {
          const base = new Object3D()
          base.position.set(p.x, altura(p), p.z)
          base.rotation.y = p.giro
          base.scale.setScalar(p.escala)
          base.updateMatrix()
          return base.matrix.clone().multiply(m.matrixWorld)
        })
        lista.push({ id: `${id}:${m.uuid}`, mesh: m, matrizes })
      })
    }
    return lista
  }, [arte, colecao])
  return partes.map((p) => <Instancias key={p.id} {...p} />)
}
function Colisores({ arte, colecao }: { arte: ArteDoPiloto | null; colecao: PecaNaFaisca[] }) {
  const malhas = useMemo(() => {
    const mapa = new Map<string, { id: string; vertices: Float32Array; indices: Uint32Array }[]>()
    for (const id of new Set(
      colecao.filter((p) => p.solida === 'ponte' || p.solida === 'malha').map((p) => p.peca),
    )) {
      const g = arte?.modelos.get(id)
      if (!g) continue
      g.scene.updateMatrixWorld(true)
      const lista: { id: string; vertices: Float32Array; indices: Uint32Array }[] = []
      g.scene.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        const attr = m.geometry.getAttribute('position'),
          vertices = new Float32Array(attr.count * 3),
          v = new Vector3()
        for (let i = 0; i < attr.count; i++) {
          v.fromBufferAttribute(attr, i).applyMatrix4(m.matrixWorld)
          vertices.set(v.toArray(), i * 3)
        }
        const indices = m.geometry.index
          ? new Uint32Array(m.geometry.index.array)
          : Uint32Array.from({ length: attr.count }, (_, i) => i)
        lista.push({ id: m.uuid, vertices, indices })
      })
      mapa.set(id, lista)
    }
    return mapa
  }, [arte, colecao])
  return (
    <>
      {colecao.map((p) => {
        const f = assentar(p).fundacao
        if (!f) return null
        const w = f.maxX - f.minX,
          d = f.maxZ - f.minZ,
          h = f.topo - f.baixo
        const pos: [number, number, number] = [
          (f.minX + f.maxX) / 2,
          (f.baixo + f.topo) / 2,
          (f.minZ + f.maxZ) / 2,
        ]
        return (
          <RigidBody
            key={`fundacao-${p.id}`}
            type="fixed"
            colliders={false}
            position={[p.x, 0, p.z]}
            rotation={[0, p.giro, 0]}
          >
            <mesh position={pos} receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#8c8e7c" roughness={1} />
            </mesh>
            <CuboidCollider position={pos} args={[w / 2, h / 2, d / 2]} />
          </RigidBody>
        )
      })}
      {colecao
        .filter((p) => p.solida)
        .map((p) => {
          const meta = ARTE_DA_FAISCA.pecas[p.peca as IdDaPeca],
            caixa = meta.colisao[0],
            s = p.escala
          if (p.solida === 'ponte' || p.solida === 'malha')
            return (
              <RigidBody
                key={p.id}
                type="fixed"
                colliders={false}
                position={[p.x, altura(p), p.z]}
                rotation={[0, p.giro, 0]}
              >
                {arte ? (
                  malhas
                    .get(p.peca)
                    ?.map((m) => <TrimeshCollider key={m.id} args={[m.vertices, m.indices]} />)
                ) : p.solida === 'ponte' ? (
                  <CuboidCollider args={[1.9, 0.12, 6.18]} position={[0, 0.45, 0]} />
                ) : null}
              </RigidBody>
            )
          const meio = caixa.min.map((v, i) => ((v + caixa.max[i]!) * s) / 2) as [
            number,
            number,
            number,
          ]
          const metade = caixa.min.map((v, i) => ((caixa.max[i]! - v) * s) / 2) as [
            number,
            number,
            number,
          ]
          return (
            <RigidBody
              key={p.id}
              type="fixed"
              colliders={false}
              position={[p.x, altura(p), p.z]}
              rotation={[0, p.giro, 0]}
            >
              {p.solida === 'tronco' ? (
                <CylinderCollider
                  args={[0.9 * s, (p.raioDoTronco ?? 0.23) * s]}
                  position={[0, 0.9 * s, 0]}
                />
              ) : (
                <CuboidCollider args={metade} position={meio} />
              )}
            </RigidBody>
          )
        })}
    </>
  )
}
function Iris({ arte }: { arte: ArteDoPiloto }) {
  const { loja, pedidos } = useJogo(),
    pausado = useEstado(jogoPausado)
  const grupo = useRef<Group>(null),
    corpo = useRef<RapierRigidBody>(null)
  const p = useRef({ x: IRIS_DE_ESTUDO.x as number, z: IRIS_DE_ESTUDO.z as number })
  const original = arte.modelos.get('coelho')!
  const cena = useMemo(() => {
    const c = clone(original.scene)
    c.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) m.castShadow = true
    })
    return c
  }, [original])
  const anim = useMemo(() => {
    const mixer = new AnimationMixer(cena),
      andar = mixer.clipAction(original.animations.find((a) => a.name === 'andar')!),
      parado = mixer.clipAction(original.animations.find((a) => a.name === 'parado')!)
    andar.play()
    parado.play()
    return { mixer, andar, parado }
  }, [cena, original])
  const tempo = useRef(0),
    cabeca = useMemo(() => ({ x: p.current.x, y: 0, z: p.current.z, miolo: { x: 0, z: 135 } }), [])
  const vetor = useMemo(() => new Vector3(), [])
  const osso = cena.getObjectByName('Head')
  useEffect(
    () => () => {
      anim.mixer.stopAllAction()
      anim.mixer.uncacheRoot(cena)
      cena.traverse((o) => {
        const m = o as Mesh & { skeleton?: { dispose(): void } }
        m.skeleton?.dispose()
      })
      if (pedidos.conversa === cabeca) pedidos.conversa = null
      if (loja.getState().painelAberto === 'faisca-iris') loja.getState().abrirPainel(null)
    },
    [anim, cena, pedidos, cabeca, loja],
  )
  useInterativo('faisca-iris', {
    get x() {
      return p.current.x
    },
    get z() {
      return p.current.z
    },
    raio: IRIS_DE_ESTUDO.raio,
    rotulo: () => 'Conversar com a Íris · estudo',
    agir: () => {
      pedidos.conversa = cabeca
      loja.getState().abrirPainel('faisca-iris')
    },
  })
  useFrame((_, dt) => {
    if (!grupo.current) return
    const falando = loja.getState().painelAberto === 'faisca-iris'
    if (!pausado) tempo.current += Math.min(dt, 0.1)
    const fase = tempo.current % 28,
      movendo = fase < 10 || (fase >= 14 && fase < 24)
    const distancia =
      fase < 10 ? fase * 0.488 : fase < 14 ? 4.88 : fase < 24 ? (24 - fase) * 0.488 : 0
    p.current.x = IRIS_DE_ESTUDO.x
    p.current.z = IRIS_DE_ESTUDO.z + distancia
    const y = pisoDaFaisca(p.current.x, p.current.z)
    grupo.current.position.set(p.current.x, y, p.current.z)
    grupo.current.rotation.y = fase < 14 ? 0 : Math.PI
    corpo.current?.setNextKinematicTranslation({ x: p.current.x, y, z: p.current.z })
    anim.andar.setEffectiveWeight(movendo && !falando ? 1 : 0)
    anim.parado.setEffectiveWeight(movendo && !falando ? 0 : 1)
    if (!pausado) anim.mixer.update(Math.min(dt, 0.1))
    if (osso) {
      osso.getWorldPosition(vetor)
      cabeca.x = vetor.x
      cabeca.y = vetor.y + 0.045
      cabeca.z = vetor.z
    }
    if (!falando && pedidos.conversa === cabeca) pedidos.conversa = null
  })
  return (
    <>
      <group ref={grupo} dispose={null}>
        <primitive object={cena} />
      </group>
      <RigidBody
        ref={corpo}
        type="kinematicPosition"
        colliders={false}
        position={[p.current.x, alturaDoArquipelago(p.current.x, p.current.z), p.current.z]}
      >
        <CylinderCollider args={[0.38, 0.23]} position={[0, 0.38, 0]} />
      </RigidBody>
    </>
  )
}

export function PilotoDaFaisca({
  aoMudar,
  curadoria,
}: {
  aoMudar: (s: SituacaoDoPiloto) => void
  curadoria: 'a' | 'b' | null
}) {
  const { rastro, pedidos } = useJogo()
  const [perto, setPerto] = useState(true),
    [arte, setArte] = useState<ArteDoPiloto | null>(null)
  const colecao = useMemo(
    () =>
      curadoria
        ? [...itens, ...PECAS_DO_ACERVO, ...(curadoria === 'b' ? PECAS_DO_CAMINHO : [])]
        : itens,
    [curadoria],
  )
  useFrame(() => {
    const agora = Math.hypot(rastro.x, rastro.z - 140) < 200
    if (agora !== perto) setPerto(agora)
  })
  useEffect(() => {
    if (!perto) {
      aoMudar({ estado: 'longe', modelos: 0 })
      return
    }
    const abort = new AbortController()
    let lote: ArteDoPiloto | null = null
    pedidos.chaoChegando.add('arte-faisca')
    aoMudar({ estado: 'carregando', modelos: 0 })
    carregarPiloto(abort.signal, Boolean(curadoria))
      .then((chegou) => {
        lote = chegou
        if (abort.signal.aborted) {
          chegou.soltar()
          return
        }
        setArte(chegou)
        aoMudar({ estado: 'pronto', modelos: chegou.modelos.size })
      })
      .catch((e) => {
        if (abort.signal.aborted) return
        aoMudar({ estado: 'erro', erro: e instanceof Error ? e.message : String(e), modelos: 0 })
        pedidos.chaoChegando.delete('arte-faisca')
      })
    return () => {
      abort.abort()
      setArte(null)
      lote?.soltar()
      pedidos.chaoChegando.delete('arte-faisca')
    }
  }, [perto, aoMudar, pedidos, curadoria])
  useLayoutEffect(() => {
    if (arte) pedidos.chaoChegando.delete('arte-faisca')
  }, [arte, pedidos])
  if (!perto) return null
  return (
    <>
      <Colisores arte={arte} colecao={colecao} />
      <AmbienteDaVila />
      {arte ? (
        <>
          <Decoracao arte={arte} colecao={colecao} />
          <Iris arte={arte} />
        </>
      ) : (
        itens
          .filter((p) => p.id === 'ponte-lago' || p.id === 'oficina' || p.id === 'farol')
          .map((p) => (
            <mesh key={p.id} position={[p.x, altura(p) + (p.solida === 'ponte' ? 0.45 : 2), p.z]}>
              <boxGeometry args={p.solida === 'ponte' ? [4, 0.24, 12.35] : [5, 4, 5]} />
              <meshStandardMaterial color="#b8a580" wireframe />
            </mesh>
          ))
      )}
    </>
  )
}
