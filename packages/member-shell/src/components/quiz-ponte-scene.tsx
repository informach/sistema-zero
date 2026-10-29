'use client'
import {
  openScene,
  type SceneAction,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { Note } from './scene-discovery-frame'
import { TimedBridgeStage } from './scene-timed-bridge'

const START = { scene: 'timed-bridge' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))
const esperar = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'wait-second' }) as const)

/** O caso de cada pergunta 2D, rodado no MESMO motor da experiência "A ponte apressada". */
export function ponteQuizState(scene: 'ponte-a-tempo' | 'ponte-atrasado', result: boolean) {
  const puxar: SceneAction = { type: 'pull-lever' }
  if (scene === 'ponte-a-tempo')
    return run([puxar, ...esperar(2), ...(result ? [{ type: 'touch-bridge' } as const] : [])])
  // Antes do teste, só a puxada: mostrar os 5 segundos já contaria a resposta.
  return run(result ? [puxar, ...esperar(5), { type: 'touch-bridge' }] : [puxar])
}

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function PonteQuizScene({ scene, result }: { scene: string; result: boolean }) {
  if (scene === 'ponte-de-novo') return <PonteDeNovo result={result} />
  const caso = scene === 'ponte-atrasado' ? 'ponte-atrasado' : 'ponte-a-tempo'
  const description =
    caso === 'ponte-a-tempo'
      ? result
        ? 'Com 2 segundos a ponte ainda estava baixada: ponteAberta era verdadeiro, o personagem atravessou e o sino tocou.'
        : 'O personagem puxou a alavanca e esperou 2 segundos: duas marquinhas do relógio acesas. Agora ele vai encostar na ponte.'
      : result
        ? 'No quarto segundo a ponte subiu e ponteAberta voltou a falso. No quinto, o personagem encostou e ficou na praia: o aviso pede para puxar de novo.'
        : 'O personagem acabou de puxar a alavanca e a ponte baixou. Agora ele vai esperar 5 segundos e encostar na ponte.'
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <TimedBridgeStage state={ponteQuizState(caso, result)} />
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}

/** Na ilha: a ponte já subiu e o personagem encosta na alavanca de novo. */
function PonteDeNovo({ result }: { result: boolean }) {
  const [art, setArt] = useState<
    typeof import('@sistemazero/studio/ponte-quiz-artes')['PONTE_QUIZ_ART'] | null
  >(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let active = true
    import('@sistemazero/studio/ponte-quiz-artes')
      .then((m) => {
        if (active) setArt(m.PONTE_QUIZ_ART)
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])
  const host = useRef<HTMLDivElement>(null),
    current = useRef(result),
    draw = useRef<(() => void) | null>(null)
  useEffect(() => {
    current.current = result
    draw.current?.()
  }, [result])
  useEffect(() => {
    if (!art) return
    const models: Record<string, string> = art.models
    let disposed = false,
      cleanup = () => {}
    async function mount() {
      const [T, { GLTFLoader }] = await Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
      ])
      if (disposed || !host.current) return
      const world = new T.Scene(),
        camera = new T.PerspectiveCamera(40, 1, 0.1, 100)
      const renderer = new T.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
      renderer.setClearColor('#bfe3f2')
      renderer.domElement.setAttribute('aria-hidden', 'true')
      host.current.append(renderer.domElement)
      let observer: ResizeObserver | undefined
      cleanup = () => {
        observer?.disconnect()
        draw.current = null
        world.traverse((o) => {
          const m = o as THREE.Mesh
          if (!m.geometry) return
          m.geometry.dispose()
          for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
            for (const value of Object.values(mat)) if (value instanceof T.Texture) value.dispose()
            mat.dispose()
          }
        })
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      }
      world.add(new T.AmbientLight('#fff', 2.1))
      const sun = new T.DirectionalLight('#fff', 1.7)
      sun.position.set(3, 5, 4)
      world.add(sun)
      const ground = new T.Mesh(
        new T.CylinderGeometry(5.4, 5.5, 0.2, 48),
        new T.MeshStandardMaterial({ color: '#e9d39a', roughness: 1 }),
      )
      ground.position.y = -0.1
      world.add(ground)
      const loader = new GLTFLoader()
      loader.register((parser) => {
        const p = parser as unknown as {
          textureLoader: THREE.Loader
          options: { manager: THREE.LoadingManager }
        }
        p.textureLoader = new T.TextureLoader(p.options.manager)
        return { name: 'sz_textures_by_img' }
      })
      /**
       * `height` encaixa a altura (o personagem, como na cena da Cabana); sem ela, a peça fica no
       * tamanho do Blender (a ponte e a alavanca saem do projeto assim) com os pés no chão.
       */
      const load = async (name: string, height?: number) => {
        const data = models[name]
        if (!data) throw Error('Arte ausente')
        const gltf = await loader.parseAsync(
          Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), (c) => c.charCodeAt(0)).buffer,
          '',
        )
        if (disposed) return null
        const root = gltf.scene
        if (height) {
          const size = new T.Box3().setFromObject(root).getSize(new T.Vector3())
          root.scale.multiplyScalar(height / Math.max(size.y, 0.001))
          const box = new T.Box3().setFromObject(root)
          root.position.sub(box.getCenter(new T.Vector3()))
          root.position.y += height / 2
        } else root.position.y -= new T.Box3().setFromObject(root).min.y
        const holder = new T.Group()
        holder.add(root)
        world.add(holder)
        return { holder, root, animations: gltf.animations }
      }
      // O último quadro de um clipe "uma vez" (como o Jogo 3D, que segura o fim).
      const clipEnd = (
        part: { root: THREE.Object3D; animations: THREE.AnimationClip[] },
        name: string,
      ) => {
        const mixer = new T.AnimationMixer(part.root)
        const clip = part.animations.find((a) => a.name === name)
        if (clip) {
          const action = mixer.clipAction(clip)
          action.setLoop(T.LoopOnce, 1)
          action.clampWhenFinished = true
          action.play()
        }
        return (end: boolean) => mixer.setTime(end && clip ? clip.duration : 0)
      }
      const lago = await load('laguinho')
      const sino = await load('pedra-do-sino')
      const ponte = await load('ponte-levadica')
      const alavanca = await load('alavanca')
      const hero = await load('aventureiro', 1.6)
      if (!lago || !sino || !ponte || !alavanca || !hero || disposed) return
      // Os lugares do projeto (`ponte-projeto.ts`), trazidos para perto do centro da cena.
      lago.holder.position.set(-1.6, 0, 0.2)
      sino.holder.position.set(-2.4, 0, 0.2)
      ponte.holder.position.set(0.2, 0, 0.2)
      alavanca.holder.position.set(2.4, 0, -0.3)
      const baixar = clipEnd(ponte, 'baixar')
      const puxar = clipEnd(alavanca, 'puxar')
      const render = () => {
        if (disposed) return
        baixar(current.current)
        puxar(current.current)
        if (current.current) hero.holder.position.set(2.5, 0, 0.6)
        else hero.holder.position.set(3.6, 0, 1.4)
        camera.position.set(0.4, 4.2, 9)
        camera.lookAt(0, 0.8, 0)
        camera.zoom = Math.min(1, camera.aspect / 1.3)
        camera.updateProjectionMatrix()
        renderer.render(world, camera)
      }
      draw.current = render
      observer = new ResizeObserver(() => {
        if (!host.current || disposed) return
        const { width, height } = host.current.getBoundingClientRect()
        renderer.setSize(width, height)
        camera.aspect = width / Math.max(height, 1)
        render()
      })
      observer.observe(host.current)
      render()
      setStatus('ready')
    }
    mount().catch(() => {
      cleanup()
      if (!disposed) setStatus('error')
    })
    return () => {
      disposed = true
      cleanup()
    }
  }, [art])
  const description = result
    ? 'O personagem encostou na alavanca de novo: a ponte baixou outra vez, ponteAberta voltou a verdadeiro e um novo "depois de 4 segundos" começou a contar.'
    : 'A ponte já subiu sozinha e ponteAberta é falso. Agora o personagem vai encostar na alavanca de novo.'
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <div
        className="relative overflow-hidden rounded-2xl bg-muted"
        style={{ aspectRatio: '8/5' }}
        role="img"
        aria-label={description}
      >
        <div ref={host} className="absolute inset-0" />
        {status !== 'ready' && (
          <p className="absolute inset-0 grid place-content-center p-5 text-center text-sm">
            {status === 'error'
              ? 'A cena não carregou. Use a descrição abaixo para acompanhar.'
              : 'Preparando a cena…'}
          </p>
        )}
        <span className="absolute left-3 top-3 rounded-xl bg-card px-3 py-2 font-bold text-foreground shadow-sm">
          ponteAberta: {result ? 'verdadeiro' : 'falso'}
        </span>
      </div>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}
