import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { ILHAS, type IlhaId } from '@sistemazero/arquipelago-contracts'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  MeshStandardMaterial,
  type PointLight,
} from 'three'
import zappyGlb from '../assets/zappy.glb'
import { lojaDaChegada } from '../estado/chegada'
import { useJogo } from '../estado/contexto'
import { useFarol } from '../estado/farol'
import { guiaDoZappy } from '../estado/primeiros-passos'
import { type PalcoDaChegada, palcoDaChegada, zappyNaChegada } from '../mundo/chegada-da-ponte'
import { ALCANCE_DO_GUIA } from '../mundo/guia-do-zappy'
import { CORPO } from '../sistemas/corpo'
import {
  ALTURA_DO_ZAPPY,
  diferencaDeAngulo,
  giroPara,
  inclinacaoNaCurva,
  lugarAoLado,
  mergulho,
  paraOndeOlhar,
  RAPIDEZ_EM_VOLTA,
  suavizarAngulo,
  VELOCIDADE_DE_ANDAR,
} from '../sistemas/zappy'

/**
 * O caminho que o Bun devolve é relativo à pasta da saída, não à página: resolve contra o próprio
 * módulo (no Kids o jogo vem de `/api/arquipelago/cliente/`, com a página em `/arquipelago`).
 */
const URL_DO_ZAPPY = new URL(zappyGlb, import.meta.url).href
/** O modelo tem ~2 de altura (das patinhas às antenas); no ombro do personagem fica com ~0,6. */
const ESCALA = 0.3
/** A bunda do Zappy no espaço do modelo (no Blender: y 0,38 para trás e z -0,2). */
const BUNDA: [number, number, number] = [0, -0.2, -0.38]

/** Correndo ela anda a ~7 m/s: é aí que o Zappy mergulha o máximo para a frente. */
const VELOCIDADE_DO_MERGULHO_MAXIMO = 7
/** Longe do lugar dele (m), o Zappy bate as asas mesmo com ela parada. */
const LONGE_DO_LUGAR = 0.35
/** Mais longe que isso (m) foi um salto (início do jogo, teleporte): ele aparece no lugar, sem cruzar o mapa. */
const SALTO = 8
/** Mostrando um lugar (os primeiros passos): a altura acima do chão e a rapidez do voo até lá. */
const ALTURA_NO_GUIA = 2.1
const RAPIDEZ_NO_GUIA = 2.2
/** Depois de mostrar um lugar, por quanto tempo (s) a volta é voando, nunca um salto. */
const VOLTA_DO_GUIA = 5

/**
 * O Zappy, o vagalume guia, voando no ombro do personagem e virando junto com ele: andando, olha
 * para onde ela vai e inclina nas curvas; parada, olha para ela e às vezes espia a câmera. Numa
 * virada ele dá a volta por fora em vez de atravessar o corpo dela. À noite a bunda ilumina em volta.
 */
export function Zappy() {
  const { loja, rastro, ambiente } = useJogo()
  const noFinal = useFarol(loja, (s) => s.etapa === 'fachos' || s.etapa === 'fim')
  const camera = useThree((s) => s.camera)
  const reduzido = useReducedMotion()
  const grupo = useRef<Group>(null)
  const luz = useRef<PointLight>(null)
  const brilho = useRef({ forca: 1 })
  const voando = useRef(false)
  const chegada = useRef<{
    ilha: IlhaId | null
    palco: PalcoDaChegada | null
    origem: { x: number; y: number; z: number }
  }>({ ilha: null, palco: null, origem: { x: 0, y: 0, z: 0 } })
  const voo = useRef({
    emVolta: rastro.direcao,
    parado: 0,
    inclinacao: 0,
    iniciado: false,
    guiouAte: -Infinity,
  })
  useFrame(({ clock }, dtBruto) => {
    const g = grupo.current
    if (!g) return
    const dt = Math.min(dtBruto, 0.1)
    const t = clock.elapsedTime
    const v = voo.current
    // A cena da subida de posto (N02): ele voa da criança até a ilha cinza e fica sobre ela.
    const cena = lojaDaChegada(loja).getState()
    if (cena.ilha !== null && !cena.menosMovimento) {
      if (chegada.current.ilha !== cena.ilha) {
        const ilha = ILHAS.find((i) => i.id === cena.ilha)
        chegada.current = {
          ilha: cena.ilha,
          palco: ilha ? palcoDaChegada(ilha) : null,
          origem: { x: g.position.x, y: g.position.y, z: g.position.z },
        }
      }
      const palco = chegada.current.palco
      if (palco) {
        const p = zappyNaChegada(palco, cena.tempo, chegada.current.origem)
        g.position.set(p.x, p.y, p.z)
        g.rotation.y = giroPara({ x: g.position.x, z: g.position.z }, palco.ilha)
        voando.current = true
        return
      }
    } else if (chegada.current.ilha !== null) {
      // Acabou a cena: ele volta para o lado dela de uma vez (como depois de um corte).
      chegada.current = { ilha: null, palco: null, origem: { x: 0, y: 0, z: 0 } }
      v.iniciado = false
    }
    const ela = { x: rastro.x, z: rastro.z }
    // O lugar dele acompanha a direção dela pelo caminho mais curto, girando em volta do corpo.
    v.emVolta = suavizarAngulo(v.emVolta, rastro.direcao, RAPIDEZ_EM_VOLTA, dt)
    const lugar = lugarAoLado(ela, v.emVolta)
    const balanco = reduzido ? 0.3 : 1
    // Nos primeiros passos ele voa na frente até o lugar que a fala mostra e fica piscando lá.
    const guia = guiaDoZappy(loja).alvo
    const mostrando =
      guia !== null && Math.hypot(guia.x - rastro.x, guia.z - rastro.z) < ALCANCE_DO_GUIA
        ? guia
        : null
    if (mostrando) v.guiouAte = t + VOLTA_DO_GUIA
    const perto = mostrando ?? lugar
    const alvoX = perto.x + Math.sin(t * 1.3) * 0.12 * balanco
    const alvoZ = perto.z + Math.cos(t * 1.1) * 0.12 * balanco
    const alvoY =
      (mostrando ? rastro.y - CORPO.doCentroAoPe + ALTURA_NO_GUIA : rastro.y + ALTURA_DO_ZAPPY) +
      Math.sin(t * 2.4) * 0.1 * balanco
    if (!v.iniciado) g.rotation.order = 'YXZ'
    const saltou = t > v.guiouAte && Math.hypot(alvoX - g.position.x, alvoZ - g.position.z) > SALTO
    // Com menos movimento ele não atravessa a tela voando: aparece no lugar que mostra.
    if (!v.iniciado || saltou || (mostrando && reduzido)) {
      g.position.set(alvoX, alvoY, alvoZ)
      if (!v.iniciado || saltou) {
        g.rotation.y = rastro.direcao
        v.emVolta = rastro.direcao
      }
      v.iniciado = true
    }
    const k = 1 - Math.exp(-dt * (mostrando ? RAPIDEZ_NO_GUIA : 5))
    g.position.x += (alvoX - g.position.x) * k
    g.position.y += (alvoY - g.position.y) * k
    g.position.z += (alvoZ - g.position.z) * k
    rastro.zappy.x = g.position.x
    rastro.zappy.y = g.position.y
    rastro.zappy.z = g.position.z

    // Para onde olhar: o caminho dela, ela, ou a câmera numa espiada.
    v.parado = rastro.velocidade > VELOCIDADE_DE_ANDAR ? 0 : v.parado + dt
    const olhar = paraOndeOlhar(rastro.velocidade, v.parado)
    const daqui = { x: g.position.x, z: g.position.z }
    // Mostrando um lugar, ele olha para ela (chamando para perto).
    const alvoGiro = mostrando
      ? giroPara(daqui, ela)
      : olhar === 'caminho'
        ? rastro.direcao
        : olhar === 'ela'
          ? giroPara(daqui, ela)
          : giroPara(daqui, { x: camera.position.x, z: camera.position.z })
    const antes = g.rotation.y
    g.rotation.y = suavizarAngulo(antes, alvoGiro, olhar === 'camera' ? 4 : 6, dt)
    // Inclina para dentro da curva pelo quanto girou neste quadro, e mergulha um pouco andando.
    const giroPorSegundo = diferencaDeAngulo(antes, g.rotation.y) / Math.max(dt, 1e-3)
    v.inclinacao += (inclinacaoNaCurva(giroPorSegundo) - v.inclinacao) * (1 - Math.exp(-dt * 6))
    g.rotation.z = v.inclinacao
    g.rotation.x +=
      (mergulho(rastro.velocidade, VELOCIDADE_DO_MERGULHO_MAXIMO) - g.rotation.x) *
      (1 - Math.exp(-dt * 4))
    const longe = Math.hypot(alvoX - g.position.x, alvoZ - g.position.z) > LONGE_DO_LUGAR
    voando.current = rastro.velocidade > VELOCIDADE_DE_ANDAR || longe

    // A bunda pulsa devagar; à noite brilha bem mais e a luz alcança longe.
    const noite = 1 - ambiente.luz
    brilho.current.forca = (1.4 + noite * 3.2) * (0.82 + 0.18 * Math.sin(t * 2.1))
    if (luz.current) luz.current.intensity = 2 + noite * 14
  })
  return (
    <group ref={grupo} name="zappy-3d" visible={!noFinal}>
      <Barreira reserva={<Bolinha />}>
        <Suspense fallback={<Bolinha />}>
          <ModeloDoZappy brilho={brilho} voando={voando} />
        </Suspense>
      </Barreira>
      <pointLight
        ref={luz}
        color="#e6ff7a"
        distance={9}
        intensity={2}
        position={[0, -0.1 + BUNDA[1] * ESCALA, BUNDA[2] * ESCALA]}
      />
    </group>
  )
}

function ModeloDoZappy({
  brilho,
  voando,
}: {
  brilho: { current: { forca: number } }
  voando: { current: boolean }
}) {
  const gltf = useGLTF(URL_DO_ZAPPY, false, false)
  const raiz = useRef<Group>(null)
  const reduzido = useReducedMotion()
  const { scene, luzes } = useMemo(() => {
    const copia = gltf.scene.clone(true)
    const achadas: MeshStandardMaterial[] = []
    copia.traverse((o) => {
      const m = (o as Mesh).material
      if (m instanceof MeshStandardMaterial && m.name === 'luz') {
        const propria = m.clone()
        ;(o as Mesh).material = propria
        achadas.push(propria)
      }
    })
    return { scene: copia, luzes: achadas }
  }, [gltf.scene])
  const { actions } = useAnimations(gltf.animations, raiz)
  const atual = useRef<'voar' | 'parado' | null>(null)
  const halo = useRef<MeshBasicMaterial>(null)
  useEffect(() => {
    for (const a of Object.values(actions)) a?.setEffectiveTimeScale(reduzido ? 0.25 : 1)
  }, [actions, reduzido])
  useFrame(() => {
    const quer = voando.current ? 'voar' : 'parado'
    if (quer !== atual.current) {
      const de = atual.current ? actions[atual.current] : null
      const para = actions[quer]
      para?.reset().fadeIn(0.25).play()
      de?.fadeOut(0.25)
      atual.current = quer
    }
    for (const m of luzes) m.emissiveIntensity = brilho.current.forca
    // O halo deixa a bunda acesa visível de qualquer lado (de frente o corpo a esconde).
    if (halo.current) halo.current.opacity = Math.min(0.5, 0.07 * brilho.current.forca)
  })
  return (
    <group ref={raiz} scale={ESCALA} position={[0, -0.1, 0]}>
      <primitive object={scene} />
      <mesh position={BUNDA}>
        <sphereGeometry args={[0.5, 14, 10]} />
        <meshBasicMaterial
          ref={halo}
          color="#e6ff6a"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/** A bolinha de luz de antes: aparece enquanto o modelo baixa ou se ele não vier. */
function Bolinha() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#fff6b0" emissive="#ffd84f" emissiveIntensity={3} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshBasicMaterial color="#ffe58a" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </>
  )
}

/** Se o arquivo do Zappy falhar, o jogo segue com a bolinha (nunca derruba a cena). */
class Barreira extends Component<{ reserva: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() {
    return { erro: true }
  }
  render() {
    return this.state.erro ? this.props.reserva : this.props.children
  }
}
