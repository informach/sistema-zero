import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useState } from 'react'
import { useEstado } from '../estado/contexto'
import { Camera } from '../personagem/camera'
import { Personagem } from '../personagem/personagem'
import { Zappy } from '../personagem/zappy'
import { jogoPausado } from '../sistemas/pausa'
import { Agua } from './agua'
import { Anel } from './anel'
import { Bancada } from './bancada'
import { BichoAdotado } from './bicho-adotado'
import { Casa } from './casa'
import { Ceu } from './ceu'
import { Farol } from './farol'
import { Horta } from './horta'
import { IlhaCentral } from './ilha-central'
import { GRAVIDADE, LONGE_DA_CAMERA, PASSO_DA_FISICA, PERTO_DA_CAMERA } from './medidas'
import { Medidor } from './medidor'
import { carregarModelos } from './modelos'

// Os modelos do mundo começam a baixar junto com o jogo (cada peça mostra a forma simples até chegar).
carregarModelos()

/** A cena 3D inteira. A física (Rapier) roda dentro dela. */
export function Cena({ aoFalhar }: { aoFalhar: (e: unknown) => void }) {
  // Modo leve automático: se o aparelho não aguenta, a resolução cai; se sobra, sobe.
  const [dpr, setDpr] = useState(1.5)
  const ferramentaAberta = useEstado((estado) => estado.ferramentaAberta)
  const pausado = useEstado(jogoPausado)
  return (
    <Canvas
      frameloop={ferramentaAberta ? 'never' : 'always'}
      className="arq-canvas"
      dpr={dpr}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: PERTO_DA_CAMERA, far: LONGE_DA_CAMERA, position: [0, 8, 10] }}
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
        {/* Passo fixo com o desenho suavizado entre passos; os passos rodam antes dos outros
            quadros (prioridade negativa), então personagem, bicho e câmera leem a posição já
            suavizada deste quadro. */}
        <Physics
          paused={pausado}
          gravity={[0, -GRAVIDADE, 0]}
          timeStep={PASSO_DA_FISICA}
          interpolate
          updatePriority={-1}
        >
          <Agua />
          <IlhaCentral />
          <Casa />
          <Horta />
          <Bancada />
          <Farol />
          <Anel />
          <Personagem />
          <BichoAdotado />
          <Camera />
          <Medidor />
        </Physics>
        <Zappy />
      </Suspense>
    </Canvas>
  )
}
