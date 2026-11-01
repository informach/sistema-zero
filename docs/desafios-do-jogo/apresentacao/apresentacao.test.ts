import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { Glob } from 'bun'
import {
  LIMITES_DO_DESAFIO,
  linguagemDoProjeto,
  ManifestoDeDesafiosSchema,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { slugBase } from './index'
import { RESUMOS_DOS_QUADROS } from './resumos'

const raiz = fileURLToPath(new URL('../', import.meta.url))
const quadros = []
for await (const arquivo of new Glob('*/*.manifesto.json').scan(raiz)) {
  const m = ManifestoDeDesafiosSchema.parse(await Bun.file(`${raiz}${arquivo}`).json())
  quadros.push(...m.desafios.filter((d) => d.tipo === 'quadro-das-cores'))
}

test('todo quadro do Quadro das Cores tem a linha "o que se faz", curta e sem ponto de exclamação', () => {
  expect(quadros.length).toBeGreaterThan(80)
  for (const d of quadros) {
    expect(d.conteudo.resumo, d.slug).toBe(RESUMOS_DOS_QUADROS[slugBase(d.slug)])
    expect(d.conteudo.resumo?.length ?? 0, d.slug).toBeLessThanOrEqual(LIMITES_DO_DESAFIO.resumo)
    expect(d.conteudo.resumo, d.slug).not.toMatch(/[!—]/)
  }
})

test('os quadros em blocos e na Ponte têm o print "Como fica"; Python e Pro ficam sem', () => {
  for (const d of quadros) {
    const lingua = linguagemDoProjeto(d.conteudo.gabarito)
    if (lingua === 'python' || lingua === 'pro') expect(d.conteudo.imagem, d.slug).toBeUndefined()
    else expect(d.conteudo.imagem, d.slug).toStartWith('data:image/webp;base64,')
  }
})

test('nenhuma linha sobra sem quadro', () => {
  const usados = new Set(quadros.map((d) => slugBase(d.slug)))
  expect(Object.keys(RESUMOS_DOS_QUADROS).filter((s) => !usados.has(s))).toEqual([])
})
