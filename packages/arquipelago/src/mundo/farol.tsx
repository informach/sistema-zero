import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  DoubleSide,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
} from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { useFarol } from '../estado/farol'
import { farolAceso, podeSubirOFarol } from '../sistemas/final-do-farol'
import { jogoPausado } from '../sistemas/pausa'
import { PORTA_DO_FINAL } from './alto-do-farol'
import { COLISORES_DO_FAROL } from './colisao-da-ilha-central'
import { Colisores } from './colisores'
import { lerColisores } from './colisores-da-ilha'
import { FinalDoFarol } from './final-do-farol'
import { ALTURA_DA_TERRA, FAROL } from './medidas'
import {
  ComReserva,
  copiarNo,
  coresOriginais,
  desbotar,
  MODELOS,
  materiaisDe,
  useModelo,
} from './modelos'

/** Altura do centro da lâmpada no modelo do Blender (`arte/mundo/farol.py`, YL). */
const ALTURA_DA_LAMPADA = 9.4
/** Comprimento de cada facho no modelo (do centro da lâmpada até a ponta, em x). */
const COMPRIMENTO_DO_FACHO = 26
/** A porta abre para fora (giro em y negativo na dobradiça) quando a criança chega perto. */
const PORTA_ABERTA = -1.75
const PERTO_DA_PORTA = 3

/** O Farol fica na sua ilha, ao lado da casa. Apagado até o final da Lenda (os fachos). */
export function Farol() {
  const { loja } = useJogo()
  const mostrarFacho = useFarol(loja, (s) => s.etapa !== 'fachos' && s.etapa !== 'fim')
  const etapa = useFarol(loja, (s) => s.etapa)
  const concluido = useEstado((s) => s.salvamento.farol.concluido)
  const aceso = farolAceso(concluido, etapa)
  return (
    <>
      <FinalDoFarol />
      <group position={[FAROL.x, ALTURA_DA_TERRA, FAROL.z]}>
        <ComReserva reserva={<FarolDeAntes aceso={aceso} mostrarFacho={mostrarFacho} />}>
          <FarolDoModelo aceso={aceso} mostrarFacho={mostrarFacho} />
        </ComReserva>
        <Colisores lista={COLISORES_DO_FAROL} />
      </group>
    </>
  )
}

/**
 * O farol do Blender. Apagado: as cores desbotam para o cinza e a lanterna fica escura. Aceso:
 * vermelho e branco, a lâmpada e o vidro brilham, a luz alcança longe e os dois fachos giram.
 */
/** Os colisores da subida por fora da torre (a escada, os deques, os postes, a viga e a lanterna). */
export function ehDaSubidaDoFarol(nome: string): boolean {
  return /^col-(cil-poste-subida|deque-subida|escada-reta|viga-subida|cil-lanterna-farol)-/.test(
    nome,
  )
}

function FarolDoModelo({ aceso, mostrarFacho }: { aceso: boolean; mostrarFacho: boolean }) {
  const { loja, rastro } = useJogo()
  const aparelho = useReducedMotion()
  const preferencia = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const tempo = useRef(0)
  const raiz = useModelo(MODELOS.farol)
  const luz = useRef<PointLight>(null)
  const partes = useMemo(() => {
    const corpo = copiarNo(raiz, 'farol', true)
    // A subida por fora da torre (E04, arte de 31/10/2026) só vale com o percurso da Lenda: até lá
    // não aparece nem colide (`ehDaSubidaDoFarol`).
    const subida = corpo.getObjectByName('subida')
    if (subida) subida.visible = false
    const vidro = copiarNo(raiz, 'vidro', true)
    const lampada = copiarNo(raiz, 'lampada', true)
    const porta = copiarNo(raiz, 'porta', true)
    const facho = copiarNo(raiz, 'facho')
    // O facho é luz no ar: material somado, dos dois lados, forte junto da lâmpada e sumindo na
    // ponta (cor por vértice: preto não soma nada).
    const brilhoDoFacho = new MeshBasicMaterial({
      color: '#ffe7a0',
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
    })
    facho.traverse((o) => {
      const malha = o as Mesh
      if (!malha.isMesh) return
      const geometria = malha.geometry.clone()
      const pos = geometria.attributes.position
      if (pos) {
        const cores = new Float32Array(pos.count * 3)
        for (let i = 0; i < pos.count; i++) {
          const k = Math.max(0, 1 - Math.abs(pos.getX(i)) / COMPRIMENTO_DO_FACHO) ** 1.6
          cores.set([k, k, k], i * 3)
        }
        geometria.setAttribute('color', new BufferAttribute(cores, 3))
      }
      malha.geometry = geometria
      malha.material = brilhoDoFacho
    })
    return {
      corpo,
      vidro,
      lampada,
      porta,
      fechada: porta.rotation.y,
      facho,
      // As pedras do pé e os degraus da porta (nós `col-*` do arquivo); a torre é do código.
      colisores: lerColisores(raiz).filter((c) => !ehDaSubidaDoFarol(c.nome)),
      cores: [...coresOriginais(corpo), ...coresOriginais(lampada), ...coresOriginais(porta)],
      janelas: materiaisDe(corpo, 'vidroJanela'),
      vidros: materiaisDe(vidro),
      lampadas: materiaisDe(lampada, 'lampadaFarol'),
    }
  }, [raiz])
  useEffect(() => {
    desbotar(partes.cores, aceso ? 0 : 0.92)
    partes.facho.visible = aceso && mostrarFacho
    const acender = (lista: MeshStandardMaterial[], forca: number) => {
      for (const m of lista) m.emissiveIntensity = aceso ? forca : 0
    }
    acender(partes.vidros, 0.9)
    acender(partes.janelas, 1.2)
  }, [aceso, partes, mostrarFacho])
  useFrame((_, dt) => {
    const s = loja.getState()
    if (!jogoPausado(s) && document.visibilityState === 'visible') {
      // Com a Lenda aberta, a porta abre quando a criança chega perto (o "Subir o Farol" está ali).
      const perto =
        podeSubirOFarol(s.jornada, s.visita !== null) &&
        Math.hypot(rastro.x - PORTA_DO_FINAL.x, rastro.z - PORTA_DO_FINAL.z) < PERTO_DA_PORTA
      const alvo = partes.fechada + (perto ? PORTA_ABERTA : 0)
      const porta = partes.porta.rotation
      porta.y =
        aparelho || preferencia
          ? alvo
          : porta.y + (alvo - porta.y) * Math.min(1, Math.min(dt, 0.1) * 4)
    }
    if (!aceso) {
      for (const m of partes.lampadas) m.emissiveIntensity = 0
      return
    }
    if (jogoPausado(s) || document.visibilityState !== 'visible') return
    if (!aparelho && !preferencia) {
      partes.facho.rotation.y += dt * 0.6
      tempo.current += dt
    }
    const pulso = aparelho || preferencia ? 1 : 0.9 + 0.1 * Math.sin(tempo.current * 3)
    for (const m of partes.lampadas) m.emissiveIntensity = 2.6 * pulso
    if (luz.current) luz.current.intensity = 60 * pulso
  })
  return (
    <>
      <primitive object={partes.corpo} />
      <primitive object={partes.vidro} />
      <primitive object={partes.lampada} />
      <primitive object={partes.porta} />
      <primitive object={partes.facho} />
      <Colisores lista={partes.colisores} />
      {aceso ? (
        <pointLight
          ref={luz}
          position={[0, ALTURA_DA_LAMPADA, 0]}
          intensity={60}
          distance={60}
          color="#ffd27a"
        />
      ) : null}
    </>
  )
}

/** O farol de antes (formas do código). */
function FarolDeAntes({ aceso, mostrarFacho }: { aceso: boolean; mostrarFacho: boolean }) {
  const { loja } = useJogo()
  const aparelho = useReducedMotion()
  const preferencia = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const facho = useRef<Group>(null)
  useFrame((_, dt) => {
    if (
      facho.current &&
      aceso &&
      !aparelho &&
      !preferencia &&
      !jogoPausado(loja.getState()) &&
      document.visibilityState === 'visible'
    )
      facho.current.rotation.y += dt * 0.6
  })
  return (
    <>
      <mesh position={[0, 0.6, 0]}>
        <dodecahedronGeometry args={[2.2, 0]} />
        <meshStandardMaterial color="#8d929c" flatShading />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 2.2 + i * 1.5, 0]}>
          <cylinderGeometry args={[1.0 - i * 0.09, 1.1 - i * 0.09, 1.5, 12]} />
          <meshStandardMaterial
            color={aceso ? (i % 2 ? '#ffffff' : '#e0584f') : i % 2 ? '#c4c8cf' : '#8f949e'}
            flatShading
          />
        </mesh>
      ))}
      <mesh position={[0, 9.9, 0]}>
        <sphereGeometry args={[0.75, 14, 10]} />
        <meshStandardMaterial
          color={aceso ? '#fff3b0' : '#6f7480'}
          emissive={aceso ? '#ffd84f' : '#000000'}
          emissiveIntensity={aceso ? 2.5 : 0}
        />
      </mesh>
      {aceso ? (
        <>
          <pointLight position={[0, 9.9, 0]} intensity={60} distance={60} color="#ffd27a" />
          <group ref={facho} visible={mostrarFacho} position={[0, 9.9, 0]}>
            <mesh position={[0, 0, 14]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[3, 28, 16, 1, true]} />
              <meshBasicMaterial color="#fff1a8" transparent opacity={0.12} depthWrite={false} />
            </mesh>
          </group>
        </>
      ) : null}
    </>
  )
}
