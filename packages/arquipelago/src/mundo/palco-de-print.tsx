import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimationMixer,
  type Fog,
  type FogExp2,
  type Object3D,
  type PerspectiveCamera,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { liberarObjeto } from './carregar-ilha'

/**
 * Só para prints (a abertura feita do jogo de verdade, `playground/capturar-abertura.ts`): com o
 * medidor ligado, `globalThis.__arquipelagoPalco(cena | null)` põe a câmera parada num ponto,
 * olhando para outro, esconde nós pelo nome (o avatar, o Zappy) e tira a névoa; `null` devolve a
 * câmera do jogo. `__arquipelagoPorNaCena(url, x, y, z, giro, escala, clipe)` põe um GLB solto
 * (a Íris na sala do Farol, a chave e a carta) e `__arquipelagoLimparCena()` tira todos.
 * Desligado, não faz nada.
 */
export interface CenaDePrint {
  posicao: [number, number, number]
  alvo: [number, number, number]
  campo?: number
  esconder?: string[]
  semNevoa?: boolean
  /** Olhar para um nó (o Zappy, a Íris): o alvo vira a posição dele, `altura` acima. */
  olharPara?: { no: string; altura?: number }
  /** A câmera nos olhos de um nó (o avatar): `altura` acima dele e `recuo` para trás do alvo. */
  olharDe?: { no: string; altura?: number; recuo?: number; mesmaAltura?: boolean }
  /** A câmera parada na altura do alvo (de frente, nem de cima nem de baixo). */
  alturaDoAlvo?: boolean
  /** Nós que viram de frente para a câmera no print (o Zappy olha para quem vê a cena). */
  virarParaCamera?: string[]
}

interface PecaSolta {
  raiz: Object3D
  mixer: AnimationMixer | null
  soltar: () => void
}

export function PalcoDePrint({ ligado }: { ligado: boolean }) {
  const [cena, porCena] = useState<CenaDePrint | null>(null)
  const [pecas, porPecas] = useState<PecaSolta[]>([])
  useEffect(() => {
    if (!ligado) return
    const g = globalThis as {
      __arquipelagoPalco?: (c: CenaDePrint | null) => void
      __arquipelagoPorNaCena?: (...a: unknown[]) => Promise<void>
      __arquipelagoLimparCena?: () => void
    }
    g.__arquipelagoPalco = (c) => porCena(c)
    g.__arquipelagoPorNaCena = async (url, x, y, z, giro = 0, escala = 1, clipe) => {
      const gltf = await new GLTFLoader().loadAsync(String(url))
      const raiz = clone(gltf.scene)
      raiz.position.set(Number(x), Number(y), Number(z))
      raiz.rotation.y = Number(giro)
      raiz.scale.setScalar(Number(escala))
      let mixer: AnimationMixer | null = null
      const animacao = gltf.animations.find((a) => a.name === clipe)
      if (animacao) {
        mixer = new AnimationMixer(raiz)
        mixer.clipAction(animacao).play()
      }
      porPecas((lista) => [
        ...lista,
        {
          raiz,
          mixer,
          soltar: () => {
            liberarObjeto(raiz)
            liberarObjeto(gltf.scene)
          },
        },
      ])
    }
    g.__arquipelagoLimparCena = () =>
      porPecas((lista) => {
        for (const p of lista) p.soltar()
        return []
      })
    return () => {
      g.__arquipelagoPalco = undefined
      g.__arquipelagoPorNaCena = undefined
      g.__arquipelagoLimparCena = undefined
    }
  }, [ligado])
  useFrame((_, dt) => {
    for (const p of pecas) p.mixer?.update(Math.min(dt, 0.1))
  })
  return (
    <>
      {pecas.map((p) => (
        <primitive key={p.raiz.uuid} object={p.raiz} />
      ))}
      {cena && <CameraParada cena={cena} />}
    </>
  )
}

/** Toma o desenho (prioridade 1): posiciona a câmera depois da do jogo e desenha o quadro. */
function CameraParada({ cena }: { cena: CenaDePrint }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const escondidos = useRef<Object3D[]>([])
  const alvo = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  useEffect(() => {
    const nevoa: Fog | FogExp2 | null = scene.fog
    const campo = camera.fov
    if (cena.semNevoa) scene.fog = null
    return () => {
      scene.fog = nevoa
      camera.fov = campo
      camera.updateProjectionMatrix()
      for (const o of escondidos.current) o.visible = true
      escondidos.current = []
    }
  }, [scene, camera, cena])
  useFrame(({ gl }) => {
    // O céu põe a névoa de volta a cada quadro: tira de novo antes de desenhar.
    if (cena.semNevoa) scene.fog = null
    if (cena.esconder?.length)
      scene.traverse((o) => {
        if (o.visible && cena.esconder?.includes(o.name)) {
          o.visible = false
          escondidos.current.push(o)
        }
      })
    alvo.set(...cena.alvo)
    const para = cena.olharPara && scene.getObjectByName(cena.olharPara.no)
    if (para) {
      para.getWorldPosition(alvo)
      alvo.y += cena.olharPara?.altura ?? 0
    }
    camera.position.set(...cena.posicao)
    const de = cena.olharDe && scene.getObjectByName(cena.olharDe.no)
    if (de) {
      de.getWorldPosition(camera.position)
      camera.position.y += cena.olharDe?.altura ?? 0
      // De frente: a câmera na altura do que olha (o Zappy voa acima da cabeça dela).
      if (cena.olharDe?.mesmaAltura) camera.position.y = alvo.y
      const recuo = cena.olharDe?.recuo ?? 0
      if (recuo)
        camera.position.addScaledVector(dir.subVectors(camera.position, alvo).normalize(), recuo)
    }
    if (cena.alturaDoAlvo && !de) camera.position.y = alvo.y
    camera.lookAt(alvo)
    // Quem olha para a câmera: o giro em y como o do jogo (frente em +z), sem inclinar.
    for (const nome of cena.virarParaCamera ?? []) {
      const no = scene.getObjectByName(nome)
      if (!no) continue
      no.getWorldPosition(dir)
      no.rotation.set(0, Math.atan2(camera.position.x - dir.x, camera.position.z - dir.z), 0)
    }
    if (cena.campo && camera.fov !== cena.campo) {
      camera.fov = cena.campo
      camera.updateProjectionMatrix()
    }
    gl.render(scene, camera)
  }, 1)
  return null
}
