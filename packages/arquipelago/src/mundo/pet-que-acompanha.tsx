import { useFrame } from '@react-three/fiber'
import { RoomGlbModel } from '@sistemazero/avatar-quarto/quarto/room-glb-model'
import { useRef } from 'react'
import type { Group } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { quemAcompanha } from '../sistemas/companhia'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { atrasDela, criarSeguir, passoDoSeguir } from '../sistemas/seguir'
import { suavizarAngulo } from '../sistemas/zappy'

/** O passarinho voa um pouco acima do chão; o gato e o cachorro andam nele. */
const ALTURA_DO_VOO = 0.9

/**
 * O bichinho do quarto acompanhando (S01): o mesmo seguir do bicho adotado (`sistemas/seguir.ts`),
 * sem corpo de física (é pequeno e anda atrás dela; atravessar um canto não atrapalha ninguém). A
 * altura segue o pé da criança quando ela pisa, então ele sobe e desce com o chão sem cair do
 * mapa. No cipó, no tronco e na água ele espera parado e alcança depois.
 */
export function PetQueAcompanha() {
  const pet = useEstado((s) => s.quarto.pet)
  const vai = useEstado((s) => quemAcompanha(s.salvamento, s.quarto.pet) === 'quarto')
  if (!pet || !vai) return null
  return <Pet petId={pet} />
}

function Pet({ petId }: { petId: string }) {
  const { loja, rastro, movimento } = useJogo()
  const raiz = useRef<Group>(null)
  const seguir = useRef(criarSeguir())
  const nasceu = useRef(false)
  const pos = useRef({ x: rastro.x, y: rastro.y - CORPO.doCentroAoPe, z: rastro.z })
  const olhar = useRef(rastro.direcao)
  const tempo = useRef(0)
  const passaro = petId === 'pet-passaro'

  useFrame((_, dtBruto) => {
    const g = raiz.current
    if (!g) return
    const dt = Math.min(dtBruto, 0.1)
    const s = loja.getState()
    const pe = rastro.y - CORPO.doCentroAoPe
    if (!nasceu.current) {
      nasceu.current = true
      const p = atrasDela(rastro)
      pos.current = { x: p.x, y: pe, z: p.z }
    }
    const pausado = jogoPausado(s)
    const espera = pausado || movimento.modo !== 'chao' || s.nadando
    const passo = passoDoSeguir(
      seguir.current,
      { x: pos.current.x, y: pos.current.y, z: pos.current.z },
      rastro,
      espera,
      dt,
    )
    if (passo.reaparecer) {
      const p = atrasDela(rastro)
      pos.current = { x: p.x, y: pe, z: p.z }
    } else if (!pausado) {
      pos.current.x += seguir.current.vx * dt
      pos.current.z += seguir.current.vz * dt
      // Com ela no chão, a altura vai para a do pé dela, devagar (sem degrau duro).
      if (movimento.noChao) pos.current.y += (pe - pos.current.y) * (1 - Math.exp(-8 * dt))
      tempo.current += dt
    }
    const rapidez = Math.hypot(seguir.current.vx, seguir.current.vz)
    if (rapidez > 0.2) olhar.current = Math.atan2(seguir.current.vx, seguir.current.vz)
    g.rotation.y = suavizarAngulo(g.rotation.y, olhar.current, 10, dt)
    g.position.set(
      pos.current.x,
      pos.current.y + (passaro ? ALTURA_DO_VOO + Math.sin(tempo.current * 3) * 0.12 : 0),
      pos.current.z,
    )
  })

  return (
    <group ref={raiz} name="pet-que-acompanha">
      <RoomGlbModel itemId={petId} fallback={null} />
    </group>
  )
}
