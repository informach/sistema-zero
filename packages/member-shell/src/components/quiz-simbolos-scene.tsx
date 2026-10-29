'use client'
import {
  openScene,
  type SceneAction,
  type SceneState,
  type SequenceSymbol,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { Note } from './scene-discovery-frame'
import { SymbolSequenceStage } from './scene-symbol-sequence'

const START = { scene: 'symbol-sequence' } as const
const tocar = (...ss: SequenceSymbol[]): SceneAction[] =>
  ss.map((symbol) => ({ type: 'touch-symbol', symbol }) as const)
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))

/** O caso de cada pergunta 2D, rodado no MESMO motor da experiência "A ordem dos símbolos". */
export function simbolosQuizState(scene: 'simbolos-ordem' | 'simbolos-fora', result: boolean) {
  if (scene === 'simbolos-ordem')
    return run(tocar('sol', 'lua', ...(result ? ['estrela' as const] : [])))
  return run(tocar('sol', ...(result ? ['estrela' as const] : [])))
}

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function SimbolosQuizScene({ scene, result }: { scene: string; result: boolean }) {
  if (scene === 'simbolos-recomeca') return <SimbolosRecomeca result={result} />
  const caso = scene === 'simbolos-fora' ? 'simbolos-fora' : 'simbolos-ordem'
  const description =
    caso === 'simbolos-ordem'
      ? result
        ? 'Era a vez da estrela: passo era 2, a estrela acendeu e o baú abriu.'
        : 'O personagem tocou o sol e a lua: os dois acesos e passo é 2. Agora ele vai tocar a estrela.'
      : result
        ? 'Não era a vez da estrela: passo voltou a 0, o sol apagou e o baú continuou fechado.'
        : 'O personagem tocou o sol: ele acendeu e passo é 1. Agora ele vai pular a lua e tocar a estrela.'
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <SymbolSequenceStage state={simbolosQuizState(caso, result)} />
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}

/**
 * Na ilha: o personagem começou pela lua (errou e nada acendeu) e agora toca o sol, a lua e a
 * estrela. Depois do teste, as três acesas e o baú aberto.
 */
function SimbolosRecomeca({ result }: { result: boolean }) {
  const [art, setArt] = useState<
    typeof import('@sistemazero/studio/simbolos-quiz-artes')['SIMBOLOS_QUIZ_ART'] | null
  >(null)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    let active = true
    import('@sistemazero/studio/simbolos-quiz-artes')
      .then((m) => {
        if (active) setArt(m.SIMBOLOS_QUIZ_ART)
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
       * tamanho do Blender (as pedras e o baú saem do projeto assim) com os pés no chão.
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
      const sol = await load('pedra-sol')
      const lua = await load('pedra-lua')
      const estrela = await load('pedra-estrela')
      const bau = await load('bau-do-tesouro')
      const hero = await load('aventureiro', 1.6)
      if (!sol || !lua || !estrela || !bau || !hero || disposed) return
      // A fileira do projeto (`simbolos-projeto.ts`), com a lua um passo à frente, perto do centro.
      sol.holder.position.set(-2.7, 0, -0.2)
      lua.holder.position.set(-0.9, 0, 1)
      estrela.holder.position.set(0.9, 0, -0.2)
      bau.holder.position.set(2.7, 0, -0.2)
      const acenderSol = clipEnd(sol, 'acender')
      const acenderLua = clipEnd(lua, 'acender')
      const acenderEstrela = clipEnd(estrela, 'acender')
      const abrir = clipEnd(bau, 'abrir')
      const render = () => {
        if (disposed) return
        acenderSol(current.current)
        acenderLua(current.current)
        acenderEstrela(current.current)
        abrir(current.current)
        // Antes: na frente da lua (onde errou). Depois: na frente da estrela (o último toque).
        if (current.current) hero.holder.position.set(0.9, 0, 0.9)
        else hero.holder.position.set(-0.9, 0, 2.1)
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
    ? 'Depois do erro, a tentativa recomeçou pelo sol: passo foi a 1, a 2 e a estrela abriu o baú. As três pedras estão acesas.'
    : 'O personagem começou pela lua: não era a vez dela, passo continua 0 e nada acendeu. Agora ele vai tocar o sol, a lua e a estrela.'
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
          passo: {result ? 2 : 0}
        </span>
      </div>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{description}</Note>
    </div>
  )
}
