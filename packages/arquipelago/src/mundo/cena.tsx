import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useState } from 'react'
import { Camera } from '../personagem/camera'
import { Personagem } from '../personagem/personagem'
import { Zappy } from '../personagem/zappy'
import { Agua } from './agua'
import { Anel } from './anel'
import { Bancada } from './bancada'
import { Casa } from './casa'
import { Ceu } from './ceu'
import { Farol } from './farol'
import { Horta } from './horta'
import { IlhaCentral } from './ilha-central'

/** A cena 3D inteira. A física (Rapier) roda dentro dela. */
export function Cena({ aoFalhar }: { aoFalhar: (e: unknown) => void }) {
  // Modo leve automático: se o aparelho não aguenta, a resolução cai; se sobra, sobe.
  const [dpr, setDpr] = useState(1.5)
  return (
    <Canvas
      className="arq-canvas"
      dpr={dpr}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: 0.1, far: 900, position: [0, 8, 10] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          aoFalhar(new Error('O navegador perdeu a placa de vídeo'))
        })
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(0.6, d - 0.4))}
        onIncline={() => setDpr((d) => Math.min(1.75, d + 0.25))}
        flipflops={4}
        onFallback={() => setDpr(0.75)}
      />
      <Ceu />
      <Suspense fallback={null}>
        <Physics gravity={[0, -24, 0]} timeStep="vary">
          <Agua />
          <IlhaCentral />
          <Casa />
          <Horta />
          <Bancada />
          <Farol />
          <Anel />
          <Personagem />
        </Physics>
        <Zappy />
      </Suspense>
      <Camera />
    </Canvas>
  )
}
