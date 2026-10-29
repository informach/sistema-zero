import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'

test('primeiro aprovado entrega fliperama uma vez, sem depender da aparência', () => {
  const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
  expect(ganharProjetos(s, new Date(), false).ganhos).not.toContain('fliperama')
  const r = ganharProjetos(s, new Date(), true)
  expect(r.ganhos).toContain('fliperama')
  expect(r.salvamento.projetos.fliperama?.aparencia).toBeNull()
  expect(ganharProjetos(r.salvamento, new Date(), true).ganhos).not.toContain('fliperama')
  expect(s.projetos.fliperama).toBeUndefined()
})
test('fliperama pronto tem a tela separada e UV para receber a capa', async () => {
  const b = readFileSync(`${import.meta.dir}/../src/assets/objetos/fliperama.glb`)
  const glb = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    '',
  )
  const tela = glb.scene.getObjectByName('tela')
  expect(tela).toBeDefined()
  let faces = 0
  tela?.traverse((o) => {
    if (o instanceof Mesh) {
      expect(o.geometry.attributes.uv).toBeDefined()
      faces++
    }
  })
  expect(faces).toBeGreaterThan(0)
})
