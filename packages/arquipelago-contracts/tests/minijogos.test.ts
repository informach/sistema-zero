import { expect, test } from 'bun:test'
import { LIMITES_DO_DESAFIO } from '../src/desafios'
import { capaDoMinijogo, ProjetoDoMinijogoSchema } from '../src/minijogos'

test('capa vem da imagem escolhida no projeto, sem URL externa ou SVG', () => {
  const p = {
    coverAssetName: 'capa',
    assets: [{ name: 'capa', kind: 'image', dataUrl: 'data:image/png;base64,YQ==' }],
  }
  expect(capaDoMinijogo(p)).toBe(p.assets[0]!.dataUrl)
  p.assets[0]!.dataUrl = 'https://fora/segredo.png'
  expect(capaDoMinijogo(p)).toBeNull()
  p.assets[0]!.dataUrl = 'data:image/svg+xml;base64,YQ=='
  expect(capaDoMinijogo(p)).toBeNull()
  expect(capaDoMinijogo({})).toBeNull()
})
test('teto conta a serialização JSON e recusa valor sem cópia', () => {
  expect(ProjetoDoMinijogoSchema.safeParse(undefined).success).toBe(false)
  expect(
    ProjetoDoMinijogoSchema.safeParse({ texto: 'a'.repeat(LIMITES_DO_DESAFIO.projetoCaracteres) })
      .success,
  ).toBe(false)
  expect(ProjetoDoMinijogoSchema.safeParse({ files: {} }).success).toBe(true)
})
