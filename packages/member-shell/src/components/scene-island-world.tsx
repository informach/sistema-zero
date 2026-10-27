'use client'
import { ISLAND_CONTACT, type IslandState } from '@sistemazero/core/learning/scene'
import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'

const viewNames = { front: 'Vista de frente', side: 'Vista de lado', top: 'Vista de cima' }
type ViewState = Pick<IslandState, 'mode' | 'view' | 'key' | 'hero' | 'bounds' | 'before'>
/** One renderer per mounted activity. Assets load lazily and are disposed on navigation. */
export function IslandWorld({
  state,
  onReady,
}: {
  state: ViewState
  onReady?: (ready: boolean) => void
}) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(state),
    update = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    onReady?.(status === 'ready')
  }, [status, onReady])
  useEffect(() => {
    current.current = state
    update.current?.()
  }, [state])
  useEffect(() => {
    let disposed = false,
      cleanup = () => {}
    async function mount() {
      const [T, { GLTFLoader }, { ILHA_SCENE_GLB }] = await Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('@sistemazero/studio/ilha-farol-scene'),
      ])
      if (disposed || !host.current) return
      const world = new T.Scene(),
        camera = new T.PerspectiveCamera(48, 1, 0.1, 200)
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
      renderer.setClearColor('#94d5f5')
      renderer.domElement.setAttribute('role', 'img')
      renderer.domElement.setAttribute(
        'aria-label',
        'Cena 3D da ilha; a descrição e os valores estão ao lado dos controles.',
      )
      host.current.appendChild(renderer.domElement)
      // A mesma luz que o Jogo 3D cria em toda cena (LIGHT_AMBIENT e LIGHT_SUN do runtime):
      // os modelos do Blender saem aqui com a cor que têm no jogo.
      world.add(new T.AmbientLight('#ffffff', 2.1))
      const sun = new T.DirectionalLight('#ffffff', 1.7)
      sun.position.set(3, 5, 4)
      world.add(sun)
      const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>()
      const release = (root: THREE.Object3D) =>
        root.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.geometry) {
            resources.add(m.geometry)
            for (const material of Array.isArray(m.material) ? m.material : [m.material]) {
              resources.add(material)
              for (const value of Object.values(material))
                if (value instanceof T.Texture) resources.add(value)
            }
          }
        })
      let observer: ResizeObserver | undefined
      cleanup = () => {
        observer?.disconnect()
        update.current = null
        release(world)
        for (const r of resources) r.dispose()
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      }
      // As texturas de dentro do .glb (o céu em degradê): no Chrome o GLTFLoader as lê com
      // fetch(blob:), que a CSP dos apps não libera em connect-src. Pela <img> (o caminho que
      // ele usa no Safari) o img-src blob: deixa. O arquivo em si é decodificado aqui.
      const loader = new GLTFLoader()
      loader.register((parser) => {
        const p = parser as unknown as {
          textureLoader: THREE.Loader
          options: { manager: THREE.LoadingManager }
        }
        p.textureLoader = new T.TextureLoader(p.options.manager)
        return { name: 'sz_textures_by_img' }
      })
      const glb = Uint8Array.from(atob(ILHA_SCENE_GLB.slice(ILHA_SCENE_GLB.indexOf(',') + 1)), (c) =>
        c.charCodeAt(0),
      )
      const gltf = await loader.parseAsync(glb.buffer, '')
      if (disposed) {
        release(gltf.scene)
        for (const r of resources) r.dispose()
        return
      }
      const scene = gltf.scene
      world.add(scene)
      // Os nós de topo são o contrato de gerar-ilha-artes.ts (docs/aulas-interativas-tecnico/qa).
      const named = (name: string) => {
        const o = scene.children.find((o) => o.name === name.replaceAll(' ', '_'))
        if (!o) throw Error(`Modelo ausente: ${name}`)
        return o
      }
      const key = named('Chave'),
        hero = named('Aventureiro'),
        rock = named('Pedras'),
        bench = named('Bancada')
      const grid = new T.GridHelper(8, 8, '#3784bc', '#b8d4a3')
      grid.position.y = 0.01
      world.add(grid)
      const marker = (color: string) => {
        const o = new T.Mesh(
          new T.TorusGeometry(0.4, 0.025, 8, 32),
          new T.MeshBasicMaterial({ color }),
        )
        o.rotation.x = Math.PI / 2
        o.position.y = 0.04
        world.add(o)
        return o
      }
      const origin = marker('#ce8b17'),
        before = marker('#8d789b'),
        projection = marker('#315ee9')
      const ray = new T.Line(
        new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 1, 0)]),
        new T.LineDashedMaterial({ color: '#d75b95', dashSize: 0.12, gapSize: 0.08 }),
      )
      ray.computeLineDistances()
      world.add(ray)
      const h = ISLAND_CONTACT.hero,
        k = ISLAND_CONTACT.key
      const box = (size: { width: number; height: number; depth: number }, color: string) => {
        const geometry = new T.BoxGeometry(size.width, size.height, size.depth),
          o = new T.LineSegments(new T.EdgesGeometry(geometry), new T.LineBasicMaterial({ color }))
        geometry.dispose()
        world.add(o)
        return o
      }
      const hb = box(h, '#4172ff'),
        kb = box(k, '#db8a05')
      const render = () => {
        if (disposed) return
        const s = current.current,
          full = s.mode === 'view'
        for (const root of scene.children) root.visible = full || root === key || root === hero
        rock.visible = full
        bench.visible = !full
        key.position.set(s.key.x, s.key.y, s.key.z)
        hero.position.set(full ? -6.5 : s.hero.x, 0.8, full ? 0.75 : s.hero.z)
        grid.visible = s.mode === 'position'
        origin.visible = before.visible = projection.visible = ray.visible = s.mode === 'position'
        origin.position.set(-2, 0.04, -3)
        before.visible = before.visible && !!s.before
        if (s.before) before.position.set(s.before.x, 0.04, s.before.z)
        projection.position.set(s.key.x, 0.04, s.key.z)
        ray.position.set(s.key.x, 0, s.key.z)
        ray.scale.y = s.key.y
        hb.visible = kb.visible = s.bounds
        hb.position.copy(hero.position)
        kb.position.copy(key.position)
        const p: [number, number, number] =
          s.view === 'front'
            ? full
              ? [0, 12, 21]
              : [0, 6, 13]
            : s.view === 'side'
              ? full
                ? [12, 10, -20]
                : [13, 7, 0]
              : full
                ? [0, 25, 0.01]
                : [0, 16, 0.01]
        camera.position.set(p[0], p[1], p[2])
        camera.lookAt(full ? -1 : 0, full ? 0 : 0.7, 0)
        camera.fov = full ? 48 : 60
        camera.zoom = full ? Math.min(1, camera.aspect / 1.6) : 1
        camera.updateProjectionMatrix()
        if (s.mode === 'contact') {
          const cx = (s.hero.x + s.key.x) / 2,
            cz = (s.hero.z + s.key.z) / 2
          const extent = Math.max(
            Math.abs(s.hero.x - s.key.x) + 2,
            Math.abs(s.hero.z - s.key.z) + 2,
            s.key.y + 1,
          )
          const distance = Math.max(6, extent * 1.2) / Math.min(1, camera.aspect)
          if (s.view === 'top') camera.position.set(cx, distance + 2, cz + 0.01)
          else if (s.view === 'side') camera.position.set(cx + distance, 1 + distance * 0.45, cz)
          else camera.position.set(cx, 1 + distance * 0.45, cz + distance)
          camera.lookAt(cx, 1, cz)
          camera.fov = 48
          camera.updateProjectionMatrix()
        }
        renderer.render(world, camera)
      }
      update.current = render
      observer = new ResizeObserver(() => {
        if (!host.current || disposed) return
        const { width, height } = host.current.getBoundingClientRect()
        renderer.setSize(width, height)
        camera.aspect = width / Math.max(1, height)
        render()
      })
      observer.observe(host.current)
      render()
      setStatus('ready')
    }
    mount().catch(() => {
      if (!disposed) {
        cleanup()
        setStatus('error')
      }
    })
    return () => {
      disposed = true
      cleanup()
    }
  }, [])
  return (
    <div className="sz-island-world" data-ready={status === 'ready'}>
      <div ref={host} className="sz-island-canvas" />
      <span className="sz-island-view">{viewNames[state.view]}</span>
      {status === 'loading' && <p role="status">Preparando a ilha…</p>}
      {status === 'error' && (
        <p role="alert">Não foi possível abrir a cena 3D. Reabra a aula para tentar novamente.</p>
      )}
    </div>
  )
}
