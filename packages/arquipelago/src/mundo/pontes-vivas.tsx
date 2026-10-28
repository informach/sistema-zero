import { useFrame } from '@react-three/fiber'
import {
  type RapierRigidBody,
  RigidBody,
  RoundCuboidCollider,
  useBeforePhysicsStep,
} from '@react-three/rapier'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, type Material, type Mesh, type Object3D, Vector3 } from 'three'
import { useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import { criarPonte, type EstadoDaPonte, passoDaPonte, pesoNaPonte } from '../sistemas/pontes-vivas'
import { RAIOS_DOS_DEQUES } from './bosque'
import { bordaQueCabe, type ColisorDaIlha } from './colisores-da-ilha'
import { gruposDoColisor } from './grupos'
import { PASSO_DA_FISICA } from './medidas'

export const pontesAgora = { montadas: 0, maiorAfundamento: 0, sobCarga: 0 }

type Caixa = Extract<ColisorDaIlha, { forma: 'caixa' }>
interface Ponte {
  a: Vector3
  b: Vector3
  dx: number
  dz: number
  comprimento: number
  estado: EstadoDaPonte
}
interface Trecho {
  colisor: Caixa
  ponte: Ponte
  peso: number
  corpo: RapierRigidBody | null
  alvo: Vector3
}
export interface PontesPreparadas {
  pontes: Ponte[]
  trechos: Trecho[]
  y: { value: number[] }
  lado: { value: number[] }
}

/** Mede as três pontes pelas âncoras existentes. Nenhum GLB precisa ser regravado. */
export function prepararPontes(
  modelo: Object3D,
  colisores: ColisorDaIlha[],
  materiais: Material[],
): PontesPreparadas | null {
  const pontes: Ponte[] = []
  for (let i = 1; i < 4; i++) {
    const ini = modelo.getObjectByName(`copas-${i}`),
      fim = modelo.getObjectByName(`copas-${i + 1}`)
    if (!ini || !fim) return null
    const a = ini.position.clone().applyQuaternion(modelo.quaternion),
      b = fim.position.clone().applyQuaternion(modelo.quaternion)
    const comprimento = Math.hypot(b.x - a.x, b.z - a.z),
      dx = (b.x - a.x) / comprimento,
      dz = (b.z - a.z) / comprimento
    const ra = RAIOS_DOS_DEQUES[i - 1] ?? 2,
      rb = RAIOS_DOS_DEQUES[i] ?? 2
    a.x += dx * ra
    a.z += dz * ra
    b.x -= dx * rb
    b.z -= dz * rb
    // As alturas das pontas vêm dos pisos de cada deque.
    pontes.push({ a, b, dx, dz, comprimento: comprimento - ra - rb, estado: criarPonte() })
  }
  const y = { value: [0, 0, 0] },
    lado = { value: [0, 0, 0] },
    trechos: Trecho[] = []
  for (const c of colisores) {
    if (c.forma !== 'caixa' || !c.nome.startsWith('col-ponte-')) continue
    for (const p of pontes) {
      const t = ((c.posicao[0] - p.a.x) * p.dx + (c.posicao[2] - p.a.z) * p.dz) / p.comprimento
      const distancia = Math.abs((c.posicao[0] - p.a.x) * -p.dz + (c.posicao[2] - p.a.z) * p.dx)
      if (
        t >= -0.15 &&
        t <= 1.15 &&
        distancia < 0.8 &&
        Math.abs(c.posicao[1] - (p.a.y + (p.b.y - p.a.y) * t)) < 1.2
      ) {
        trechos.push({
          colisor: c,
          ponte: p,
          peso: pesoNaPonte(t),
          corpo: null,
          alvo: new Vector3(),
        })
        break
      }
    }
  }
  const v = new Vector3()
  modelo.updateMatrixWorld(true)
  modelo.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const pos = mesh.geometry.getAttribute('position')
    if (!pos) return
    const dados = new Float32Array(pos.count * 4)
    // Geometria está no referencial de cada nó, a conta está no da ilha já girada.
    const matriz = mesh.matrixWorld.clone()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(matriz)
      for (let n = 0; n < pontes.length; n++) {
        const p = pontes[n]
        if (!p) continue
        const t = ((v.x - p.a.x) * p.dx + (v.z - p.a.z) * p.dz) / p.comprimento
        const d = Math.abs((v.x - p.a.x) * -p.dz + (v.z - p.a.z) * p.dx)
        const altura = p.a.y + (p.b.y - p.a.y) * t
        if (t > 0 && t < 1 && d < 0.75 && v.y > altura - 0.6 && v.y < altura + 1.15) {
          dados[i * 4] = n
          dados[i * 4 + 1] = pesoNaPonte(t)
          break
        }
      }
    }
    // O deslocamento lateral será convertido do mundo ao eixo local pelo shader.
    mesh.geometry.setAttribute('arqPonte', new BufferAttribute(dados, 4))
  })
  for (const m of materiais) {
    const anterior = m.onBeforeCompile,
      chave = m.customProgramCacheKey()
    m.onBeforeCompile = (shader, renderer) => {
      anterior.call(m, shader, renderer)
      shader.uniforms.arqPonteY = y
      shader.uniforms.arqPonteLado = lado
      shader.vertexShader =
        'attribute vec4 arqPonte;\nuniform float arqPonteY[3];\nuniform float arqPonteLado[3];\n' +
        shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        int arqI=int(arqPonte.x); transformed.y += arqPonteY[arqI]*arqPonte.y;
        transformed.x += arqPonteLado[arqI]*arqPonte.y;`,
      )
    }
    m.customProgramCacheKey = () => `${chave}:ponte-viva-1`
    m.needsUpdate = true
  }
  return { pontes, trechos, y, lado }
}

/** Montado só com a ilha ativa. Caixas contínuas acompanham o piso sem uma cadeia de juntas caras. */
export function PontesVivas({ pontes, modelo }: { pontes: PontesPreparadas; modelo: Object3D }) {
  const { rastro, movimento } = useJogo()
  const centro = useMemo(() => new Vector3(), [])
  useEffect(
    () => () => {
      pontesAgora.montadas = 0
      pontesAgora.sobCarga = 0
      pontesAgora.maiorAfundamento = 0
    },
    [],
  )
  useBeforePhysicsStep(() => {
    modelo.getWorldPosition(centro)
    const x = rastro.x - centro.x,
      z = rastro.z - centro.z,
      pe = rastro.y - CORPO.doCentroAoPe - centro.y
    pontesAgora.montadas = pontes.pontes.length
    pontesAgora.sobCarga = 0
    pontesAgora.maiorAfundamento = 0
    for (let i = 0; i < pontes.pontes.length; i++) {
      const p = pontes.pontes[i]
      if (!p) continue
      const t = ((x - p.a.x) * p.dx + (z - p.a.z) * p.dz) / p.comprimento
      const lateral = (x - p.a.x) * -p.dz + (z - p.a.z) * p.dx
      const altura =
        p.a.y + (p.b.y - p.a.y) * t - Math.min(0.35, p.comprimento * 0.08) * Math.sin(Math.PI * t)
      const carga =
        movimento.noChao &&
        t > 0 &&
        t < 1 &&
        Math.abs(lateral) < 0.65 &&
        Math.abs(pe - altura) < 0.4
          ? 1
          : 0
      passoDaPonte(p.estado, carga, lateral, PASSO_DA_FISICA)
      pontesAgora.sobCarga += carga
      pontesAgora.maiorAfundamento = Math.max(pontesAgora.maiorAfundamento, -p.estado.y)
    }
    for (const t of pontes.trechos) {
      if (!t.corpo) continue
      t.alvo.set(
        centro.x +
          t.colisor.posicao[0] +
          Math.cos(modelo.rotation.y) * t.ponte.estado.lado * t.peso,
        centro.y + t.colisor.posicao[1] + t.ponte.estado.y * t.peso,
        centro.z +
          t.colisor.posicao[2] -
          Math.sin(modelo.rotation.y) * t.ponte.estado.lado * t.peso,
      )
      t.corpo.setNextKinematicTranslation(t.alvo)
    }
  })
  useFrame(() => {
    for (let i = 0; i < pontes.pontes.length; i++) {
      const p = pontes.pontes[i]
      if (p) {
        pontes.y.value[i] = p.estado.y
        pontes.lado.value[i] = p.estado.lado
      }
    }
  })
  return (
    <>
      {pontes.trechos.map((t) => {
        const c = t.colisor,
          b = bordaQueCabe(...c.meio)
        return (
          <RigidBody
            key={c.nome}
            ref={(r) => {
              t.corpo = r
            }}
            type="kinematicPosition"
            userData={{ plataformaDoMundo: true }}
            colliders={false}
            position={c.posicao}
            quaternion={c.rotacao}
          >
            <RoundCuboidCollider
              args={[c.meio[0] - b, c.meio[1] - b, c.meio[2] - b, b]}
              {...gruposDoColisor(c.nome.startsWith('col-ponte-lado-'))}
            />
          </RigidBody>
        )
      })}
    </>
  )
}
