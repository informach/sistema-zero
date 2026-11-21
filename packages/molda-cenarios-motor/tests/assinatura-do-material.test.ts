import { expect, test } from 'bun:test'
import { DataTexture, MeshStandardMaterial, RGBAFormat, SRGBColorSpace } from 'three'
import { assinaturaDoMaterial } from '../src/compilar/assinatura-do-material'

const atlas = () => {
  const t = new DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1, RGBAFormat)
  t.colorSpace = SRGBColorSpace
  return t
}

test('materiais iguais com cópias da mesma imagem têm a mesma assinatura', () => {
  const imagem = atlas()
  const a = new MeshStandardMaterial({ map: imagem.clone(), roughness: 0.6, name: 'cor_2' })
  const b = new MeshStandardMaterial({ map: imagem.clone(), roughness: 0.6, name: 'cor_2' })
  b.needsUpdate = true // a versão muda sem mudar o desenho
  b.userData = { ...a.userData }
  expect(a.uuid).not.toBe(b.uuid)
  expect(assinaturaDoMaterial(a)).not.toBeNull()
  expect(assinaturaDoMaterial(a)).toBe(assinaturaDoMaterial(b))
})

test('número, imagem, extras ou ajuste da textura diferentes separam os materiais', () => {
  const imagem = atlas()
  const base = () => new MeshStandardMaterial({ map: imagem.clone(), roughness: 0.6 })
  const ref = assinaturaDoMaterial(base())
  const aspera = base()
  aspera.roughness = 0.7
  const outraImagem = base()
  outraImagem.map = atlas()
  const comExtras = base()
  comExtras.userData = { reino: 1 }
  const repetida = base()
  repetida.map!.repeat.set(2, 2)
  const recortada = base()
  recortada.alphaTest = 0.5
  for (const m of [aspera, outraImagem, comExtras, repetida, recortada])
    expect(assinaturaDoMaterial(m)).not.toBe(ref)
})

test('gancho de shader ou valor que não dá para comparar deixa o material sozinho', () => {
  const comGancho = new MeshStandardMaterial()
  comGancho.onBeforeCompile = () => {}
  expect(assinaturaDoMaterial(comGancho)).toBeNull()
  const comClasse = new MeshStandardMaterial()
  comClasse.userData = { quando: new Date(0) }
  expect(assinaturaDoMaterial(comClasse)).toBeNull()
})
