'use client'
import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { SceneButton } from './exploration-stage'
import { Note } from './scene-discovery-frame'

/** Same scene for every answer; feedback and correctness come from the server. */
export function JardimQuizScene({ scene, result }: { scene: string; result: boolean }) {
  const [art, setArt] = useState<
    typeof import('@sistemazero/studio/jardim-quiz-artes')['JARDIM_QUIZ_ART'] | null
  >(null)
  const [artFailed, setArtFailed] = useState(false)
  useEffect(() => {
    let active = true
    import('@sistemazero/studio/jardim-quiz-artes')
      .then((m) => {
        if (active) setArt(m.JARDIM_QUIZ_ART)
      })
      .catch(() => {
        if (active) setArtFailed(true)
      })
    return () => {
      active = false
    }
  }, [])
  const [remembered, setRemembered] = useState(false)
  useEffect(() => {
    if (!result) setRemembered(false)
  }, [result])
  const memory = scene === 'jardim-memory'
  const description = memory
    ? result && remembered
      ? 'Agora a coleta também guardou Sim. No mesmo encontro, a flor consulta essa informação e abre.'
      : result
        ? 'O personagem chegou à flor. Ela continua fechada. O aviso pede o regador, porque a informação da coleta ainda guarda Não.'
        : 'O regador já desapareceu, mas a informação da coleta continua em Não. A regra só abre a flor quando essa informação é Sim.'
    : scene === 'jardim-view'
      ? result
        ? 'Olhando de lado, vemos o regador atrás da pedra. O regador e a pedra continuam no mesmo lugar.'
        : 'Vamos olhar de lado, sem mover o regador nem a pedra.'
      : result
        ? 'De lado, aparece o espaço entre o personagem e o regador. O regador está alto demais para o encontro.'
        : 'De cima, o regador e o personagem parecem juntos. Vamos olhar de lado.'
  return (
    <div className="sz-discovery-quiz-scene">
      {artFailed ? (
        <p className="rounded-xl bg-muted p-5">
          A cena não carregou. Use a descrição abaixo para acompanhar.
        </p>
      ) : memory ? (
        <div
          className="relative overflow-hidden rounded-2xl bg-muted"
          style={{ aspectRatio: '8/5' }}
          role="img"
          aria-label={description}
        >
          {art && (
            <>
              <img
                src={art.images['jardim-acolhedor']}
                alt=""
                className="absolute inset-0 size-full"
              />
              <img
                src={art.images[result && remembered ? 'flor-aberta' : 'flor-fechada']}
                alt=""
                className="absolute"
                style={{ width: '14%', left: '76%', top: '40%' }}
              />
              <img
                src={art.images.aventureiro}
                alt=""
                className="absolute"
                style={{ width: '14%', left: result ? '64%' : '28%', top: '50%' }}
              />
            </>
          )}
          <div className="absolute left-3 top-3 rounded-xl bg-card px-3 py-2 font-bold text-foreground shadow-sm">
            Pegou o regador? {result && remembered ? 'Sim' : 'Não'}
          </div>
          {result && (
            <div className="absolute inset-x-3 bottom-3 rounded-xl bg-card px-3 py-2 text-center font-semibold text-foreground">
              {remembered ? 'A flor abriu!' : 'Busque o regador primeiro.'}
            </div>
          )}
        </div>
      ) : (
        <JardimQuizWorld
          scene={scene}
          result={result}
          models={art?.models}
          description={description}
        />
      )}
      {memory && result && (
        <SceneButton onClick={() => setRemembered((v) => !v)}>
          {remembered ? 'Voltar ao caso da pergunta' : 'Comparar com a coleta guardando Sim'}
        </SceneButton>
      )}
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}

function JardimQuizWorld({
  scene,
  result,
  models,
  description,
}: {
  scene: string
  result: boolean
  models?: Record<string, string>
  description: string
}) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(result),
    draw = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    current.current = result
    draw.current?.()
  }, [result])
  useEffect(() => {
    if (!models) return
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
      renderer.setClearColor('#c4e2df')
      renderer.domElement.setAttribute('aria-hidden', 'true')
      host.current.append(renderer.domElement)
      const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>()
      function release(root: THREE.Object3D) {
        root.traverse((o) => {
          const m = o as THREE.Mesh
          if (!m.geometry) return
          resources.add(m.geometry)
          for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
            resources.add(mat)
            for (const value of Object.values(mat))
              if (value instanceof T.Texture) resources.add(value)
          }
        })
        for (const r of resources) r.dispose()
        resources.clear()
      }
      let observer: ResizeObserver | undefined
      cleanup = () => {
        observer?.disconnect()
        draw.current = null
        release(world)
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      }
      world.add(new T.AmbientLight('#fff', 2.1))
      const sun = new T.DirectionalLight('#fff', 1.7)
      sun.position.set(3, 5, 4)
      world.add(sun)
      const ground = new T.Mesh(
        new T.CylinderGeometry(4, 4.1, 0.2, 48),
        new T.MeshStandardMaterial({ color: '#a4c98a', roughness: 1 }),
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
      const load = async (name: string) => {
        const data = models![name]
        if (!data) throw Error('Arte ausente')
        const gltf = await loader.parseAsync(
          Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), (c) => c.charCodeAt(0)).buffer,
          '',
        )
        if (disposed) {
          release(gltf.scene)
          return null
        }
        world.add(gltf.scene)
        return gltf.scene
      }
      const can = await load('regador-azul')
      if (!can || disposed) return
      if (scene === 'jardim-view') {
        can.position.set(0, 0, -1)
        const rock = new T.Mesh(
          new T.IcosahedronGeometry(1, 1),
          new T.MeshStandardMaterial({ color: '#8b9ca0', roughness: 1 }),
        )
        rock.scale.set(1.3, 0.95, 0.8)
        rock.position.set(0, 0.65, 0.7)
        world.add(rock)
      } else {
        can.position.set(0, 3, 0)
        const hero = await load('aventureiro')
        if (!hero || disposed) return
        const bounds = new T.Box3().setFromObject(hero),
          size = bounds.getSize(new T.Vector3())
        hero.scale.multiplyScalar(1.6 / size.y)
        const fitted = new T.Box3().setFromObject(hero)
        hero.position.sub(fitted.getCenter(new T.Vector3()))
        hero.position.y += 0.8
      }
      const render = () => {
        if (disposed) return
        const side = current.current
        if (scene === 'jardim-view') camera.position.set(side ? 7 : 0, 2, side ? 1 : 9)
        else camera.position.set(side ? 9 : 0, side ? 3 : 12, side ? 0 : 0.001)
        camera.lookAt(0, scene === 'jardim-view' ? 0.6 : 1.6, 0)
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
  }, [models, scene])
  return (
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
      <span className="absolute bottom-3 left-3 rounded-lg bg-card px-3 py-1 text-sm font-semibold">
        {result ? 'Vista de lado' : scene === 'jardim-height' ? 'Vista de cima' : 'Vista de frente'}
      </span>
    </div>
  )
}
