import { expect, test } from 'bun:test'
import { type Material, Mesh, type Object3D, Texture } from 'three'
import { isValidAssetDataUrl } from '../../../core/project'
import fixture from './fixtures/molda-flipbook.json'
import { loadStartedKit } from './kitHarness'

type Kit = Awaited<ReturnType<typeof loadStartedKit>>
interface PaintedMaterial extends Material {
  map: Texture | null
  userData: { molda?: { flipbook?: { contract: number; frames: number[]; fps: number } } }
}

/**
 * Runtime real, GLTFLoader real; só o GPU é fronteira. O loader não decodifica
 * PNG fora do navegador (a textura falha em silêncio), então o teste ANEXA a
 * Texture que o loader teria produzido, do mesmo jeito que o teste de ossos
 * chama computeBoneTexture na fronteira simulada. O que se prova aqui é o
 * avanço da sequência, não a decodificação da imagem.
 */
async function inGame(run: (kit: Kit, material: PaintedMaterial) => void | Promise<void>) {
  const win = window as unknown as Record<string, unknown>
  const previous = win.__SZGAME_ASSETS_3D
  win.__SZGAME_ASSETS_3D = {
    pintado: { kind: 'model3d', dataUrl: fixture.dataUrl, fileName: 'pintado.glb' },
  }
  try {
    expect(isValidAssetDataUrl(fixture.dataUrl, 'model3d', 'pintado.glb')).toBe(true)
    const kit = await loadStartedKit((api) => {
      api.defineMold('bicho', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'modelo', model: 'pintado', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    kit.api.setState('jogando')
    kit.api.spawn('bicho', 0, 0, 0)
    kit.step(1)
    const material = paintedMaterial(kit)
    material.map = new Texture()
    await run(kit, material)
    material.map?.dispose()
  } finally {
    window.dispatchEvent(new Event('pagehide'))
    if (previous === undefined) delete win.__SZGAME_ASSETS_3D
    else win.__SZGAME_ASSETS_3D = previous
  }
}

/** O material vem do cache do modelo e é o MESMO em todas as cópias do molde. */
function paintedMaterial(kit: Kit): PaintedMaterial {
  const scene = kit.renderers[0]?.scene
  if (!scene) throw new Error('cena não capturada')
  const found: PaintedMaterial[] = []
  scene.traverse((object: Object3D) => {
    if (!(object instanceof Mesh)) return
    const list = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of list as PaintedMaterial[])
      if (material?.userData?.molda?.flipbook && !found.includes(material)) found.push(material)
  })
  const material = found[0]
  if (!material) throw new Error('material com pintura animada não encontrado')
  return material
}

function placed(material: PaintedMaterial) {
  return [
    material.map?.offset.x ?? Number.NaN,
    material.map?.offset.y ?? Number.NaN,
    material.map?.repeat.x ?? Number.NaN,
    material.map?.repeat.y ?? Number.NaN,
  ]
}

/** Cada quadro do harness anda 1/30 s (o clamp do laço), então 8 fps = 3,75 quadros. */
const FRAMES_PER_STEP = Math.round(30 / fixture.flipbook.fps)

test('o contrato do Molda chega inteiro ao runtime, pelo userData do material', async () => {
  await inGame(async (_kit, material) => {
    expect(material.userData.molda?.flipbook).toEqual(fixture.flipbook)
    expect(fixture.flipbook.contract).toBe(1)
  })
})

test('a sequência anda no tempo do jogo e mostra a célula que o Molda gravou', async () => {
  await inGame(async (kit, material) => {
    // Um quadro do jogo já coloca o primeiro passo da sequência.
    kit.step(1)
    const first = fixture.steps[0]
    if (!first) throw new Error('fixture sem passos')
    expect(placed(material)).toEqual([...first.offset, ...first.scale])
    for (const step of fixture.steps.slice(1)) {
      kit.step(FRAMES_PER_STEP)
      expect(placed(material)).toEqual([...step.offset, ...step.scale])
    }
    // Repetição de quadro: o passo 3 volta à mesma célula do passo 1, sem colapsar.
    expect(fixture.steps[3]?.offset).toEqual(fixture.steps[1]?.offset as number[])
    // Loop: depois do último passo a sequência recomeça do primeiro.
    kit.step(FRAMES_PER_STEP)
    expect(placed(material)).toEqual([
      ...(fixture.steps[0]?.offset as number[]),
      ...(fixture.steps[0]?.scale as number[]),
    ])
  })
})

test('a pausa congela a pintura e continuar retoma de onde parou', async () => {
  await inGame(async (kit, material) => {
    kit.step(1)
    kit.step(FRAMES_PER_STEP)
    const paused = placed(material)
    expect(paused).toEqual([
      ...(fixture.steps[1]?.offset as number[]),
      ...(fixture.steps[1]?.scale as number[]),
    ])
    kit.api.setState('pausado')
    kit.step(FRAMES_PER_STEP * 4)
    expect(placed(material)).toEqual(paused)
    kit.api.setState('jogando')
    kit.step(FRAMES_PER_STEP)
    expect(placed(material)).toEqual([
      ...(fixture.steps[2]?.offset as number[]),
      ...(fixture.steps[2]?.scale as number[]),
    ])
  })
})

test('todas as cópias do molde compartilham a mesma folha e a mesma linha do tempo', async () => {
  await inGame(async (kit, material) => {
    const second = kit.api.spawn('bicho', 4, 0, 0)
    expect(kit.api.exists(second)).toBe(true)
    kit.step(1)
    // O material é do cache: encontrar um só, mesmo com duas cópias vivas, é o contrato.
    expect(paintedMaterial(kit)).toBe(material)
    expect(kit.api.countAlive('bicho')).toBe(2)
  })
})

/**
 * O mesmo GLB com a versão do contrato trocada por uma futura. A troca é de UM
 * caractere dentro do chunk JSON, então o tamanho do arquivo não muda e o GLB
 * continua válido: o que muda é só o que o runtime tem permissão de entender.
 */
function futureContractDataUrl() {
  const bytes = Uint8Array.from(atob(fixture.dataUrl.split(',')[1] as string), (c) =>
    c.charCodeAt(0),
  )
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  const at = text.indexOf('"contract":1')
  if (at < 0) throw new Error('contrato não encontrado no GLB')
  const patched = bytes.slice()
  patched[at + '"contract":'.length] = '2'.charCodeAt(0)
  let binary = ''
  for (const byte of patched) binary += String.fromCharCode(byte)
  return `data:model/gltf-binary;base64,${btoa(binary)}`
}

test('contrato de uma versão futura deixa a pintura parada, sem adivinhação', async () => {
  const win = window as unknown as Record<string, unknown>
  const previous = win.__SZGAME_ASSETS_3D
  win.__SZGAME_ASSETS_3D = {
    futuro: { kind: 'model3d', dataUrl: futureContractDataUrl(), fileName: 'futuro.glb' },
  }
  try {
    const kit = await loadStartedKit((api) => {
      api.defineMold('bicho', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'modelo', model: 'futuro', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
      })
    })
    kit.api.setState('jogando')
    kit.api.spawn('bicho', 0, 0, 0)
    kit.step(1)
    const material = paintedMaterial(kit)
    expect(material.userData.molda?.flipbook?.contract).toBe(2)
    material.map = new Texture()
    const start = placed(material)
    kit.step(FRAMES_PER_STEP * 4)
    // Nem a folha foi recortada nem a sequência andou: a pintura fica como está.
    expect(placed(material)).toEqual(start)
    expect(start).toEqual([0, 0, 1, 1])
    material.map?.dispose()
  } finally {
    window.dispatchEvent(new Event('pagehide'))
    if (previous === undefined) delete win.__SZGAME_ASSETS_3D
    else win.__SZGAME_ASSETS_3D = previous
  }
})
