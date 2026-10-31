import { useFrame } from '@react-three/fiber'
import { type RapierRigidBody, RigidBody, useBeforePhysicsStep } from '@react-three/rapier'
import { type PassoDoGlb, RoomGlbModel } from '@sistemazero/avatar-quarto/quarto/room-glb-model'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { ALTURA_DO_VOO, alturaDoPet, quemAcompanha } from '../sistemas/companhia'
import { CORPO } from '../sistemas/corpo'
import {
  BICHO_QUE_SEGURA,
  capsulaDoEspaco,
  comecarPassinho,
  criarEmpurrao,
  distanciaMinima,
  ESPACO,
  empurrando,
  espacoDoBicho,
  ladoDoPassinho,
  passaroNoAlto,
  passoDoEmpurrao,
  passoDoPassinho,
  pedidoNoChao,
  respeitarFolga,
  subidaDoPassaro,
} from '../sistemas/espaco-dos-bichos'
import { jogoPausado } from '../sistemas/pausa'
import { atrasDela, criarSeguir, passoDoSeguir, ritmoDoPasso } from '../sistemas/seguir'
import { suavizarAngulo } from '../sistemas/zappy'
import { ColisorDoEspaco } from './espaco-dos-bichos'
import { PASSO_DA_FISICA } from './medidas'

/**
 * O bichinho do quarto acompanhando (S01): o mesmo seguir do bicho adotado (`sistemas/seguir.ts`).
 * Não colide com o mundo (é pequeno e anda atrás dela; atravessar um canto não atrapalha ninguém),
 * mas desde 31/10/2026 tem espaço próprio: uma cápsula cinemática que segura o corpo dela (a câmera
 * passa), a folga que ele mantém dela, o passinho de lado quando ela empurra e o passarinho que
 * sobe acima da cabeça dela (`sistemas/espaco-dos-bichos.ts`). O movimento roda no passo da física;
 * o desenho (giro e balanço do passarinho) no quadro. A altura segue o pé da criança quando ela
 * pisa, então ele sobe e desce com o chão sem cair do mapa. No cipó, no tronco e na água ele espera
 * parado e alcança depois. Na pausa nada se mexe, nem o giro; com menos movimento o passarinho não
 * balança (`alturaDoPet`).
 */
export function PetQueAcompanha() {
  const pet = useEstado((s) => s.quarto.pet)
  const vai = useEstado((s) => quemAcompanha(s.salvamento, s.quarto.pet) === 'quarto')
  if (!pet || !vai) return null
  return <Pet key={pet} petId={pet} />
}

function Pet({ petId }: { petId: string }) {
  const { loja, rastro, movimento, controle } = useJogo()
  const corpo = useRef<RapierRigidBody>(null)
  const raiz = useRef<Group>(null)
  const seguir = useRef(criarSeguir())
  const nasceu = useRef(false)
  const [inicial] = useState(() => {
    const p = atrasDela(rastro)
    return { x: p.x, y: rastro.y - CORPO.doCentroAoPe, z: p.z }
  })
  /** Onde está o pé dele (o passo da física escreve). */
  const pos = useRef({ ...inicial })
  const desloc = useRef({ x: 0, z: 0 })
  const empurrao = useRef(criarEmpurrao())
  const pedido = useRef({ x: 0, z: 0 })
  const noAlto = useRef(false)
  const subida = useRef(0)
  const olhar = useRef(rastro.direcao)
  const tempo = useRef(0)
  const aparelhoPedeMenos = useReducedMotion()
  const voa = petId === 'pet-passaro'
  const espaco = espacoDoBicho(petId)
  const cap = capsulaDoEspaco(espaco)
  const minimo = distanciaMinima(cap.raio)
  // O gato e o cachorro andam e correm com os clipes do arquivo no ritmo da velocidade (B3,
  // `ritmoDoPasso`); parados, tocam o parado do quarto, que o menos movimento desliga.
  const passoDoClipe = useRef<PassoDoGlb>({ clipe: null, ritmo: 1 })
  const menosMovimento = useConforto(lojaDoConforto(loja), (c) => c.conforto.menosMovimento)

  // O movimento, a cada passo da física (como o do bicho adotado).
  useBeforePhysicsStep(() => {
    const b = corpo.current
    if (!b) return
    const dt = PASSO_DA_FISICA
    const s = loja.getState()
    const pe = rastro.y - CORPO.doCentroAoPe
    if (!nasceu.current) {
      nasceu.current = true
      const p = atrasDela(rastro)
      pos.current = { x: p.x, y: pe, z: p.z }
    }
    const pausado = jogoPausado(s)
    const espera = pausado || movimento.modo !== 'chao' || s.nadando
    const passo = passoDoSeguir(seguir.current, pos.current, rastro, espera, dt)
    // Na pausa o clipe congela (ritmo 0) no passo em que estava.
    const r = ritmoDoPasso(passo.clipe, Math.hypot(seguir.current.vx, seguir.current.vz))
    if (!pausado) passoDoClipe.current.clipe = r.clipe
    passoDoClipe.current.ritmo = pausado ? 0 : r.ritmo
    // Na pausa nada muda: nem o lugar, nem o reaparecer depois de um teletransporte.
    if (!pausado) {
      const bicho = { x: pos.current.x, z: pos.current.z, pe: pos.current.y }
      const crianca = { x: rastro.x, z: rastro.z, pe }
      if (passo.reaparecer) {
        const p = atrasDela(rastro)
        pos.current = { x: p.x, y: pe, z: p.z }
        empurrao.current = criarEmpurrao()
      } else {
        const d = desloc.current
        d.x = seguir.current.vx * dt
        d.z = seguir.current.vz * dt
        if (!voa) {
          // Ela empurrando por meio segundo: um passinho de lado (ele não bate em nada no mundo).
          pedidoNoChao(controle.eixoX, controle.eixoZ, rastro.giro, pedido.current)
          const agora = empurrando(bicho, cap.raio, crianca, pedido.current)
          if (passoDoEmpurrao(empurrao.current, agora, dt)) {
            const lado = ladoDoPassinho(bicho, crianca, pedido.current)
            if (lado) comecarPassinho(empurrao.current, lado)
          }
          passoDoPassinho(empurrao.current, dt, d)
        }
        // Nunca entra na cápsula dela (o passarinho no alto passa por cima).
        if (!noAlto.current) respeitarFolga(bicho, d, crianca, minimo, dt)
        pos.current.x += d.x
        pos.current.z += d.z
        // Com ela no chão, a altura vai para a do pé dela, devagar (sem degrau duro).
        if (movimento.noChao) pos.current.y += (pe - pos.current.y) * (1 - Math.exp(-8 * dt))
      }
      if (voa) {
        const longe = Math.hypot(pos.current.x - rastro.x, pos.current.z - rastro.z)
        noAlto.current = passaroNoAlto(noAlto.current, longe)
        const alvo = noAlto.current ? ESPACO.passaroAcimaDoPe - ALTURA_DO_VOO : 0
        subida.current = subidaDoPassaro(subida.current, alvo, dt)
      }
    }
    b.setNextKinematicTranslation({
      x: pos.current.x,
      y: pos.current.y + (voa ? ALTURA_DO_VOO + subida.current : 0) + cap.y,
      z: pos.current.z,
    })
  })

  // O desenho, a cada quadro (o corpo já vem suavizado entre passos pelo Rapier).
  useFrame((_, dtBruto) => {
    const g = raiz.current
    if (!g) return
    const dt = Math.min(dtBruto, 0.1)
    if (!jogoPausado(loja.getState())) {
      tempo.current += dt
      const rapidez = Math.hypot(seguir.current.vx, seguir.current.vz)
      if (rapidez > 0.2) olhar.current = Math.atan2(seguir.current.vx, seguir.current.vz)
      g.rotation.y = suavizarAngulo(g.rotation.y, olhar.current, 10, dt)
    }
    const menos = aparelhoPedeMenos || lojaDoConforto(loja).getState().conforto.menosMovimento
    // O corpo do Rapier já está no voo (com a subida); aqui só o balanço do passarinho.
    const balanco = voa ? alturaDoPet(petId, tempo.current, menos) - ALTURA_DO_VOO : 0
    g.position.y = -cap.y + balanco
  })

  return (
    <RigidBody
      ref={corpo}
      type="kinematicPosition"
      colliders={false}
      userData={BICHO_QUE_SEGURA}
      position={[inicial.x, inicial.y + (voa ? ALTURA_DO_VOO : 0) + cap.y, inicial.z]}
      enabledRotations={[false, false, false]}
    >
      <ColisorDoEspaco espaco={espaco} pe={-cap.y} />
      <group ref={raiz} name="pet-que-acompanha" position={[0, -cap.y, 0]}>
        <RoomGlbModel
          itemId={petId}
          fallback={null}
          passo={passoDoClipe}
          parado={!aparelhoPedeMenos && !menosMovimento}
        />
      </group>
    </RigidBody>
  )
}
