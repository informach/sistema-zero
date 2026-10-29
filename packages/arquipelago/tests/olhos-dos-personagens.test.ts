import { expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { malhasDosOlhos } from '../src/mundo/animado'

/**
 * O olho do Blender tem dois materiais, e o three divide a malha em `-olhos_1` e `-olhos_2`. Até
 * 29/10/2026 o jogo procurava só `-olhos` e nenhum personagem piscava; aqui cada personagem e bicho
 * com olhos de morfo precisa ter todas as partes achadas, com `piscar` e `feliz`.
 */
for (const pasta of ['personagens', 'bichos']) {
  const dir = join(import.meta.dir, '..', 'src', 'assets', pasta)
  for (const arquivo of readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
    test(`${pasta}/${arquivo}: os olhos piscam`, async () => {
      const buf = readFileSync(join(dir, arquivo))
      const gltf = await new GLTFLoader().parseAsync(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        '',
      )
      const olhos = malhasDosOlhos(gltf.scene)
      expect(olhos.length).toBeGreaterThanOrEqual(2)
      for (const o of olhos) {
        expect(o.morphTargetDictionary?.piscar).toBeDefined()
        expect(o.morphTargetDictionary?.feliz).toBeDefined()
      }
    })
  }
}
