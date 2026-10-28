import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferGeometry,
  Color,
  type DirectionalLight,
  Float32BufferAttribute,
  Fog,
  type HemisphereLight,
  type PointsMaterial,
} from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { PERFIS_DE_QUALIDADE } from '../sistemas/qualidade'
import { momentoDoDia } from '../sistemas/tempo-do-dia'
import { NEVOA, RAIO_DAS_ESTRELAS } from './medidas'
import { useQualidade } from './qualidade-da-cena'

const CEU_DIA = new Color('#bfe6f5')
const CEU_TARDE = new Color('#f6c99a')
const CEU_NOITE = new Color('#0e1638')

/** Céu, sol, lua e estrelas, pelo relógio do jogo. */
export function Ceu() {
  const { nivel } = useQualidade()
  const { ambiente } = useJogo()
  const criadoEm = useEstado((s) => Date.parse(s.salvamento.criadoEm))
  const scene = useThree((s) => s.scene)
  const sol = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const estrelas = useRef<PointsMaterial>(null)
  const cor = useMemo(() => new Color(), [])
  const nevoa = useMemo(() => new Fog('#bfe6f5', NEVOA.comeco, NEVOA.fim), [])
  const pontos = useMemo(() => {
    const g = new BufferGeometry()
    const v: number[] = []
    for (let i = 0; i < 700; i++) {
      const a = Math.random() * Math.PI * 2
      const b = Math.random() * Math.PI * 0.45 + 0.08
      const r = RAIO_DAS_ESTRELAS
      v.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r)
    }
    g.setAttribute('position', new Float32BufferAttribute(v, 3))
    return g
  }, [])

  useFrame(() => {
    const m = momentoDoDia(Date.now(), criadoEm)
    ambiente.luz = m.luz
    ambiente.noite = m.noite
    // Perto do nascer e do pôr, o céu fica alaranjado.
    const tarde = Math.max(0, 1 - Math.abs(m.luz - 0.3) / 0.15) * (m.luz > 0.05 ? 1 : 0)
    cor
      .copy(CEU_NOITE)
      .lerp(CEU_DIA, Math.min(1, m.luz * 1.3))
      .lerp(CEU_TARDE, tarde * 0.6)
    scene.background = cor
    nevoa.color.copy(cor)
    nevoa.near = PERFIS_DE_QUALIDADE[nivel].nevoaInicio
    nevoa.far = PERFIS_DE_QUALIDADE[nivel].nevoaFim
    scene.fog = nevoa
    const angulo = m.fracao * Math.PI * 2
    if (sol.current) {
      sol.current.intensity = 0.25 + m.luz * 1.35
      sol.current.position.set(Math.cos(angulo) * 60, 40 + Math.sin(angulo) * 30, 30)
      sol.current.color.set(m.noite ? '#9fb4ff' : '#fff1dc')
    }
    if (hemi.current) hemi.current.intensity = 0.35 + m.luz * 0.6
    if (estrelas.current) estrelas.current.opacity = Math.max(0, 1 - m.luz * 4)
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#dff3ff', '#5f7a4a', 0.8]} />
      <directionalLight ref={sol} position={[40, 60, 30]} intensity={1.4} />
      <points geometry={pontos}>
        <pointsMaterial
          ref={estrelas}
          color="#ffffff"
          size={1.6}
          sizeAttenuation={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
    </>
  )
}
