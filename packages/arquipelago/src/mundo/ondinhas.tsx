import { useFrame } from '@react-three/fiber'
import { useBeforePhysicsStep } from '@react-three/rapier'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import {
  InstancedBufferAttribute,
  type InstancedMesh,
  Object3D,
  RingGeometry,
  Vector2,
} from 'three'
import { type AguaRasa, useJogo } from '../estado/contexto'
import {
  criarOndas,
  criarRastroNaAgua,
  passoDasOndas,
  rastroNaAgua,
  TOTAL_DE_ONDAS,
  VIDA_DA_ONDA,
} from '../sistemas/mundo-reativo'
import { PERFIS_DE_QUALIDADE } from '../sistemas/qualidade'
import { dentroDaAgua } from './bosque'
import { PASSO_DA_FISICA } from './medidas'
import { useQualidade } from './qualidade-da-cena'
import { troncoAgora } from './tronco-no-lago'

export const ondasAgora = { ativas: 0, emitidas: 0, x: 0, y: 0, z: 0, ligadas: false }
export function Ondinhas({ agua }: { agua: AguaRasa }) {
  const { nivel } = useQualidade()
  const ligadas = PERFIS_DE_QUALIDADE[nivel].ondinhas
  useEffect(() => {
    ondasAgora.ligadas = ligadas
    return () => {
      ondasAgora.ligadas = false
    }
  }, [ligadas])
  return ligadas ? <OndinhasLigadas agua={agua} /> : null
}

function OndinhasLigadas({ agua }: { agua: AguaRasa }) {
  const { rastro } = useJogo()
  const menosMovimento = useReducedMotion()
  const ondas = useMemo(criarOndas, [])
  const pessoa = useMemo(criarRastroNaAgua, []),
    tronco = useMemo(criarRastroNaAgua, [])
  const malha = useRef<InstancedMesh>(null)
  const m = useMemo(() => new Object3D(), [])
  const geometria = useMemo(() => {
    const g = new RingGeometry(0.9, 1, 24).rotateX(-Math.PI / 2)
    g.setAttribute('forcaDaOnda', new InstancedBufferAttribute(new Float32Array(TOTAL_DE_ONDAS), 1))
    return g
  }, [])
  const uniforms = useMemo(
    () => ({
      centro: { value: new Vector2(agua.x, agua.z) },
      raios: { value: new Vector2(agua.raioX, agua.raioZ) },
      giro: { value: agua.giro },
    }),
    [agua],
  )
  useEffect(
    () => () => {
      geometria.dispose()
      ondasAgora.ativas = 0
      ondasAgora.emitidas = 0
    },
    [geometria],
  )
  useBeforePhysicsStep(() => {
    passoDasOndas(ondas, PASSO_DA_FISICA)
    const pertoDaSuperficie = rastro.y > agua.y - 0.7 && rastro.y < agua.y + 1.15
    rastroNaAgua(
      ondas,
      pessoa,
      pertoDaSuperficie && dentroDaAgua(agua, rastro.x, rastro.z),
      rastro.x,
      rastro.z,
      PASSO_DA_FISICA,
    )
    rastroNaAgua(
      ondas,
      tronco,
      troncoAgora.montado &&
        troncoAgora.submersa > 0 &&
        dentroDaAgua(agua, troncoAgora.x, troncoAgora.z),
      troncoAgora.x,
      troncoAgora.z,
      PASSO_DA_FISICA,
    )
    ondasAgora.emitidas = ondas.emitidas
    ondasAgora.x = agua.x
    ondasAgora.y = agua.y
    ondasAgora.z = agua.z
  })
  useFrame(() => {
    if (!malha.current) return
    const forcas = geometria.getAttribute('forcaDaOnda') as InstancedBufferAttribute
    ondasAgora.ativas = 0
    for (let i = 0; i < ondas.lista.length; i++) {
      const o = ondas.lista[i]!,
        vida = o.idade / VIDA_DA_ONDA
      const raio = 0.12 + o.idade * 0.6
      m.position.set(o.x, agua.y + 0.018, o.z)
      m.scale.set(raio, 1, raio)
      m.updateMatrix()
      malha.current.setMatrixAt(i, m.matrix)
      forcas.setX(i, (1 - vida) * o.forca * (menosMovimento ? 0.5 : 1))
      if (vida < 1) ondasAgora.ativas++
    }
    malha.current.instanceMatrix.needsUpdate = true
    forcas.needsUpdate = true
  })
  return (
    <instancedMesh ref={malha} args={[geometria, undefined, TOTAL_DE_ONDAS]} frustumCulled={false}>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`attribute float forcaDaOnda; varying float forca; varying vec2 mundo;
void main(){vec4 p = modelMatrix * instanceMatrix * vec4(position, 1.0); mundo=p.xz; forca=forcaDaOnda; gl_Position=projectionMatrix*viewMatrix*p;}`}
        fragmentShader={`uniform vec2 centro, raios; uniform float giro; varying float forca; varying vec2 mundo;
void main(){vec2 d=mundo-centro; float c=cos(giro), s=sin(giro); vec2 q=vec2(d.x*c-d.y*s,d.x*s+d.y*c)/raios; if(dot(q,q)>1.0 || forca<=0.0)discard; gl_FragColor=vec4(0.75,0.94,1.0,forca);}`}
      />
    </instancedMesh>
  )
}
