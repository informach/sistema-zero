import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { act, StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimationClip, AnimationMixer, Euler, Group, NumberKeyframeTrack, Vector3 } from 'three'

GlobalRegistrator.register()
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
const original = new Group()
const clip = new AnimationClip('balancar', 10, [
  new NumberKeyframeTrack('.position[x]', [0, 10], [0, 10]),
])
const gltf = { scene: original, animations: [clip] }
const vivos: { scene: Group; mixer: AnimationMixer }[] = []
// Só o carregamento e o vínculo com o renderizador são substituídos. Mixer, ações, trilha e
// efeitos do componente são reais; a prova mede posição e tempo, não chamadas a mocks.
mock.module('@react-three/drei', () => ({
  useGLTF: () => gltf,
  useAnimations: () =>
    useMemo(() => {
      const scene = original.clone()
      const mixer = new AnimationMixer(scene)
      vivos.push({ scene, mixer })
      return { mixer, actions: { balancar: mixer.clipAction(clip) } }
    }, []),
}))
const { RoomGlbModel, RoomMotionContext, RoomPausedContext } = await import(
  '@sistemazero/avatar-quarto/quarto/room-glb-model'
)
let frame = (_: unknown, _dt: number) => {}
mock.module('@react-three/fiber', () => ({
  useFrame: (callback: typeof frame) => {
    frame = callback
  },
}))
const { Pet3D } = await import('@sistemazero/avatar-quarto/quarto/pet-3d')
const root = createRoot(document.createElement('div'))
async function montar(paused: boolean, motion = true) {
  await act(async () =>
    root.render(
      <StrictMode>
        <RoomMotionContext.Provider value={motion}>
          <RoomPausedContext.Provider value={paused}>
            <RoomGlbModel itemId="pet-gato" fallback={null} />
          </RoomPausedContext.Provider>
          <RoomGlbModel itemId="pet-cachorro" fallback={null} />
        </RoomMotionContext.Provider>
      </StrictMode>,
    ),
  )
}
try {
  await montar(false)
  // StrictMode pode criar mixers descartados no render. Só os com ação ativa são montados.
  const ativos = vivos.filter(({ mixer }) => mixer.existingAction(clip)?.isRunning())
  assert.equal(ativos.length, 2)
  const [primeiro, segundo] = ativos
  assert.ok(primeiro && segundo)
  primeiro.mixer.update(2)
  segundo.mixer.update(2)
  assert.equal(primeiro.scene.position.x, 2)
  await montar(true)
  primeiro.mixer.update(4)
  segundo.mixer.update(4)
  assert.equal(primeiro.scene.position.x, 2, 'pausa não adianta nem reinicia a pose')
  assert.equal(segundo.scene.position.x, 6, 'pausa de uma peça não muda outro mixer')
  await montar(false)
  primeiro.mixer.update(1)
  assert.equal(primeiro.scene.position.x, 3, 'retoma do instante anterior')
  await montar(false, false)
  primeiro.mixer.update(2)
  assert.equal(primeiro.scene.position.x, 0, 'sem movimento usa a pose neutra')
  await montar(false)
  primeiro.mixer.update(1)
  assert.equal(primeiro.scene.position.x, 1)
  await act(async () => root.unmount())
  primeiro.mixer.update(2)
  assert.equal(primeiro.scene.position.x, 0, 'desmontar encerra a ação')
  assert.equal(original.position.x, 0, 'não anima a cena original do cache')
  const petHost = document.createElement('div')
  const petRoot = createRoot(petHost)
  const occupied = new Set<string>()
  const montarPet = async (paused = false, reducedMotion = false) => {
    await act(async () =>
      petRoot.render(
        <Pet3D
          petId="pet-passaro"
          occupied={occupied}
          paused={paused}
          reducedMotion={reducedMotion}
        />,
      ),
    )
  }
  await montarPet()
  const group = petHost.querySelector('group')
  assert.ok(group)
  // O renderer normalmente atribui essas propriedades ao Group. Aqui exercitamos o callback
  // real do pet com vetores Three, sem WebGL nem relógio global simulado pelo componente.
  const position = new Vector3(0, 0.7, 2.5)
  const rotation = new Euler()
  Reflect.set(group, 'position', position)
  Reflect.set(group, 'rotation', rotation)
  frame({ clock: { elapsedTime: 900 } }, 0.1)
  assert.ok(Math.abs(position.y - (0.7 + Math.sin(0.3) * 0.14)) < 1e-10)
  const antes = [...position.toArray(), ...rotation.toArray()]
  await montarPet(true)
  frame({ clock: { elapsedTime: 950 } }, 50)
  assert.deepEqual([...position.toArray(), ...rotation.toArray()], antes)
  await montarPet()
  frame({ clock: { elapsedTime: 950.1 } }, 0.1)
  assert.ok(
    Math.abs(position.y - (0.7 + Math.sin(0.6) * 0.14)) < 1e-10,
    'balanço conta apenas tempo ativo',
  )
  await montarPet(false, true)
  const reduzida = [...position.toArray(), ...rotation.toArray()]
  frame({ clock: { elapsedTime: 1000 } }, 50)
  assert.deepEqual([...position.toArray(), ...rotation.toArray()], reduzida)
  await act(async () => petRoot.unmount())
  console.log('PASS pausa do quarto')
} finally {
  GlobalRegistrator.unregister()
}
