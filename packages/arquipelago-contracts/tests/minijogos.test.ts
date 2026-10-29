import { expect, test } from 'bun:test'
import { LIMITES_DO_DESAFIO } from '../src/desafios'
import {
  CAPA_DO_MINIJOGO_CARACTERES,
  capaDoMinijogo,
  capaQueCabe,
  MinijogoSchema,
  ProjetoDoMinijogoSchema,
} from '../src/minijogos'

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
test('capa grande demais fica de fora da lista, sem estragar o minijogo', () => {
  const grande = `data:image/png;base64,${'A'.repeat(CAPA_DO_MINIJOGO_CARACTERES)}`
  const p = { coverAssetName: 'capa', assets: [{ name: 'capa', kind: 'image', dataUrl: grande }] }
  expect(capaDoMinijogo(p)).toBeNull()
  expect(capaQueCabe(grande)).toBeNull()
  expect(capaQueCabe('data:image/png;base64,YQ==')).toBe('data:image/png;base64,YQ==')
  expect(capaQueCabe(null)).toBeNull()
  const item = {
    desafioId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    titulo: 'Corrida',
    aprovadoEm: '2026-10-29T12:00:00.000Z',
    atualizadoEm: '2026-10-29T12:00:00.000Z',
  }
  expect(MinijogoSchema.safeParse({ ...item, capa: grande }).success).toBe(false)
  expect(MinijogoSchema.safeParse({ ...item, capa: null }).success).toBe(true)
})
test('teto conta a serialização JSON e recusa valor sem cópia', () => {
  expect(ProjetoDoMinijogoSchema.safeParse(undefined).success).toBe(false)
  expect(
    ProjetoDoMinijogoSchema.safeParse({ texto: 'a'.repeat(LIMITES_DO_DESAFIO.projetoCaracteres) })
      .success,
  ).toBe(false)
  expect(ProjetoDoMinijogoSchema.safeParse({ files: {} }).success).toBe(true)
})
