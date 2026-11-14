import { Canvas } from '@react-three/fiber'
import {
  type AvatarSlots,
  AVATAR_CATALOG as C,
  drawAvatar,
  equipPart,
  withEars,
} from '@sistemazero/core/avatar'
import { Suspense, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import type { Group } from 'three'
import { PackAvatarRig } from '../src/avatar/pack-rig'

/**
 * Página de conferência do avatar do pack (fora do app). Cada quadro é um avatar sorteado.
 * `?seeds=a,b` escolhe os sorteios, `?pose=` a pose, `?fantasia=1` acrescenta um com fantasia.
 */
const q = new URLSearchParams(location.search)
const pose = q.get('pose') ?? 'parado_relaxado'
const seeds = (q.get('seeds') ?? 'a,b,c,d,e,f').split(',')
const avatares: { nome: string; slots: AvatarSlots }[] = seeds.map((s) => ({
  nome: s,
  slots: drawAvatar(C, s, { filter: 'boy', tiers: ['free', 'coins'] }),
}))
if (q.get('fantasia')) {
  const conjunto = Object.values(C.sets)[2]
  const base = withEars(C, {
    corpo: C.rules.default.corpo ?? '',
    rosto: C.rules.default.rosto ?? '',
  })
  avatares.push({ nome: 'fantasia', slots: equipPart(C, base, conjunto?.parts[0]?.part ?? '') })
}

function Quadro({ slots }: { slots: AvatarSlots }) {
  const charRef = useRef<Group>(null)
  return (
    <Canvas
      camera={{ position: [0, 0.65, 2.4], fov: 35 }}
      gl={{ preserveDrawingBuffer: true }}
      style={{ width: 260, height: 320, background: '#e8eef8', borderRadius: 12 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.55, 0)}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 3, 4]} intensity={1.8} />
      <Suspense fallback={null}>
        <PackAvatarRig
          slots={slots}
          pose={pose}
          charRef={charRef}
          onStood={() =>
            document.body.setAttribute(
              'data-em-pe',
              String(Number(document.body.getAttribute('data-em-pe') ?? 0) + 1),
            )
          }
        />
      </Suspense>
    </Canvas>
  )
}

function Pagina() {
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 12, fontFamily: 'sans-serif' }}
    >
      {avatares.map((a) => (
        <figure key={a.nome} style={{ margin: 0 }}>
          <Quadro slots={a.slots} />
          <figcaption style={{ fontSize: 11, maxWidth: 260 }}>
            {a.nome}: {Object.values(a.slots).length} peças
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

const raiz = document.getElementById('raiz')
if (raiz) createRoot(raiz).render(<Pagina />)
