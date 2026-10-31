import { useFrame } from '@react-three/fiber'
import { type PassoDoGlb, RoomGlbModel } from '@sistemazero/avatar-quarto/quarto/room-glb-model'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useRef } from 'react'
import type { Group } from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { alturaDoPet, quemAcompanha } from '../sistemas/companhia'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { atrasDela, criarSeguir, passoDoSeguir, ritmoDoPasso } from '../sistemas/seguir'
import { suavizarAngulo } from '../sistemas/zappy'

/**
 * O bichinho do quarto acompanhando (S01): o mesmo seguir do bicho adotado (`sistemas/seguir.ts`),
 * sem corpo de física (é pequeno e anda atrás dela; atravessar um canto não atrapalha ninguém). A
 * altura segue o pé da criança quando ela pisa, então ele sobe e desce com o chão sem cair do
 * mapa. No cipó, no tronco e na água ele espera parado e alcança depois. Na pausa nada se mexe,
 * nem o giro; com menos movimento o passarinho não balança (`alturaDoPet`). O gato e o cachorro
 * andam e correm com os clipes do arquivo no ritmo da velocidade (`ritmoDoPasso`); parados, tocam o
 * parado do quarto, que o menos movimento desliga.
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
  const aparelhoPedeMenos = useReducedMotion()
  const passoDoClipe = useRef<PassoDoGlb>({ clipe: null, ritmo: 1 })
  const menosMovimento = useConforto(lojaDoConforto(loja), (c) => c.conforto.menosMovimento)

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
    // Na pausa nada muda: nem o lugar, nem o giro, nem o reaparecer depois de um teletransporte.
    if (!pausado) {
      if (passo.reaparecer) {
        const p = atrasDela(rastro)
        pos.current = { x: p.x, y: pe, z: p.z }
      } else {
        pos.current.x += seguir.current.vx * dt
        pos.current.z += seguir.current.vz * dt
        // Com ela no chão, a altura vai para a do pé dela, devagar (sem degrau duro).
        if (movimento.noChao) pos.current.y += (pe - pos.current.y) * (1 - Math.exp(-8 * dt))
        tempo.current += dt
      }
      const rapidez = Math.hypot(seguir.current.vx, seguir.current.vz)
      if (rapidez > 0.2) olhar.current = Math.atan2(seguir.current.vx, seguir.current.vz)
      g.rotation.y = suavizarAngulo(g.rotation.y, olhar.current, 10, dt)
    }
    // Na pausa o clipe congela (ritmo 0) no passo em que estava.
    const r = ritmoDoPasso(passo.clipe, Math.hypot(seguir.current.vx, seguir.current.vz))
    passoDoClipe.current.clipe = pausado ? passoDoClipe.current.clipe : r.clipe
    passoDoClipe.current.ritmo = pausado ? 0 : r.ritmo
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    g.position.set(
      pos.current.x,
      pos.current.y + alturaDoPet(petId, tempo.current, menos),
      pos.current.z,
    )
  })

  return (
    <group ref={raiz} name="pet-que-acompanha">
      <RoomGlbModel
        itemId={petId}
        fallback={null}
        passo={passoDoClipe}
        parado={!aparelhoPedeMenos && !menosMovimento}
      />
    </group>
  )
}
