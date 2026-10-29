'use client'
import {
  type CoinIndex,
  openScene,
  type SceneAction,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { SceneButton } from './exploration-stage'
import { CoinCounterStage } from './scene-coin-counter'
import { Note } from './scene-discovery-frame'

const START = { scene: 'coin-counter' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))
const pegar = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ type: 'touch-coin', coin: i as CoinIndex }) as const)

/** O caso de cada pergunta 2D, rodado no MESMO motor da experiência "O contador de moedas". */
export function moedasQuizState(
  scene: 'moedas-poucas' | 'moedas-igual',
  result: boolean,
  comparar = false,
): SceneState {
  if (scene === 'moedas-poucas')
    return run([
      ...pegar(4),
      { type: 'leave-coin' },
      ...(result ? [{ type: 'try-chest' } as const] : []),
    ])
  return run([
    { type: 'chest-rule', rule: comparar ? 'at-least' : 'equals' },
    ...pegar(6),
    { type: 'leave-coin' },
    ...(result ? [{ type: 'try-chest' } as const] : []),
  ])
}

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function MoedasQuizScene({ scene, result }: { scene: string; result: boolean }) {
  const [comparar, setComparar] = useState(false)
  useEffect(() => {
    if (!result) setComparar(false)
  }, [result])
  if (scene === 'moedas-volta') return <MoedasVolta result={result} />
  const caso = scene === 'moedas-igual' ? 'moedas-igual' : 'moedas-poucas'
  const description =
    caso === 'moedas-poucas'
      ? result
        ? 'O personagem encostou no baú com 4 moedas. O baú continua fechado e o aviso diz que ele pede pelo menos 5.'
        : 'O personagem pegou 4 moedas. A regra do baú abre com pelo menos 5. Agora ele vai encostar no baú.'
      : result && comparar
        ? 'Com a regra "pelo menos 5", as mesmas 6 moedas abrem o baú: 6 é 5 ou mais.'
        : result
          ? 'Com 6 moedas, a regra "igual a 5" não abre o baú: 6 não é igual a 5.'
          : 'O personagem pegou as 6 moedas. A regra do baú está "moedas igual a 5". Agora ele vai encostar no baú.'
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <CoinCounterStage state={moedasQuizState(caso, result, comparar)} />
      {caso === 'moedas-igual' && result && (
        <SceneButton onClick={() => setComparar((v) => !v)}>
          {comparar ? 'Voltar ao caso da pergunta' : 'Comparar com a regra "pelo menos 5"'}
        </SceneButton>
      )}
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}

/** Na ilha: a moeda do meio já saiu do grupo; o personagem volta ao lugar dela e nada soma. */
function MoedasVolta({ result }: { result: boolean }) {
  const [art, setArt] = useState<
    typeof import('@sistemazero/studio/moedas-quiz-artes')['MOEDAS_QUIZ_ART'] | null
  >(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let active = true
    import('@sistemazero/studio/moedas-quiz-artes')
      .then((m) => {
        if (active) setArt(m.MOEDAS_QUIZ_ART)
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
        new T.CylinderGeometry(4.2, 4.3, 0.2, 48),
        new T.MeshStandardMaterial({ color: '#e9d39a', roughness: 1 }),
      )
      ground.position.y = -0.1
      world.add(ground)
      // O lugar da moeda que já saiu: uma marca na areia, para a criança achar o lugar.
      const spot = new T.Mesh(
        new T.RingGeometry(0.32, 0.42, 32),
        new T.MeshBasicMaterial({ color: '#b8893a', side: T.DoubleSide }),
      )
      spot.rotation.x = -Math.PI / 2
      spot.position.y = 0.01
      world.add(spot)
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
        return holder
      }
      for (const x of [-1.8, 1.8]) {
        const coin = await load('moeda-de-ouro', 0.7)
        if (!coin || disposed) return
        coin.position.x = x
      }
      const hero = await load('aventureiro', 1.6)
      if (!hero || disposed) return
      const render = () => {
        if (disposed) return
        if (current.current) hero.position.set(0, 0, 0)
        else hero.position.set(-3, 0, 1.6)
        camera.position.set(0, 3.2, 7.5)
        camera.lookAt(0, 0.6, 0.4)
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
    ? 'O personagem voltou ao lugar da moeda que já saiu do grupo. Não há moeda ali para encostar, e moedas continua em 3.'
    : 'O personagem já pegou 3 moedas. A moeda deste lugar foi uma delas: ela sumiu e saiu do grupo. Agora ele vai voltar a esse lugar.'
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
          moedas: 3
        </span>
      </div>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}
