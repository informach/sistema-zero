import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import {
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  Matrix4,
  type Mesh,
  Quaternion,
  Vector3,
} from 'three'
import { useJogo } from '../estado/contexto'
import { noCorredorDoBarco, type RotaDoBarco } from '../sistemas/barco'
import { pontosDasBoias, type RodaDeNado } from '../sistemas/correnteza'
import { ComReserva, MODELOS, useModelo } from './modelos'

/**
 * A linha de boias de uma roda de nado (`sistemas/correnteza.ts`): as boias do `boias.glb`, a corda
 * esticada de uma na outra e as boinhas da corda, tudo instanciado. As boias e as boinhas sobem e
 * descem de leve, cada uma no seu tempo. Sem colisão: o limite é a correnteza. As boias que caem
 * dentro de `outras` (as outras rodas da mesma ilha, como o navio do Recife) não aparecem: ali o
 * mar é livre.
 */
export function Boias({
  roda,
  outras = SEM_OUTRAS,
}: {
  roda: RodaDeNado
  outras?: readonly RodaDeNado[]
}) {
  return (
    <ComReserva reserva={null}>
      <BoiasDoModelo roda={roda} outras={outras} />
    </ComReserva>
  )
}

const SEM_OUTRAS: readonly RodaDeNado[] = []

/** Boinhas da corda por trecho entre duas boias. */
const BOINHAS_POR_TRECHO = 4
/** Quanto as boias sobem e descem (m) e quão rápido (rad/s). */
const BALANCO = { altura: 0.06, rapidez: 1.4 }
/** O raio da boia no arquivo: a corda sai da beirada dela. */
const RAIO_DA_BOIA = 0.36

interface Peca {
  geometria: BufferGeometry
  material: Material
}

/** As malhas de um nó (um nó com vários materiais vira várias malhas). */
function pecasDoNo(raiz: ReturnType<typeof useModelo>, nome: string): Peca[] {
  const no = raiz.getObjectByName(nome)
  if (!no) throw new Error(`boias.glb sem o nó ${nome}`)
  const pecas: Peca[] = []
  no.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh) pecas.push({ geometria: m.geometry, material: m.material as Material })
  })
  return pecas
}

const tmpM = new Matrix4()
const tmpQ = new Quaternion()
const tmpV = new Vector3()
const tmpS = new Vector3()
const CIMA = new Vector3(0, 1, 0)

function BoiasDoModelo({ roda, outras }: { roda: RodaDeNado; outras: readonly RodaDeNado[] }) {
  const { movimento } = useJogo()
  const [rota, definirRota] = useState<RotaDoBarco | null>(null)
  useFrame(() => {
    const r = movimento.barco?.rota ?? null
    if (r !== rota) definirRota(r)
  })
  const raiz = useModelo(MODELOS.boias)
  const pecas = useMemo(
    () => ({
      boia: pecasDoNo(raiz, 'boia'),
      corda: pecasDoNo(raiz, 'corda'),
      boinha: pecasDoNo(raiz, 'flutuador'),
    }),
    [raiz],
  )
  const boias = useMemo(
    () =>
      pontosDasBoias(roda).map((b) => {
        // A boia fica com as argolas (o x do arquivo) ao longo da linha, na tangente da roda.
        const a = Math.atan2(b.z - roda.z, b.x - roda.x)
        const dentro = outras.some((o) => Math.hypot(b.x - o.x, b.z - o.z) < o.livre)
        return { ...b, giro: Math.atan2(-Math.cos(a), -Math.sin(a)), dentro }
      }),
    [roda, outras],
  )
  const trechos = useMemo(
    () =>
      boias.flatMap((a, i) => {
        const b = boias[(i + 1) % boias.length] ?? a
        if (a.dentro || b.dentro) return []
        if (
          rota &&
          (noCorredorDoBarco(rota, a) ||
            noCorredorDoBarco(rota, b) ||
            noCorredorDoBarco(rota, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }))
        )
          return []
        const dx = b.x - a.x
        const dz = b.z - a.z
        const comp = Math.hypot(dx, dz)
        return [{ a, ux: dx / comp, uz: dz / comp, comp, giro: Math.atan2(-dz, dx) }]
      }),
    [boias, rota],
  )
  const visiveis = useMemo(
    () => boias.filter((b) => !b.dentro && !(rota && noCorredorDoBarco(rota, b))),
    [boias, rota],
  )
  const malhas = useRef<{
    boia: (InstancedMesh | null)[]
    corda: (InstancedMesh | null)[]
    boinha: (InstancedMesh | null)[]
  }>({
    boia: [],
    corda: [],
    boinha: [],
  })
  const cordaPosta = useRef(new WeakSet<InstancedMesh>())

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * BALANCO.rapidez
    // A corda não mexe: posta uma vez em cada malha.
    for (const m of malhas.current.corda) {
      if (!m || cordaPosta.current.has(m)) continue
      trechos.forEach((tr, i) => {
        tmpQ.setFromAxisAngle(CIMA, tr.giro)
        tmpV.set(tr.a.x + tr.ux * RAIO_DA_BOIA, 0, tr.a.z + tr.uz * RAIO_DA_BOIA)
        tmpS.set(tr.comp - 2 * RAIO_DA_BOIA, 1, 1)
        tmpM.compose(tmpV, tmpQ, tmpS)
        m.setMatrixAt(i, tmpM)
      })
      m.instanceMatrix.needsUpdate = true
      cordaPosta.current.add(m)
    }
    tmpS.set(1, 1, 1)
    for (const m of malhas.current.boia) {
      if (!m) continue
      visiveis.forEach((b, i) => {
        tmpQ.setFromAxisAngle(CIMA, b.giro)
        tmpV.set(b.x, BALANCO.altura * Math.sin(t + i * 1.7), b.z)
        tmpM.compose(tmpV, tmpQ, tmpS)
        m.setMatrixAt(i, tmpM)
      })
      m.instanceMatrix.needsUpdate = true
    }
    for (const m of malhas.current.boinha) {
      if (!m) continue
      let k = 0
      trechos.forEach((tr, i) => {
        tmpQ.setFromAxisAngle(CIMA, tr.giro)
        for (let j = 1; j <= BOINHAS_POR_TRECHO; j++) {
          const f = j / (BOINHAS_POR_TRECHO + 1)
          const y = 0.4 * BALANCO.altura * Math.sin(t * 1.3 + i * 1.7 + j)
          tmpV.set(tr.a.x + tr.ux * tr.comp * f, y, tr.a.z + tr.uz * tr.comp * f)
          tmpM.compose(tmpV, tmpQ, tmpS)
          m.setMatrixAt(k++, tmpM)
        }
      })
      m.instanceMatrix.needsUpdate = true
    }
  })

  const instancias = (grupo: 'boia' | 'corda' | 'boinha', n: number) =>
    pecas[grupo].map((p, i) => (
      <instancedMesh
        // biome-ignore lint/suspicious/noArrayIndexKey: as peças de um nó não mudam de ordem
        key={`${i}:${n}:${rota ? 'porto' : 'roda'}`}
        ref={(m) => {
          malhas.current[grupo][i] = m
        }}
        args={[p.geometria, p.material, n]}
        frustumCulled={false}
      />
    ))

  return (
    <group>
      {instancias('boia', visiveis.length)}
      {instancias('corda', trechos.length)}
      {instancias('boinha', trechos.length * BOINHAS_POR_TRECHO)}
    </group>
  )
}
