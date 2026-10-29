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
import { TwoPiecesStage } from './scene-two-pieces'

const START = { scene: 'two-pieces' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))

/** O caso de cada pergunta 2D, rodado no MESMO motor da experiência "A porta com duas peças". */
export function cabanaQuizState(scene: 'cabana-so-chave' | 'cabana-ou', result: boolean) {
  const tentar = result ? [{ type: 'try-cabin' } as const] : []
  if (scene === 'cabana-so-chave') return run([{ type: 'take-piece', piece: 'key' }, ...tentar])
  return run([
    { type: 'cabin-rule', rule: 'or' },
    { type: 'take-piece', piece: 'emblem' },
    ...tentar,
  ])
}

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function CabanaQuizScene({ scene, result }: { scene: string; result: boolean }) {
  if (scene === 'cabana-ordem') return <CabanaOrdem result={result} />
  const caso = scene === 'cabana-ou' ? 'cabana-ou' : 'cabana-so-chave'
  const description =
    caso === 'cabana-so-chave'
      ? result
        ? 'O personagem encostou na cabana só com a chave. temEmblema ainda é falso, então a cabana continua fechada e o aviso pede a chave e o emblema.'
        : 'O personagem pegou só a chave. A pergunta da cabana é temChave e temEmblema. Agora ele vai encostar na cabana.'
      : result
        ? 'Com "ou", temEmblema verdadeiro já basta: a cabana abriu com uma peça só.'
        : 'O personagem pegou só o emblema. A pergunta da cabana foi montada com "ou". Agora ele vai encostar na cabana.'
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <TwoPiecesStage state={cabanaQuizState(caso, result)} />
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}

/** Na ilha: com as duas peças guardadas (o emblema primeiro), o personagem encosta na cabana. */
function CabanaOrdem({ result }: { result: boolean }) {
  const [art, setArt] = useState<
    typeof import('@sistemazero/studio/cabana-quiz-artes')['CABANA_QUIZ_ART'] | null
  >(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let active = true
    import('@sistemazero/studio/cabana-quiz-artes')
      .then((m) => {
        if (active) setArt(m.CABANA_QUIZ_ART)
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
        new T.CylinderGeometry(4.6, 4.7, 0.2, 48),
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
      const load = async (name: string, height: number) => {
        const data = models[name]
        if (!data) throw Error('Arte ausente')
        const gltf = await loader.parseAsync(
          Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), (c) => c.charCodeAt(0)).buffer,
          '',
        )
        if (disposed) return null
        const root = gltf.scene
        const size = new T.Box3().setFromObject(root).getSize(new T.Vector3())
        root.scale.multiplyScalar(height / Math.max(size.y, 0.001))
        const box = new T.Box3().setFromObject(root)
        root.position.sub(box.getCenter(new T.Vector3()))
        root.position.y += height / 2
        const holder = new T.Group()
        holder.add(root)
        world.add(holder)
        return { holder, root, animations: gltf.animations }
      }
      const cabana = await load('cabana-do-faroleiro', 2.6)
      if (!cabana || disposed) return
      cabana.holder.position.set(-0.6, 0, -1)
      // A porta e as luzes vêm do clipe `abrir` do projeto: o quadro 0 é a cabana fechada e o
      // último, aberta (como o "uma vez" do Jogo 3D, que segura o fim).
      const mixer = new T.AnimationMixer(cabana.root)
      const clip = cabana.animations.find((a) => a.name === 'abrir')
      if (clip) {
        const action = mixer.clipAction(clip)
        action.setLoop(T.LoopOnce, 1)
        action.clampWhenFinished = true
        action.play()
      }
      const hero = await load('aventureiro', 1.6)
      if (!hero || disposed) return
      const render = () => {
        if (disposed) return
        mixer.setTime(current.current && clip ? clip.duration : 0)
        if (current.current) hero.holder.position.set(0.9, 0, 0.7)
        else hero.holder.position.set(2.8, 0, 1.6)
        camera.position.set(1.2, 3.4, 8)
        camera.lookAt(0.2, 1, 0)
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
    ? 'O personagem encostou na cabana com as duas peças. temChave e temEmblema são verdadeiros, então a porta abriu e as janelas acenderam: a ordem não importou.'
    : 'O personagem pegou primeiro o emblema e depois a chave. As duas estão guardadas. Agora ele vai encostar na cabana.'
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
          temChave: verdadeiro · temEmblema: verdadeiro
        </span>
      </div>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}
